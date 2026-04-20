import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
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

    // Générer un slug unique
    const baseSlug = slugify(data.communityName);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.community.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Transaction : créer communauté + canaux + automatisations par défaut
    const community = await prisma.$transaction(async (tx: typeof prisma) => {
      // 1. Créer la communauté
      const community = await tx.community.create({
        data: {
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
        },
      });

      // 2. Lier l'utilisateur à la communauté
      await tx.user.update({
        where: { id: userId },
        data: { communityId: community.id },
      });

      // 3. Créer les canaux sélectionnés
      if (data.channels && data.channels.length > 0) {
        await tx.channel.createMany({
          data: data.channels.map((ch: { type: string; name: string; handle: string }) => ({
            communityId: community.id,
            type: ch.type as never,
            name: ch.name,
            handle: ch.handle || null,
            isConnected: false,
            isActive: true,
          })),
          skipDuplicates: true,
        });
      }

      // 4. Créer les automatisations Chabbat par défaut
      await tx.automation.create({
        data: {
          communityId: community.id,
          name: "Horaires de Chabbat — hebdomadaire",
          description: "Génère et publie automatiquement les horaires du Chabbat chaque semaine",
          trigger: "WEEKLY_SHABBAT",
          triggerConfig: {
            daysBefore: 1,
            time: "10:00",
          },
          actions: [
            {
              type: "GENERATE_CONTENT",
              contentType: "SHABBAT_TIMES",
              channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
            },
            {
              type: "CREATE_PUBLICATION",
              requiresValidation: true,
            },
          ],
          isActive: true,
          status: "ACTIVE",
        },
      });

      // 5. Créer les événements récurrents
      if (data.recurringEvents && data.recurringEvents.length > 0) {
        for (const event of data.recurringEvents) {
          await tx.event.create({
            data: {
              communityId: community.id,
              title: event.title,
              category: event.category as never,
              startDate: new Date(), // Placeholder — sera mis à jour par le moteur d'automatisation
              isRecurring: true,
              recurrenceRule: event.dayOfWeek !== undefined
                ? { freq: "WEEKLY", byday: ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][event.dayOfWeek] }
                : { freq: "WEEKLY" },
              status: "SCHEDULED",
            },
          });
        }
      }

      // 6. Initialiser la mémoire IA de base
      await tx.aIMemory.createMany({
        data: [
          {
            communityId: community.id,
            type: "EDITORIAL_PREFERENCE",
            key: "tone",
            value: { tone: data.tone, language: data.language },
          },
          {
            communityId: community.id,
            type: "VOCABULARY",
            key: "hashtags",
            value: { hashtags: data.hashtags || [] },
          },
        ],
      });

      // 7. Log audit
      await tx.auditLog.create({
        data: {
          userId,
          communityId: community.id,
          action: "community.created",
          resource: "Community",
          resourceId: community.id,
          newData: { name: community.name, slug: community.slug },
        },
      });

      return community;
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
