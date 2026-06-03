import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/engine";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import { getShabbatTimes, getNextHoliday } from "./hebcal";
import { addDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { Tables, Enums } from "@/types/database.types";
import { Resend } from "resend";

type Automation = Tables<"Automation">;
type Publication = Tables<"Publication">;
type Channel = Tables<"Channel">;
type AutomationTrigger = Enums<"AutomationTrigger">;

interface AutomationAction {
  type: string;
  contentType?: string;
  channels?: string[];
  requiresValidation?: boolean;
  daysOffset?: number;
  emailSubject?: string;
  emailBody?: string;
  messageText?: string;
  notificationTitle?: string;
  notificationBody?: string;
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
    email: string | null;
    vocabulary: unknown;
  };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendAutomationEmail(params: {
  automation: AutomationWithCommunity;
  subject?: string;
  body?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { automation } = params;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquant: impossible d'envoyer l'email.");
  }

  let toEmails: string[] = [];
  const { data: members } = await supabase
    .from("CommunityMember")
    .select("email")
    .eq("communityId", automation.community.id)
    .eq("optInEmail", true)
    .not("email", "is", null);

  if (members && members.length > 0) {
    toEmails = members.map((member) => member.email).filter((email): email is string => Boolean(email));
  }
  if (automation.community.email) {
    toEmails.push(automation.community.email);
  }
  toEmails = Array.from(new Set(toEmails));

  if (toEmails.length === 0) {
    throw new Error("Aucun destinataire email trouve pour cette communaute.");
  }

  const resend = new Resend(apiKey);
  const safeBody = escapeHtml(params.body?.trim() || "Aucun contenu")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");
  const communityName = escapeHtml(automation.community.name);
  const formattedContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${communityName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">${communityName}</h1>
  </div>
  <div style="font-size: 15px; line-height: 1.7; color: #334155;"><p>${safeBody}</p></div>
  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
    Envoye via <strong>EasyCom AI</strong> - Communication communautaire assistee par IA
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? `${automation.community.name} <noreply@easycom-ai.com>`,
    to: toEmails,
    subject: params.subject || `Message de ${automation.community.name}`,
    html: formattedContent,
  });

  console.log(`[Automation] Email envoye avec succes via Resend a ${toEmails.length} destinataires.`);
}

