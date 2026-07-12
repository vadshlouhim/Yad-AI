import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Json } from "@/types/database.types";

async function getRequesterProfile(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("email, role").eq("id", userId).single();
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) return new Date();
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function updateAdminBillingVocabulary(
  current: unknown,
  startedAt: Date
): Json {
  const base = isRecord(current) ? current : {};
  const next = { ...base };

  // Les anciens accès « TEST » étaient stockés dans le vocabulaire. Un choix
  // d'offre depuis l'admin doit désormais toujours refléter l'un des trois
  // paliers produit réels.
  delete next.adminBillingMode;
  next.adminBillingSince = startedAt.toISOString();

  return next as Json;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;

  const supabase = await createClient();
  const {
    data: { user: requester },
  } = await supabase.auth.getUser();

  if (!requester) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const requesterProfile = await getRequesterProfile(requester.id);
  if (!canAccessAdmin(requesterProfile)) {
    return NextResponse.json({ error: "Accès réservé au Super Admin" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const planTier = body.planTier;
  if (planTier !== "FREE" && planTier !== "PRO" && planTier !== "BUSINESS") {
    return NextResponse.json({ error: "Offre demandée invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, communityId, email")
    .eq("id", targetUserId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (!targetProfile.communityId) {
    return NextResponse.json({ error: "Cet utilisateur n'a pas encore de communauté associée" }, { status: 400 });
  }

  const { data: community } = await admin
    .from("Community")
    .select("id, vocabulary")
    .eq("id", targetProfile.communityId)
    .single();

  if (!community) {
    return NextResponse.json({ error: "Communauté introuvable" }, { status: 404 });
  }

  const startedAt = parseDate(body.subscriptionStartedAt);
  const now = new Date();
  const nextVocabulary = updateAdminBillingVocabulary(community.vocabulary, startedAt);
  const nextPlan = planTier === "FREE" ? "FREE_TRIAL" : planTier === "PRO" ? "PROFESSIONAL" : "ENTERPRISE";

  const { error: communityError } = await admin
    .from("Community")
    .update({
      plan: nextPlan,
      planExpiresAt: null,
      vocabulary: nextVocabulary,
      updatedAt: now.toISOString(),
    })
    .eq("id", targetProfile.communityId);

  if (communityError) {
    return NextResponse.json({ error: communityError.message }, { status: 500 });
  }

  const manualSubscriptionId = `manual:${targetProfile.communityId}`;
  if (planTier === "FREE") {
    await admin
      .from("Subscription")
      .update({
        status: "CANCELED",
        canceledAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .eq("stripeSubscriptionId", manualSubscriptionId);
  } else {
    const { error: subscriptionError } = await admin.from("Subscription").upsert(
      {
        id: crypto.randomUUID(),
        communityId: targetProfile.communityId,
        stripeSubscriptionId: manualSubscriptionId,
        stripePriceId: planTier === "BUSINESS" ? "manual-business-access" : "manual-pro-access",
        plan: nextPlan,
        status: "ACTIVE",
        currentPeriodStart: startedAt.toISOString(),
        currentPeriodEnd: addYears(startedAt, 1).toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        updatedAt: now.toISOString(),
      },
      { onConflict: "stripeSubscriptionId" }
    );

    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    planTier,
    plan: nextPlan,
    subscriptionStartedAt: startedAt.toISOString(),
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params;

  const supabase = await createClient();
  const {
    data: { user: requester },
  } = await supabase.auth.getUser();

  if (!requester) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const requesterProfile = await getRequesterProfile(requester.id);
  if (!canAccessAdmin(requesterProfile)) {
    return NextResponse.json({ error: "Accès réservé au Super Admin" }, { status: 403 });
  }

  if (targetUserId === requester.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte depuis l'admin" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, communityId, email")
    .eq("id", targetUserId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const communityId = targetProfile.communityId;

  if (communityId) {
    // 1. AutomationRun (dépend de Automation)
    const { data: automationIds } = await admin
      .from("Automation")
      .select("id")
      .eq("communityId", communityId);
    if (automationIds && automationIds.length > 0) {
      await admin
        .from("AutomationRun")
        .delete()
        .in("automationId", automationIds.map((a) => a.id));
    }

    // 2. ChannelAdaptation (dépend de ContentDraft)
    const { data: draftIds } = await admin
      .from("ContentDraft")
      .select("id")
      .eq("communityId", communityId);
    if (draftIds && draftIds.length > 0) {
      await admin
        .from("ChannelAdaptation")
        .delete()
        .in("draftId", draftIds.map((d) => d.id));
    }

    // 3. ConversationMessage (dépend de Conversation)
    const { data: conversationIds } = await admin
      .from("Conversation")
      .select("id")
      .eq("communityId", communityId);
    if (conversationIds && conversationIds.length > 0) {
      await admin
        .from("ConversationMessage")
        .delete()
        .in("conversationId", conversationIds.map((c) => c.id));
    }

    // 4. AIMemory
    await admin.from("AIMemory").delete().eq("communityId", communityId);

    // 5. AuditLog
    await admin.from("AuditLog").delete().eq("communityId", communityId);

    // 6. Notification (par communityId ET userId)
    await admin.from("Notification").delete().eq("communityId", communityId);
    await admin.from("Notification").delete().eq("userId", targetUserId);

    // 7. MediaFile
    await admin.from("MediaFile").delete().eq("communityId", communityId);

    // 8. Publication
    await admin.from("Publication").delete().eq("communityId", communityId);

    // 9. ContentDraft
    await admin.from("ContentDraft").delete().eq("communityId", communityId);

    // 10. Channel
    await admin.from("Channel").delete().eq("communityId", communityId);

    // 11. Event
    await admin.from("Event").delete().eq("communityId", communityId);

    // 12. Conversation
    await admin.from("Conversation").delete().eq("communityId", communityId);

    // 13. Automation
    await admin.from("Automation").delete().eq("communityId", communityId);

    // 14. Subscription
    await admin.from("Subscription").delete().eq("communityId", communityId);

    // 15. Article (spécifiques à la communauté)
    await admin.from("Article").delete().eq("communityId", communityId);

    // 16. Template (spécifiques à la communauté)
    await admin.from("Template").delete().eq("communityId", communityId);

    // 17. Community
    await admin.from("Community").delete().eq("id", communityId);
  } else {
    // Même sans communauté, supprimer les notifications liées à l'utilisateur
    await admin.from("Notification").delete().eq("userId", targetUserId);
  }

  // 18. Profile
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", targetUserId);

  if (profileError) {
    return NextResponse.json({ error: `Erreur suppression profil : ${profileError.message}` }, { status: 500 });
  }

  // 19. Auth user (doit être en dernier)
  const { error: authError } = await admin.auth.admin.deleteUser(targetUserId);
  if (authError) {
    return NextResponse.json({ error: `Erreur suppression compte Auth : ${authError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
