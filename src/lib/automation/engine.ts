import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/engine";
import { createPublicationsFromDraft } from "@/lib/publishing/publisher";
import { getShabbatTimes, getNextHoliday } from "./hebcal";
import { addDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { Tables, Enums } from "@/types/database.types";

type Automation = Tables<"Automation">;
type AutomationTrigger = Enums<"AutomationTrigger">;

interface AutomationAction {
  type: string;
  contentType?: string;
  channels?: string[];
  requiresValidation?: boolean;
  daysOffset?: number;
}

type AutomationWithCommunity = Automation & {
  community: {
    id: string;
    name: string;
    city: string | null;
    timezone: string;
    tone: string;
    hashtags: string[] | null;
  };
};

export async function runAutomationEngine(): Promise<void> {
  console.log("[Automation] Démarrage du moteur…");

  const supabase = createAdminClient();
  const now = new Date();

  const { data: automations } = await supabase
    .from("Automation")
    .select("*, community:Community(id,name,city,timezone,tone,hashtags)")
    .eq("isActive", true)
    .eq("status", "ACTIVE");

  if (!automations) return;
  console.log(`[Automation] ${automations.length} automatisations actives`);

  for (const automation of automations as AutomationWithCommunity[]) {
    try {
      await processAutomation(automation, now);
    } catch (error) {
      console.error(`[Automation] Erreur pour ${automation.id}:`, error);
      await supabase
        .from("Automation")
        .update({ status: "FAILED", updatedAt: new Date().toISOString() })
        .eq("id", automation.id);
    }
  }
}

async function processAutomation(
  automation: AutomationWithCommunity,
  now: Date
): Promise<void> {
  const supabase = createAdminClient();
  const shouldRun = await shouldTrigger(automation, now);
  if (!shouldRun) return;

  console.log(`[Automation] Déclenchement: ${automation.name} (${automation.trigger})`);

  const { data: run } = await supabase
    .from("AutomationRun")
    .insert({ id: crypto.randomUUID(), automationId: automation.id, status: "RUNNING" })
    .select()
    .single();

  if (!run) return;

  try {
    await executeAutomationActions(automation, run.id);

    await supabase
      .from("AutomationRun")
      .update({ status: "SUCCESS", completedAt: new Date().toISOString() })
      .eq("id", run.id);

    await supabase
      .from("Automation")
      .update({
        lastRunAt: now.toISOString(),
        nextRunAt: computeNextRunAt(automation, now)?.toISOString() ?? null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", automation.id);
  } catch (error) {
    await supabase
      .from("AutomationRun")
      .update({
        status: "FAILED",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Erreur inconnue",
      })
      .eq("id", run.id);
    throw error;
  }
}

async function shouldTrigger(automation: Automation, now: Date): Promise<boolean> {
  const supabase = createAdminClient();
  const config = automation.triggerConfig as Record<string, unknown>;

  if (automation.lastRunAt) {
    const lastRun = new Date(automation.lastRunAt);
    if (lastRun >= startOfDay(now)) return false;
  }

  switch (automation.trigger as AutomationTrigger) {
    case "WEEKLY_SHABBAT": {
      const triggerDay = (config.dayOfWeek as number) ?? 4;
      return now.getDay() === triggerDay;
    }

    case "BEFORE_EVENT": {
      const daysBefore = (config.daysBefore as number) ?? 3;
      if (!automation.eventId) return false;
      const { data: event } = await supabase.from("Event").select("startDate").eq("id", automation.eventId).single();
      if (!event) return false;
      const triggerDate = addDays(new Date(event.startDate), -daysBefore);
      return isWithinInterval(now, { start: startOfDay(triggerDate), end: endOfDay(triggerDate) });
    }

    case "EVENT_DAY": {
      if (!automation.eventId) return false;
      const { data: event } = await supabase.from("Event").select("startDate").eq("id", automation.eventId).single();
      if (!event) return false;
      return isWithinInterval(now, { start: startOfDay(new Date(event.startDate)), end: endOfDay(new Date(event.startDate)) });
    }

    case "AFTER_EVENT": {
      if (!automation.eventId) return false;
      const { data: event } = await supabase.from("Event").select("endDate").eq("id", automation.eventId).single();
      if (!event?.endDate) return false;
      const triggerDate = addDays(new Date(event.endDate), 1);
      return isWithinInterval(now, { start: startOfDay(triggerDate), end: endOfDay(triggerDate) });
    }

    case "DAILY": {
      const time = (config.time as string) ?? "09:00";
      const [hours, minutes] = time.split(":").map(Number);
      return now.getHours() === hours && now.getMinutes() < minutes + 30;
    }

    case "JEWISH_HOLIDAY": {
      const holiday = await getNextHoliday();
      if (!holiday) return false;
      const daysBeforeHoliday = (config.daysBefore as number) ?? 1;
      const triggerDate = addDays(new Date(holiday.date), -daysBeforeHoliday);
      return isWithinInterval(now, { start: startOfDay(triggerDate), end: endOfDay(triggerDate) });
    }

    case "MANUAL":
      return false;

    default:
      return false;
  }
}

export async function executeAutomationActions(
  automation: AutomationWithCommunity,
  runId: string
): Promise<void> {
  const supabase = createAdminClient();
  const actions = automation.actions as AutomationAction[];

  for (const action of actions) {
    switch (action.type) {
      case "GENERATE_CONTENT": {
        let shabbatTimes = null;
        let hebrewDate: string | undefined;

        if (automation.trigger === "WEEKLY_SHABBAT") {
          shabbatTimes = await getShabbatTimes({
            city: automation.community.city ?? undefined,
            timezone: automation.community.timezone,
          });
          hebrewDate = shabbatTimes?.hebrewDate;
        }

        const generated = await generateContent({
          communityId: automation.community.id,
          contentType: (action.contentType ?? "GENERAL") as never,
          eventId: automation.eventId ?? undefined,
          shabbatTimes,
          hebrewDate,
        });

        const { data: draft } = await supabase
          .from("ContentDraft")
          .insert({
            id: crypto.randomUUID(),
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
            updatedAt: new Date().toISOString(),
          })
          .select()
          .single();

        if (!draft) break;

        if (!action.requiresValidation && action.channels && action.channels.length > 0) {
          const { data: channels } = await supabase
            .from("Channel")
            .select("id")
            .eq("communityId", automation.community.id)
            .in("type", action.channels as never[])
            .eq("isActive", true);

          if (channels && channels.length > 0) {
            await createPublicationsFromDraft({
              draftId: draft.id,
              communityId: automation.community.id,
              channelIds: channels.map((c) => c.id),
            });
          }
        }

        const { data: adminUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("communityId", automation.community.id)
          .limit(1)
          .maybeSingle();

        if (adminUser) {
          await supabase.from("Notification").insert({
            id: crypto.randomUUID(),
            userId: adminUser.id,
            communityId: automation.community.id,
            type: "AI_CONTENT_READY",
            title: "Contenu généré automatiquement",
            body: `L'automatisation "${automation.name}" a généré un nouveau contenu.`,
            link: `/dashboard/content/${draft.id}`,
          });
        }
        break;
      }
    }
  }
}

function computeNextRunAt(automation: Automation, now: Date): Date | null {
  switch (automation.trigger as AutomationTrigger) {
    case "WEEKLY_SHABBAT": return addDays(now, 7);
    case "DAILY": return addDays(now, 1);
    default: return null;
  }
}