export async function runAutomationEngine(): Promise<void> {
  console.log("[Automation] DÃ©marrage du moteurâ€¦");

  const supabase = createAdminClient();
  const now = new Date();

  const { data: automations } = await supabase
    .from("Automation")
    .select("*, community:Community(id,name,city,timezone,tone,hashtags,email,vocabulary)")
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
  await prepareAutomationNotification(automation, now);

  const shouldRun = await shouldTrigger(automation, now);
  if (!shouldRun) return;

  console.log(`[Automation] DÃ©clenchement: ${automation.name} (${automation.trigger})`);

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

    const nextRun = computeNextRunAt(automation, now);
    await supabase
      .from("Automation")
      .update({
        lastRunAt: now.toISOString(),
        nextRunAt: nextRun?.toISOString() ?? null,
        status: nextRun ? "ACTIVE" : "COMPLETED",
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

function getNotificationLeadHours(automation: AutomationWithCommunity) {
  const vocabulary = automation.community.vocabulary;
  if (vocabulary && typeof vocabulary === "object" && !Array.isArray(vocabulary)) {
    const value = (vocabulary as { aiNotificationLeadHours?: unknown }).aiNotificationLeadHours;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  }
  return 2;
}

function getPreparedForKey(nextRunAt: Date) {
  return nextRunAt.toISOString();
}

const SOCIAL_NOTIFICATION_CHANNELS = new Set(["INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM"]);

function hasSocialNotificationChannel(action: AutomationAction | undefined) {
  return action?.channels?.some((channel) => SOCIAL_NOTIFICATION_CHANNELS.has(channel)) ?? false;
}

async function prepareAutomationNotification(automation: AutomationWithCommunity, now: Date): Promise<void> {
  const supabase = createAdminClient();
  const config = (automation.triggerConfig ?? {}) as Record<string, unknown>;
  const nextRunAt = automation.nextRunAt ? new Date(automation.nextRunAt) : null;
  if (!nextRunAt || Number.isNaN(nextRunAt.getTime()) || now >= nextRunAt) return;

  const leadMs = getNotificationLeadHours(automation) * 60 * 60 * 1000;
  if (nextRunAt.getTime() - now.getTime() > leadMs) return;

  const preparedFor = getPreparedForKey(nextRunAt);
  if (config.preparedValidationFor === preparedFor) return;

  const actions = automation.actions as unknown as AutomationAction[];
  const action = actions.find((item) => item.type === "GENERATE_CONTENT" && item.requiresValidation !== false);
  const autoAction = actions.find((item) => item.type === "GENERATE_CONTENT");
  const notificationAction = action ?? autoAction;
  if (!hasSocialNotificationChannel(notificationAction)) return;

  const { data: notifyUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("communityId", automation.community.id)
    .in("role", ["SUPER_ADMIN", "ADMIN"]);

  if (!action) {
    if (autoAction && notifyUsers && notifyUsers.length > 0) {
      const leadHours = getNotificationLeadHours(automation);
      await supabase.from("Notification").insert(
        notifyUsers.map((user) => ({
          id: crypto.randomUUID(),
          userId: user.id,
          communityId: automation.community.id,
          type: "AUTOMATION_TRIGGERED",
          title: "Publication automatique programmée",
          body: `Cette publication partira automatiquement dans ${leadHours}h.`,
          link: "/dashboard/automations",
          data: { automationId: automation.id, preparedFor, channelTypes: autoAction.channels ?? [] },
        })),
      );
    }

    await supabase
      .from("Automation")
      .update({
        triggerConfig: {
          ...config,
          preparedValidationFor: preparedFor,
        } as never,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", automation.id);
    return;
  }

  const triggerConfig = (automation.triggerConfig ?? {}) as Record<string, unknown>;
  const configuredMessage = typeof triggerConfig.message === "string" ? triggerConfig.message.trim() : "";
  const generated = configuredMessage
    ? { body: configuredMessage, bodyHebrew: null, hashtags: [], cta: null }
    : await generateContent({
        communityId: automation.community.id,
        contentType: (action.contentType ?? "GENERAL") as never,
        eventId: automation.eventId ?? undefined,
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
      status: "AI_PROPOSAL",
      aiGenerated: true,
      aiModel: "gemini-2.5-flash",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (!draft) return;

  if (notifyUsers && notifyUsers.length > 0) {
    const channels = action.channels ?? [];
    const leadHours = getNotificationLeadHours(automation);
    await supabase.from("Notification").insert(
      notifyUsers.map((user) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        communityId: automation.community.id,
        type: "AI_CONTENT_READY",
        title: "Validation requise",
        body: `Dans ${leadHours}h, votre publication sera envoyée. Validez ?`,
        link: `/dashboard/assistant?draftId=${draft.id}`,
        data: { draftId: draft.id, automationId: automation.id, preparedFor, channelTypes: channels },
      })),
    );
  }

  await supabase
    .from("Automation")
    .update({
      triggerConfig: {
        ...config,
        preparedValidationFor: preparedFor,
        preparedDraftId: draft.id,
      } as never,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", automation.id);
}

async function shouldTrigger(automation: Automation, now: Date): Promise<boolean> {
  const supabase = createAdminClient();
  const config = automation.triggerConfig as Record<string, unknown>;

  if (config.startDate) {
    const start = new Date(config.startDate as string);
    if (now < startOfDay(start)) return false;
  }
  if (config.endDate) {
    const end = new Date(config.endDate as string);
    if (now > endOfDay(end)) return false;
  }

  const nextRunAt = automation.nextRunAt ? new Date(automation.nextRunAt) : null;
  const hasPreciseNextRun = nextRunAt !== null && !Number.isNaN(nextRunAt.getTime());
  if (automation.lastRunAt) {
    const lastRun = new Date(automation.lastRunAt);
    if (hasPreciseNextRun) {
      if (lastRun >= nextRunAt) return false;
    } else if (lastRun >= startOfDay(now)) {
      return false;
    }
  }
  if (hasPreciseNextRun && now < nextRunAt) return false;

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
      const repeat = String(config.repeat ?? "none");
      if (repeat === "none" && hasPreciseNextRun) return now >= nextRunAt;

      const time = (config.time as string) ?? "09:00";
      const [hours, minutes] = time.split(":").map(Number);
      const inTimeWindow = now.getHours() === hours && now.getMinutes() < minutes + 30;
      if (!inTimeWindow) return false;

      const date = typeof config.date === "string" ? config.date : null;

      if (repeat === "none") {
        if (!date) return false;
        const targetDate = new Date(date);
        return isWithinInterval(now, { start: startOfDay(targetDate), end: endOfDay(targetDate) });
      }

      if (repeat === "daily") {
        return true;
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
        if (
          action.requiresValidation !== false &&
          automation.nextRunAt &&
          triggerConfig.preparedValidationFor === automation.nextRunAt
        ) {
          break;
        }

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

        if (action.channels?.includes("EMAIL")) {
          await sendAutomationEmail({
            automation,
            subject: `Message de ${automation.community.name}`,
            body: generated.body,
          });
        }

        const autoPublishChannels = (action.channels ?? []).filter((channel) => channel !== "WHATSAPP");
        if (!action.requiresValidation && autoPublishChannels.length > 0) {
          const { data: channels } = await supabase
            .from("Channel")
            .select("id")
            .eq("communityId", automation.community.id)
            .in("type", autoPublishChannels as never[])
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
          const isScheduledEvent = automation.trigger === "CUSTOM_SCHEDULE" && Boolean(automation.eventId);
          await supabase.from("Notification").insert(
            notifyUsers.map((user) => ({
              id: crypto.randomUUID(),
              userId: user.id,
              communityId: automation.community.id,
              type: isScheduledEvent ? "EVENT_REMINDER" : "AI_CONTENT_READY",
              title: isScheduledEvent ? `Événement : ${eventName}` : "Message prêt à envoyer",
              body: isScheduledEvent
                ? `C'est l'heure de l'événement "${eventName}".`
                : `Il est temps d'envoyer votre message sur ${channelsText} pour ${eventName}.`,
              link: isScheduledEvent ? `/dashboard/assistant?eventId=${automation.eventId}` : `/dashboard/assistant?draftId=${draft.id}`,
              data: isScheduledEvent ? null : { draftId: draft.id, channelTypes: action.channels ?? [] },
            }))
          );
        }
        break;
      }

      case "SEND_EMAIL": {
        let toEmails: string[] = [];
        const { data: members } = await supabase
          .from("CommunityMember")
          .select("email")
          .eq("communityId", automation.community.id)
          .eq("optInEmail", true)
          .not("email", "is", null);
        
        if (members && members.length > 0) {
          toEmails = members.map((member) => member.email).filter((email): email is string => Boolean(email));
        } else if (automation.community.email) {
          toEmails = [automation.community.email];
        }

        if (process.env.RESEND_API_KEY && toEmails.length > 0) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const contentHtml = (action.emailBody || action.messageText || "Aucun contenu")
              .replace(/\n\n/g, "</p><p>")
              .replace(/\n/g, "<br />");
            const formattedContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${automation.community.name}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">${automation.community.name}</h1>
  </div>
  <div style="font-size: 15px; line-height: 1.7; color: #334155;"><p>${contentHtml}</p></div>
  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
    EnvoyÃ© via <strong>EasyCom AI</strong> Â· Communication communautaire assistÃ©e par IA
  </div>
</body>
</html>`;

            await resend.emails.send({
              from: process.env.EMAIL_FROM ?? `${automation.community.name} <noreply@easycom-ai.com>`,
              to: toEmails,
              subject: action.emailSubject || "Message important de votre communautÃ©",
              html: formattedContent,
            });
            console.log(`[Automation] Email envoyÃ© avec succÃ¨s via Resend Ã  ${toEmails.length} destinataires.`);
          } catch (err) {
            console.error("[Automation] Erreur lors de l'envoi de l'email via Resend:", err);
            throw err;
          }
        } else {
          console.warn("[Automation] Impossible d'envoyer l'email : RESEND_API_KEY absent ou aucun destinataire.");
        }
        break;
      }

      case "SEND_MESSAGE": {
        const { data: channels } = await supabase
          .from("Channel")
          .select("*")
          .eq("communityId", automation.community.id)
          .in("type", action.channels || [])
          .eq("isActive", true);

        if (channels && channels.length > 0) {
          for (const channel of channels) {
            const { data: pub } = await supabase
              .from("Publication")
              .insert({
                id: crypto.randomUUID(),
                communityId: automation.community.id,
                channelId: channel.id,
                channelType: channel.type,
                content: action.messageText || "Message vide",
                status: "PENDING",
                updatedAt: new Date().toISOString(),
              })
              .select("*, channel:Channel(*)")
              .single();

            if (pub) {
              await publishToChannel(pub as Publication & { channel: Channel });
            }
          }
        }
        break;
      }

      case "CREATE_NOTIFICATION": {
        if (notifyUsers && notifyUsers.length > 0) {
          await supabase.from("Notification").insert(
            notifyUsers.map((user) => ({
              id: crypto.randomUUID(),
              userId: user.id,
              communityId: automation.community.id,
              type: "AUTOMATION_TRIGGERED",
              title: action.notificationTitle || "Rappel automatique",
              body: action.notificationBody || "Une automatisation s'est dÃ©clenchÃ©e.",
              link: "/dashboard",
            }))
          );
        }
        break;
      }
    }
  }
}

function computeNextRunAt(automation: Automation, now: Date): Date | null {
  const config = (automation.triggerConfig ?? {}) as Record<string, unknown>;
  const nextRun = (() => {
    switch (automation.trigger as AutomationTrigger) {
      case "WEEKLY_SHABBAT": return addDays(now, 7);
      case "DAILY": return addDays(now, 1);
      case "CUSTOM_SCHEDULE": {
        const repeat = String(config.repeat ?? "none");
        if (repeat === "none") return null;
        if (repeat === "daily") return addDays(now, 1);
        if (repeat === "weekly" || repeat === "custom") return addDays(now, 7);
        if (repeat === "monthly") {
          const next = new Date(now);
          next.setMonth(next.getMonth() + 1);
          return next;
        }
        return null;
      }
      default: return null;
    }
  })();

  if (nextRun && config.endDate) {
    const end = new Date(config.endDate as string);
    if (nextRun > endOfDay(end)) return null;
  }
  return nextRun;
}

