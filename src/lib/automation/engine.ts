// ============================================================
// Yad.ia — Moteur d'automatisation
// Logique de déclenchement + génération + création publications
// ============================================================

import { prisma } from "@/lib/prisma";
import { generateContent } from "@/lib/ai/engine";
import { createPublicationsFromDraft } from "@/lib/publishing/publisher";
import { getShabbatTimes, getNextHoliday } from "./hebcal";
import { addDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { Automation, AutomationTrigger } from "@prisma/client";

// ============================================================
// TYPES
// ============================================================

interface AutomationAction {
  type: string;
  contentType?: string;
  channels?: string[];
  requiresValidation?: boolean;
  daysOffset?: number;
}

// ============================================================
// MOTEUR PRINCIPAL — appelé par le cron job
// ============================================================

export async function runAutomationEngine(): Promise<void> {
  console.log("[Automation] Démarrage du moteur…");

  const now = new Date();

  // Récupérer toutes les automatisations actives
  const automations = await prisma.automation.findMany({
    where: { isActive: true, status: "ACTIVE" },
    include: {
      community: {
        select: {
          id: true, name: true, city: true, timezone: true,
          tone: true, hashtags: true, channels: true,
        },
      },
    },
  });

  console.log(`[Automation] ${automations.length} automatisations actives`);

  for (const automation of automations) {
    try {
      await processAutomation(automation, now);
    } catch (error) {
      console.error(`[Automation] Erreur pour ${automation.id}:`, error);
      await prisma.automation.update({
        where: { id: automation.id },
        data: { status: "FAILED" },
      });
    }
  }
}

// ============================================================
// TRAITEMENT D'UNE AUTOMATISATION
// ============================================================

async function processAutomation(
  automation: Automation & { community: { id: string; name: string; city: string | null; timezone: string; tone: string; hashtags: string[] } },
  now: Date
): Promise<void> {
  const shouldRun = await shouldTrigger(automation, now);

  if (!shouldRun) return;

  console.log(`[Automation] Déclenchement: ${automation.name} (${automation.trigger})`);

  // Créer un run
  const run = await prisma.automationRun.create({
    data: { automationId: automation.id, status: "RUNNING" },
  });

  try {
    await executeAutomationActions(automation, run.id);

    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", completedAt: new Date() },
    });

    await prisma.automation.update({
      where: { id: automation.id },
      data: {
        lastRunAt: now,
        nextRunAt: computeNextRunAt(automation, now),
      },
    });
  } catch (error) {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
    });
    throw error;
  }
}

// ============================================================
// VÉRIFICATION DU DÉCLENCHEMENT
// ============================================================

async function shouldTrigger(automation: Automation, now: Date): Promise<boolean> {
  const config = automation.triggerConfig as Record<string, unknown>;

  // Éviter double-déclenchement (si déjà tourné aujourd'hui)
  if (automation.lastRunAt) {
    const lastRun = new Date(automation.lastRunAt);
    const dayStart = startOfDay(now);
    if (lastRun >= dayStart) return false;
  }

  switch (automation.trigger as AutomationTrigger) {
    case "WEEKLY_SHABBAT": {
      const dayOfWeek = now.getDay();
      const triggerDay = (config.dayOfWeek as number) ?? 4; // Jeudi par défaut
      return dayOfWeek === triggerDay;
    }

    case "BEFORE_EVENT": {
      const daysBefore = (config.daysBefore as number) ?? 3;
      if (!automation.eventId) return false;
      const event = await prisma.event.findUnique({ where: { id: automation.eventId } });
      if (!event) return false;
      const triggerDate = addDays(event.startDate, -daysBefore);
      return isWithinInterval(now, { start: startOfDay(triggerDate), end: endOfDay(triggerDate) });
    }

    case "EVENT_DAY": {
      if (!automation.eventId) return false;
      const event = await prisma.event.findUnique({ where: { id: automation.eventId } });
      if (!event) return false;
      return isWithinInterval(now, { start: startOfDay(event.startDate), end: endOfDay(event.startDate) });
    }

    case "AFTER_EVENT": {
      if (!automation.eventId) return false;
      const event = await prisma.event.findUnique({ where: { id: automation.eventId } });
      if (!event || !event.endDate) return false;
      const triggerDate = addDays(event.endDate, 1);
      return isWithinInterval(now, { start: startOfDay(triggerDate), end: endOfDay(triggerDate) });
    }

    case "DAILY": {
      const time = (config.time as string) ?? "09:00";
      const [hours, minutes] = time.split(":").map(Number);
      const nowHours = now.getHours();
      const nowMinutes = now.getMinutes();
      return nowHours === hours && nowMinutes < minutes + 30;
    }

    case "JEWISH_HOLIDAY": {
      const holiday = await getNextHoliday();
      if (!holiday) return false;
      const holidayDate = new Date(holiday.date);
      const daysBeforeHoliday = (config.daysBefore as number) ?? 1;
      const triggerDate = addDays(holidayDate, -daysBeforeHoliday);
      return isWithinInterval(now, { start: startOfDay(triggerDate), end: endOfDay(triggerDate) });
    }

    case "MANUAL":
      return false; // Déclenchement manuel uniquement

    default:
      return false;
  }
}

