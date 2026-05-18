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

const DAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

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
    await executeAutomationActions(automation);

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

    case "CUSTOM_SCHEDULE": {
      const time = (config.time as string) ?? "09:00";
      const [hours, minutes] = time.split(":").map(Number);
      const inTimeWindow = now.getHours() === hours && now.getMinutes() < minutes + 30;
      if (!inTimeWindow) return false;

      const repeat = String(config.repeat ?? "none");
      const date = typeof config.date === "string" ? config.date : null;

      if (repeat === "none") {
        if (!date) return false;
        const targetDate = new Date(date);
        return isWithinInterval(now, { start: startOfDay(targetDate), end: endOfDay(targetDate) });
      }

      if (repeat === "weekly") {
        const days = Array.isArray(config.days) && config.days.length > 0
          ? config.days.map((value) => DAY_TO_INDEX[String(value)]).filter((value) => value !== undefined)
          : [DAY_TO_INDEX[String(config.day ?? "friday")]];
        return days.includes(now.getDay());
      }

      if (repeat === "custom") {
        const days = Array.isArray(config.days)
          ? config.days.map((value) => DAY_TO_INDEX[String(value)]).filter((value) => value !== undefined)
          : [];
        return days.includes(now.getDay());
      }

      if (repeat === "monthly") {
        const dayOfMonth = Number(config.dayOfMonth ?? (date ? new Date(date).getDate() : now.getDate()));
        return now.getDate() === dayOfMonth;
      }

      return false;
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
  automation: AutomationWithCommunity
): Promise<void> {
  const supabase = createAdminClient();
  const actions = automation.actions as unknown as AutomationAction[];
  const triggerConfig = (automation.triggerConfig ?? {}) as Record<string, unknown>;
  const configuredChannels = actions
    .flatMap((action) => action.channels ?? [])
    .filter((value, index, array) => array.indexOf(value) === index);
  const eventName = String(triggerConfig.eventTitle ?? automation.name ?? "cet evenement");
  const channelsText = configuredChannels.length > 0 ? configuredChannels.join(", ") : "vos plateformes";
  const configuredMessage = typeof triggerConfig.message === "string" ? triggerConfig.message.trim() : "";

  const { data: notifyUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("communityId", automation.community.id)
    .in("role", ["SUPER_ADMIN", "ADMIN"]);

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

        const generated = configuredMessage
          ? { body: configuredMessage, bodyHebrew: null, hashtags: [], cta: null }
          : await generateContent({
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

        if (notifyUsers && notifyUsers.length > 0) {
          await supabase.from("Notification").insert(
            notifyUsers.map((user) => ({
              id: crypto.randomUUID(),
              userId: user.id,
              communityId: automation.community.id,
              type: "AI_CONTENT_READY" as const,
              title: "Message pret a envoyer",
              body: `Il est temps d'envoyer votre message sur ${channelsText} pour ${eventName}.`,
              link: `/dashboard/content/${draft.id}`,
            }))
          );
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
