import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

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

    // Générer un slug unique
    const baseSlug = slugify(data.communityName);
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const { data: existing } = await admin.from("Community").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${counter++}`;
    }

    // 1. Créer la communauté
    const { data: community, error: communityError } = await admin
      .from("Community")
      .insert({
        id: crypto.randomUUID(),
        name: data.communityName,
        slug,
        city: data.city || null,
        country: data.country || "France",
        timezone: data.timezone || "Europe/Paris",
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        communityType: data.communityType || "SYNAGOGUE",
        religiousStream: data.religiousStream || null,
        tone: data.tone || "MODERN",
        language: data.language || "fr",
        signature: data.signature || null,
        hashtags: data.hashtags || [],
        editorialRules: data.editorialRules || null,
        onboardingDone: true,
        onboardingStep: 4,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (communityError || !community) {
      console.error("[Onboarding] Erreur création communauté:", communityError);
      return NextResponse.json({ error: "Erreur lors de la création de la communauté" }, { status: 500 });
    }

    // 2. Lier l'utilisateur à la communauté
    await admin
      .from("profiles")
      .update({ communityId: community.id, updatedAt: new Date().toISOString() })
      .eq("id", userId);

    // 3. Créer les canaux sélectionnés
    if (data.channels && data.channels.length > 0) {
      await admin.from("Channel").insert(
        data.channels.map((ch: { type: string; name: string; handle: string }) => ({
          id: crypto.randomUUID(),
          communityId: community.id,
          type: ch.type,
          name: ch.name,
          handle: ch.handle || null,
          isConnected: false,
          isActive: true,
          updatedAt: new Date().toISOString(),
        }))
      );
    }

    // 4. Créer l'automatisation Chabbat par défaut
    await admin.from("Automation").insert({
      id: crypto.randomUUID(),
      communityId: community.id,
      name: "Horaires de Chabbat — hebdomadaire",
      description: "Génère et publie automatiquement les horaires du Chabbat chaque semaine",
      trigger: "WEEKLY_SHABBAT",
      triggerConfig: { daysBefore: 1, time: "10:00" },
      actions: [
        { type: "GENERATE_CONTENT", contentType: "SHABBAT_TIMES", channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"] },
        { type: "CREATE_PUBLICATION", requiresValidation: true },
      ],
      isActive: true,
      status: "ACTIVE",
      updatedAt: new Date().toISOString(),
    });

    // 5. Créer les événements récurrents
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
            : { freq: "WEEKLY" },
          status: "SCHEDULED",
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 6. Initialiser la mémoire IA
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
    ]);

    // 7. Log audit
    await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId,
      communityId: community.id,
      action: "community.created",
      resource: "Community",
      resourceId: community.id,
      newData: { name: community.name, slug: community.slug },
    });

    return NextResponse.json({ success: true, communityId: community.id });
  } catch (error) {
    console.error("[Onboarding] Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la communauté" },
      { status: 500 }
    );
  }
}