// ============================================================
// EXÉCUTION DES ACTIONS
// ============================================================

export async function executeAutomationActions(
  automation: Automation & { community: { id: string; name: string; city: string | null; timezone: string; tone: string; hashtags: string[] } },
  runId: string
): Promise<void> {
  const actions = automation.actions as AutomationAction[];

  for (const action of actions) {
    switch (action.type) {
      case "GENERATE_CONTENT": {
        // Récupérer les horaires Chabbat si pertinent
        let shabbatTimes = null;
        let hebrewDate: string | undefined;

        if (automation.trigger === "WEEKLY_SHABBAT") {
          shabbatTimes = await getShabbatTimes({
            city: automation.community.city ?? undefined,
            timezone: automation.community.timezone,
          });
          hebrewDate = shabbatTimes?.hebrewDate;
        }

        // Générer le contenu
        const generated = await generateContent({
          communityId: automation.community.id,
          contentType: (action.contentType ?? "GENERAL") as never,
          eventId: automation.eventId ?? undefined,
          shabbatTimes,
          hebrewDate,
        });

        // Créer le brouillon
        const draft = await prisma.contentDraft.create({
          data: {
            communityId: automation.community.id,
            eventId: automation.eventId ?? null,
            body: generated.body,
            bodyHebrew: generated.bodyHebrew ?? null,
            hashtags: generated.hashtags,
            cta: generated.cta ?? null,
            contentType: (action.contentType ?? "GENERAL") as never,
            status: action.requiresValidation ? "AI_PROPOSAL" : "READY_TO_PUBLISH",
            aiGenerated: true,
            aiModel: "gemini-2.5-flash",
          },
        });

        // Créer les publications si validation non requise
        if (!action.requiresValidation && action.channels && action.channels.length > 0) {
          const channels = await prisma.channel.findMany({
            where: {
              communityId: automation.community.id,
              type: { in: action.channels as never[] },
              isActive: true,
            },
          });

          if (channels.length > 0) {
            await createPublicationsFromDraft({
              draftId: draft.id,
              communityId: automation.community.id,
              channelIds: channels.map((c) => c.id),
            });
          }
        }

        // Notification à l'admin
        const adminUser = await prisma.user.findFirst({
          where: { communityId: automation.community.id },
        });

        if (adminUser) {
          await prisma.notification.create({
            data: {
              userId: adminUser.id,
              communityId: automation.community.id,
              type: "AI_CONTENT_READY",
              title: "Contenu généré automatiquement",
              body: `L'automatisation "${automation.name}" a généré un nouveau contenu.`,
              link: `/dashboard/content/${draft.id}`,
            },
          });
        }
        break;
      }

      case "CREATE_PUBLICATION": {
        // Action de création de publication sans génération IA
        break;
      }
    }
  }
}

// ============================================================
// CALCUL PROCHAIN DÉCLENCHEMENT
// ============================================================

function computeNextRunAt(automation: Automation, now: Date): Date | null {
  const config = automation.triggerConfig as Record<string, unknown>;

  switch (automation.trigger as AutomationTrigger) {
    case "WEEKLY_SHABBAT":
      return addDays(now, 7);
    case "DAILY":
      return addDays(now, 1);
    default:
      return null;
  }
}
