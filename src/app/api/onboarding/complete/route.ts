import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyUnique, defaultCommunityType } from "@/lib/onboarding/community-draft";
import {
  GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS,
  isDefaultAutomationPublicationId,
} from "@/lib/automation/suggested-publications";
import { getCommunityProfileDisplayLabel } from "@/lib/community/profile-labels";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, data } = body;

    if (userId !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const admin = createAdminClient();
    const communityType = defaultCommunityType();
    const automationValidationMode = data.automationValidationMode === "automatic" ? "automatic" : "manual";
    const automationNotificationLeadHours =
      typeof data.automationNotificationLeadHours === "number" && Number.isFinite(data.automationNotificationLeadHours)
        ? Math.max(0.25, data.automationNotificationLeadHours)
        : 2;

    const vocabulary = {
      aiNotificationLeadHours: automationNotificationLeadHours,
      automationValidationMode,
      manualValidationBeforeSend: automationValidationMode === "manual",
      communityProfileType: communityType,
      communityProfileLabel: getCommunityProfileDisplayLabel(communityType),
    };

    const sharedFields = {
      name: data.communityName,
      description: data.description || null,
      city: data.city || null,
      country: data.country || "France",
      timezone: data.timezone || "Europe/Paris",
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      address: data.address || null,
      logoUrl: data.logoUrl || null,
      tone: data.tone || "MODERN",
      language: data.language || "fr",
      signature: data.signature || null,
      hashtags: data.hashtags || [],
      editorialRules: data.editorialRules || null,
      vocabulary,
      onboardingDone: true,
      onboardingStep: 3,
      updatedAt: new Date().toISOString(),
    };

    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", userId)
      .single();

    let community: { id: string; name: string; slug: string; communityType: string } | null = null;

    if (profile?.communityId) {
      // Le brouillon a été créé à la fin de l'étape Identité (/api/onboarding/draft) : on le finalise.
      const { data: existing } = await admin
        .from("Community")
        .select("id, onboardingDone")
        .eq("id", profile.communityId)
        .single();

      if (existing?.onboardingDone) {
        return NextResponse.json({ error: "Onboarding déjà finalisé" }, { status: 409 });
      }

      const { data: updated, error: updateError } = await admin
        .from("Community")
        .update(sharedFields)
        .eq("id", profile.communityId)
        .select("id, name, slug, communityType")
        .single();

      if (updateError || !updated) {
        console.error("[Onboarding] Erreur finalisation communauté:", updateError);
        return NextResponse.json({ error: "Erreur lors de la finalisation de la communauté" }, { status: 500 });
      }
      community = updated;
    } else {
      // Filet de sécurité : pas de brouillon (ex. ancien flux), on crée directement.
      const slug = await slugifyUnique(admin, data.communityName);
      const { data: created, error: communityError } = await admin
        .from("Community")
        .insert({
          id: crypto.randomUUID(),
          slug,
          communityType,
          ...sharedFields,
        })
        .select("id, name, slug, communityType")
        .single();

      if (communityError || !created) {
        console.error("[Onboarding] Erreur création communauté:", communityError);
        return NextResponse.json({ error: "Erreur lors de la création de la communauté" }, { status: 500 });
      }
      community = created;

      const { error: profileUpdateError } = await admin
        .from("profiles")
        .update({ communityId: community.id, updatedAt: new Date().toISOString() })
        .eq("id", userId);

      if (profileUpdateError) {
        console.error("[Onboarding] Erreur mise à jour communityId:", profileUpdateError);
        await admin.from("Community").delete().eq("id", community.id);
        return NextResponse.json({ error: "Impossible de lier le profil à la communauté" }, { status: 500 });
      }
    }

    // Canaux : ne pas toucher aux canaux déjà connectés via OAuth pendant l'onboarding
    // (leurs tokens réels seraient écrasés par la version vide envoyée par le client).
    if (Array.isArray(data.channels) && data.channels.length > 0) {
      const { data: existingChannels } = await admin
        .from("Channel")
        .select("type")
        .eq("communityId", community.id);
      const existingTypes = new Set((existingChannels ?? []).map((c) => c.type));
      const newChannels = data.channels.filter(
        (ch: { type: string }) => !existingTypes.has(ch.type)
      );

      if (newChannels.length > 0) {
        await admin.from("Channel").insert(
          newChannels.map((ch: { type: string; name: string; handle: string }) => ({
            id: crypto.randomUUID(),
            communityId: community!.id,
            type: ch.type,
            name: ch.name,
            handle: ch.handle || null,
            isConnected: false,
            isActive: true,
            updatedAt: new Date().toISOString(),
          }))
        );
      }
    }

    // Événements récurrents
    if (data.recurringEvents && data.recurringEvents.length > 0) {
      for (const event of data.recurringEvents) {
        await admin.from("Event").insert({
          id: crypto.randomUUID(),
          communityId: community.id,
          title: event.title,
          category: event.category,
          startDate: new Date().toISOString(),
          isRecurring: true,
          recurrenceRule: event.dayOfWeek !== undefined
            ? { freq: "WEEKLY", byday: ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][event.dayOfWeek] }
            : { freq: "MONTHLY" },
          status: "SCHEDULED",
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Automatisations sélectionnées
    if (Array.isArray(data.selectedAutomationScenarioIds) && data.selectedAutomationScenarioIds.length > 0) {
      const selectedIds = data.selectedAutomationScenarioIds.map(String).filter(Boolean).slice(0, 1);
      const dbSelectedIds = selectedIds.filter((id: string) => !isDefaultAutomationPublicationId(id));
      const defaultSelectedPublications = GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS.filter((publication) =>
        selectedIds.includes(publication.id)
      );
      const { data: presets } = dbSelectedIds.length
        ? await admin
            .from("AutomationPreset")
            .select("id, title, description, trigger, actions, clientTypes")
            .in("id", dbSelectedIds)
            .eq("isActive", true)
        : { data: [] };

      const applicablePresets = (presets ?? []).filter((preset) =>
        Array.isArray(preset.clientTypes) && preset.clientTypes.includes(communityType as never)
      );
      const selectedPublications = [...applicablePresets, ...defaultSelectedPublications];

      if (selectedPublications.length > 0) {
        await admin.from("Automation").insert(
          selectedPublications.map((preset) => ({
            id: crypto.randomUUID(),
            communityId: community!.id,
            presetId: isDefaultAutomationPublicationId(preset.id) ? null : preset.id,
            name: preset.title,
            description: preset.description ?? null,
            trigger: preset.trigger,
            triggerConfig: "triggerConfig" in preset ? preset.triggerConfig : {},
            actions: preset.actions ?? [],
            isActive: false,
            status: "DRAFT",
            nextRunAt: null,
            updatedAt: new Date().toISOString(),
          }))
        );
      }
    }

    await admin.from("AIMemory").insert([
      {
        id: crypto.randomUUID(),
        communityId: community.id,
        type: "EDITORIAL_PREFERENCE",
        key: "tone",
        value: { tone: data.tone, language: data.language },
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        communityId: community.id,
        type: "VOCABULARY",
        key: "hashtags",
        value: { hashtags: data.hashtags || [] },
        updatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        communityId: community.id,
        type: "COMMUNITY_PROFILE",
        key: "identity",
        value: {
          communityType,
          description: data.description || null,
          city: data.city || null,
          country: data.country || "France",
        },
        updatedAt: new Date().toISOString(),
      },
    ]);

    await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId,
      communityId: community.id,
      action: "community.onboarding_completed",
      resource: "Community",
      resourceId: community.id,
      newData: { name: community.name, slug: community.slug, communityType: community.communityType },
    });

    return NextResponse.json({ success: true, communityId: community.id });
  } catch (error) {
    console.error("[Onboarding] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la finalisation de la communauté" },
      { status: 500 }
    );
  }
}
