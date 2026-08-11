import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/engine";
import { createPublicationsFromDraft, publishToAllChannels, publishToChannel } from "@/lib/publishing/publisher";
import { editTemplatePosterWithFal, type PosterChange } from "@/lib/templates/fal-edit";
import { getShabbatTimes, getNextHoliday } from "./hebcal";
import {
  getCampaignFromTriggerConfig,
  getDueReminder,
  getNextPendingReminder,
  reminderLabel,
  type EventReminder,
  type EventReminderCampaign,
} from "./event-reminders";
import {
  getRecapSettingsFromTriggerConfig,
  getRecapHistory,
  isAllowedRecapDay,
  nextAllowedRecapDate,
  nextDailyRunAt,
  dateISOInTz,
  addDaysISO,
  type RecapHistory,
} from "./event-recap";
import {
  getWeeklyImagesSettings,
  nextWeeklyImagesRunAt,
} from "./weekly-images";
import {
  fetchDailyStudy,
  getHayomYomAccess,
  getHayomYomSettings,
  nextHayomYomRunAt,
} from "./hayom-yom";
import {
  getMonthlySettings,
  getProgramHistory as getMonthlyProgramHistory,
  getRecapHistory as getMonthlyRecapHistory,
  getNextMonthlyRun,
  getDueMonthly,
  type MonthlyHistory,
} from "./monthly-program-recap";
import { notifyUser } from "@/lib/notifications/notify";
import { createNotificationOnce } from "@/lib/notifications/create-once";
import { addDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import type { Tables, Enums } from "@/types/database.types";
import { Resend } from "resend";

type Automation = Tables<"Automation">;
type Publication = Tables<"Publication">;
type Channel = Tables<"Channel">;
type AutomationTrigger = Enums<"AutomationTrigger">;
type NotificationType = Enums<"NotificationType">;
type AdminClient = ReturnType<typeof createAdminClient>;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getShabbatPosterConfig(triggerConfig: Record<string, unknown>) {
  const value = triggerConfig.shabbatPoster;
  return isRecord(value) ? value : {};
}

function buildShabbatPosterChanges(
  fields: Record<string, string>,
  shabbatTimes: { entry: string; exit: string; date?: string; parasha?: string } | null
): PosterChange[] {
  const formatDate = (d: string) => {
    try {
      return new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    } catch { return d; }
  };
  return [
    { label: "Organisation", currentText: "", newText: fields.structureName ?? "" },
    { label: "Paracha", currentText: "", newText: shabbatTimes?.parasha ?? fields.parasha ?? "" },
    { label: "Date", currentText: "", newText: shabbatTimes?.date ? formatDate(shabbatTimes.date) : "" },
    { label: "Heure d'entrée", currentText: "", newText: shabbatTimes?.entry ?? "" },
    { label: "Heure de sortie", currentText: "", newText: shabbatTimes?.exit ?? "" },
    { label: "Ville", currentText: "", newText: fields.city ?? "" },
    { label: "Kiddouch", currentText: "", newText: fields.kiddouch ?? "" },
  ].filter((change) => change.newText.trim().length > 0) as PosterChange[];
}

async function renderShabbatPosterImage(params: {
  supabase: ReturnType<typeof createAdminClient>;
  triggerConfig: Record<string, unknown>;
  communityId: string;
  shabbatTimes: { entry: string; exit: string; date?: string; parasha?: string; hebrewDate?: string } | null;
}): Promise<string | null> {
  const posterConfig = getShabbatPosterConfig(params.triggerConfig);
  const selectedTemplateId = typeof posterConfig.selectedTemplateId === "string" ? posterConfig.selectedTemplateId : "";
  if (!selectedTemplateId) return null;

  const { data: template } = await params.supabase
    .from("Template")
    .select("*")
    .eq("id", selectedTemplateId)
    .or(`isGlobal.eq.true,communityId.eq.${params.communityId}`)
    .maybeSingle();

  if (!template) return null;

  const savedFields = (isRecord(posterConfig.fields) ? posterConfig.fields : {}) as Record<string, string>;

  try {
    const changes = buildShabbatPosterChanges(savedFields, params.shabbatTimes);
    if (changes.length === 0) return null;
    const rendered = await editTemplatePosterWithFal({
      admin: params.supabase,
      template,
      communityId: params.communityId,
      changes,
    });
    return rendered.imageUrl;
  } catch (err) {
    console.error("[Automation] Erreur rendu affiche Chabbat:", err);
    return null;
  }
}

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
  imageUrl?: string | null;
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
  const imageBlock = params.imageUrl
    ? `<div style="text-align:center;margin:28px 0;"><img src="${params.imageUrl}" alt="Affiche" style="max-width:100%;border-radius:14px;box-shadow:0 4px 28px rgba(0,0,0,0.14);" /></div>`
    : "";
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
  ${imageBlock}
  <div style="font-size: 15px; line-height: 1.7; color: #334155;"><p>${safeBody}</p></div>
  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
    Envoye via <strong>EasyCom IA</strong> - Communication communautaire assistee par IA
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
  console.log("[Automation] Démarrage du moteur…");

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

  console.log(`[Automation] Déclenchement: ${automation.name} (${automation.trigger})`);

  const hayomSettings = getHayomYomSettings(automation.triggerConfig);
  const runId = hayomSettings
    ? `hayom-yom:${automation.id}:${dateISOInTz(now, hayomSettings.timezone)}`
    : crypto.randomUUID();
  const { data: run, error: runError } = await supabase
    .from("AutomationRun")
    .insert({ id: runId, automationId: automation.id, status: "RUNNING" })
    .select()
    .single();

  if (runError?.code === "23505") return;
  if (runError) throw runError;
  if (!run) return;

  try {
    const outcome = await executeAutomationActions(automation);

    await supabase
      .from("AutomationRun")
      .update({ status: "SUCCESS", completedAt: new Date().toISOString() })
      .eq("id", run.id);

    if (outcome === "paused") {
      await supabase.from("Automation").update({
        lastRunAt: now.toISOString(), nextRunAt: null, isActive: false, status: "PAUSED", updatedAt: new Date().toISOString(),
      }).eq("id", automation.id);
      return;
    }

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
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
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
  // Les campagnes J-10/J-5 et les récaps après événement gèrent eux-mêmes
  // leurs notifications au déclenchement (cf. executeAutomationActions).
  if (getCampaignFromTriggerConfig(automation.triggerConfig)) return;
  if (getRecapSettingsFromTriggerConfig(automation.triggerConfig)) return;
  if (getWeeklyImagesSettings(automation.triggerConfig)) return;
  if (getMonthlySettings(automation.triggerConfig)) return;
  if (getHayomYomSettings(automation.triggerConfig)) return;

  const leadHours = getNotificationLeadHours(automation);
  if (leadHours === 0) return; // 0h = pas de pré-notification, exécution directe à l'heure exacte

  const supabase = createAdminClient();
  const config = (automation.triggerConfig ?? {}) as Record<string, unknown>;
  const nextRunAt = automation.nextRunAt ? new Date(automation.nextRunAt) : null;
  if (!nextRunAt || Number.isNaN(nextRunAt.getTime()) || now >= nextRunAt) return;

  const leadMs = leadHours * 60 * 60 * 1000;
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
      const notifTitle = "Publication automatique programmée";
      const notifBody = `Cette publication partira automatiquement dans ${leadHours}h.`;
      const notifLink = "/dashboard/automations";
      const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
        communityId: automation.community.id,
        type: "AUTOMATION_TRIGGERED",
        title: notifTitle,
        body: notifBody,
        link: notifLink,
        dedupeKey: `automation-auto-scheduled:${automation.id}:${preparedFor}`,
        data: { automationId: automation.id, preparedFor, channelTypes: autoAction.channels ?? [] },
      });
      await Promise.allSettled(
        notifiedUsers.map((user) => notifyUser(supabase, user.id, { title: notifTitle, body: notifBody, link: notifLink }))
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

  // Pour WEEKLY_SHABBAT : récupérer les horaires + l'image du template sélectionné
  let shabbatTimesForPrep = null;
  let preNotifImageUrl: string | null = null;
  if (automation.trigger === "WEEKLY_SHABBAT") {
    shabbatTimesForPrep = await getShabbatTimes({
      city: automation.community.city ?? undefined,
      timezone: automation.community.timezone,
    });
    preNotifImageUrl = await renderShabbatPosterImage({
      supabase,
      triggerConfig,
      communityId: automation.community.id,
      shabbatTimes: shabbatTimesForPrep,
    });
  }

  const generated = configuredMessage
    ? { body: configuredMessage, bodyHebrew: null, hashtags: [], cta: null }
    : await generateContent({
        communityId: automation.community.id,
        contentType: (action.contentType ?? "GENERAL") as never,
        eventId: automation.eventId ?? undefined,
        shabbatTimes: shabbatTimesForPrep ?? undefined,
        hebrewDate: shabbatTimesForPrep?.hebrewDate,
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
      imageUrl: preNotifImageUrl,
      contentType: (action.contentType ?? "GENERAL") as never,
      status: "AI_PROPOSAL",
      aiGenerated: true,
      aiModel: "gemini-2.5-flash",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (!draft) return;

  // Email d'approbation avec l'affiche si disponible
  if (action.channels?.includes("EMAIL") && preNotifImageUrl) {
    const leadHours = getNotificationLeadHours(automation);
    await sendAutomationEmail({
      automation,
      subject: `Chabbat Chalom — Votre affiche est prête à valider — ${automation.community.name}`,
      body: `Votre affiche de Chabbat est prête. Dans ${leadHours}h, elle sera publiée si vous la validez.`,
      imageUrl: preNotifImageUrl,
    }).catch((err) => console.error("[Automation] Erreur email pré-notification:", err));
  }

  if (notifyUsers && notifyUsers.length > 0) {
    const channels = action.channels ?? [];
    const leadHours = getNotificationLeadHours(automation);
    const notifTitle = automation.trigger === "WEEKLY_SHABBAT" ? "Affiche Chabbat prête à valider" : "Validation requise";
    const notifBody = `Dans ${leadHours}h, votre publication sera envoyée. Validez ?`;
    const notifLink = `/dashboard/assistant?draftId=${draft.id}`;
    const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
      communityId: automation.community.id,
      type: "AI_CONTENT_READY",
      title: notifTitle,
      body: notifBody,
      link: notifLink,
      dedupeKey: `automation-validation:${automation.id}:${preparedFor}`,
      data: { draftId: draft.id, automationId: automation.id, preparedFor, channelTypes: channels },
    });
    await Promise.allSettled(
      notifiedUsers.map((user) => notifyUser(supabase, user.id, { title: notifTitle, body: notifBody, link: notifLink }))
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

  // Récap après événement : exécution quotidienne à l'heure de notification.
  if (getRecapSettingsFromTriggerConfig(config)) {
    return hasPreciseNextRun ? now >= nextRunAt : false;
  }

  // Cette semaine en images : notification hebdomadaire (jour + heure choisis).
  if (getWeeklyImagesSettings(config)) {
    return hasPreciseNextRun ? now >= nextRunAt : false;
  }

  // Programme & récap du mois : occurrences mensuelles (programme + récap).
  if (getMonthlySettings(config)) {
    return hasPreciseNextRun ? now >= nextRunAt : false;
  }

  if (getHayomYomSettings(config)) {
    return hasPreciseNextRun ? now >= nextRunAt : false;
  }

  switch (automation.trigger as AutomationTrigger) {
    case "WEEKLY_SHABBAT": {
      // Si nextRunAt est défini et atteint (déjà vérifié avant le switch), on déclenche
      if (hasPreciseNextRun) return true;
      // Fallback sans nextRunAt : vérifier le jour en heure Paris (jamais en UTC)
      const triggerDay = (config.dayOfWeek as number) ?? 5;
      const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const parisDayName = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "long" }).format(now);
      const parisDayOfWeek = DAYS.indexOf(parisDayName);
      return parisDayOfWeek === triggerDay;
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
      // Campagne J-10/J-5 : on déclenche dès que nextRunAt (= prochain rappel) est atteint.
      if (getCampaignFromTriggerConfig(config)) return hasPreciseNextRun ? now >= nextRunAt : false;

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

/**
 * Déclenche le prochain rappel dû d'une campagne J-10/J-5 : génère le contenu,
 * respecte le mode de publication choisi, met à jour le statut du rappel et
 * recalcule l'état de la campagne dans triggerConfig.
 */
async function executeEventReminderCampaign(
  automation: AutomationWithCommunity,
  campaign: EventReminderCampaign,
  now: Date
): Promise<void> {
  const supabase = createAdminClient();
  const timezone = automation.community.timezone || "Europe/Paris";

  // En cron : le rappel dû. En manuel ("Publier maintenant") : le prochain en attente.
  const due =
    getDueReminder(campaign, now, timezone) ?? getNextPendingReminder(campaign, timezone)?.reminder ?? null;
  if (!due) return;

  const requiresValidation = campaign.scheduleMode !== "automatic";
  const labelText = due.label || reminderLabel(due.offsetDays, due.exactDate);
  const imageUrl = due.visualUrl ?? campaign.mainVisualUrl ?? null;

  const generated = await generateContent({
    communityId: automation.community.id,
    contentType: "EVENT_REMINDER" as never,
    eventId: campaign.eventId ?? undefined,
    customInstructions: [
      `Événement : ${campaign.eventName}`,
      `Date : ${campaign.eventDate}`,
      campaign.eventTime ? `Heure : ${campaign.eventTime}` : null,
      campaign.eventLocation ? `Lieu : ${campaign.eventLocation}` : null,
      `Rappel : ${labelText}`,
      "Rédige un rappel fidèle à ces informations, sans inventer de détail.",
    ].filter(Boolean).join("\n"),
  });

  const { data: draft } = await supabase
    .from("ContentDraft")
    .insert({
      id: crypto.randomUUID(),
      communityId: automation.community.id,
      eventId: campaign.eventId ?? null,
      body: generated.body,
      bodyHebrew: generated.bodyHebrew ?? null,
      hashtags: generated.hashtags,
      cta: generated.cta ?? null,
      imageUrl,
      contentType: "EVENT_REMINDER" as never,
      status: requiresValidation ? "AI_PROPOSAL" : "READY_TO_PUBLISH",
      aiGenerated: true,
      aiModel: "gemini-2.5-flash",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  const { data: notifyUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("communityId", automation.community.id)
    .in("role", ["SUPER_ADMIN", "ADMIN"]);

  let newStatus: EventReminder["status"] = requiresValidation ? "PENDING_VALIDATION" : "PUBLISHED";

  if (draft) {
    if (due.channels.includes("EMAIL")) {
      await sendAutomationEmail({
        automation,
        subject: `${campaign.eventName} — ${labelText} — ${automation.community.name}`,
        body: generated.body,
        imageUrl,
      }).catch((err) => console.error("[Campaign] Erreur email:", err));
    }

    const socialChannels = due.channels.filter((c) => c !== "EMAIL");

    if (!requiresValidation && socialChannels.length > 0) {
      const { data: channels } = await supabase
        .from("Channel")
        .select("id")
        .eq("communityId", automation.community.id)
        .in("type", socialChannels as never[])
        .eq("isActive", true)
        .eq("isConnected", true);

      if (channels && channels.length > 0) {
        const channelIds = channels.map((c) => c.id);
        await createPublicationsFromDraft({ draftId: draft.id, communityId: automation.community.id, channelIds });
        const results = await publishToAllChannels(draft.id, channelIds);
        const failures = channelIds.filter((channelId) => results[channelId]?.success !== true);
        if (failures.length > 0) newStatus = "ERROR";
        if (notifyUsers && notifyUsers.length > 0) {
          const successfulCount = channelIds.length - failures.length;
          const title = failures.length === 0 ? `${labelText} publié` : `${labelText} : publication incomplète`;
          const body = failures.length === 0
            ? `Le rappel pour « ${campaign.eventName} » a été publié automatiquement.`
            : `${successfulCount} publication(s) réussie(s), ${failures.length} en échec. Consultez l’historique des publications.`;
          const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
            communityId: automation.community.id,
            type: failures.length === 0 ? "PUBLICATION_SUCCESS" : "PUBLICATION_FAILED",
            title,
            body,
            link: "/dashboard/publications",
            dedupeKey: `event-reminder-auto-result:${automation.id}:${due.id}`,
            data: { draftId: draft.id, automationId: automation.id, reminderId: due.id },
          });
          await Promise.allSettled(notifiedUsers.map((user) => notifyUser(supabase, user.id, { title, body, link: "/dashboard/publications" })));
        }
      } else if (notifyUsers && notifyUsers.length > 0) {
        newStatus = "ERROR";
        await insertAutomationNotificationsOnce(supabase, notifyUsers, {
          communityId: automation.community.id,
          type: "AI_CONTENT_READY",
          title: "Canaux non configurés",
          body: `Le rappel "${labelText}" est prêt mais aucun canal actif (${socialChannels.join(", ")}) n'est trouvé. Configurez-les dans Paramètres > Canaux.`,
          link: "/dashboard/settings/channels",
          dedupeKey: `event-reminder-missing-channels:${automation.id}:${due.id}`,
          data: { draftId: draft.id, automationId: automation.id, reminderId: due.id },
        });
      }
    }

    if (requiresValidation && notifyUsers && notifyUsers.length > 0) {
      const notifTitle = `${labelText} : ${campaign.eventName}`;
      const notifBody = `Votre rappel "${labelText}" est prêt. Ouvrez l'Assistant pour le valider et le publier.`;
      const notifLink = `/dashboard/assistant?draftId=${draft.id}`;
      const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
        communityId: automation.community.id,
        type: "AI_CONTENT_READY",
        title: notifTitle,
        body: notifBody,
        link: notifLink,
        dedupeKey: `event-reminder-validation:${automation.id}:${due.id}`,
        data: { draftId: draft.id, automationId: automation.id, reminderId: due.id, channelTypes: due.channels },
      });
      await Promise.allSettled(
        notifiedUsers.map((user) => notifyUser(supabase, user.id, { title: notifTitle, body: notifBody, link: notifLink }))
      );
    }
  }

  const updatedReminders = campaign.reminders.map((r) =>
    r.id === due.id ? { ...r, status: newStatus, publishedDraftId: draft?.id ?? null } : r
  );
  const updatedCampaign: EventReminderCampaign = { ...campaign, reminders: updatedReminders };
  const config = (automation.triggerConfig ?? {}) as Record<string, unknown>;
  const newTriggerConfig = { ...config, eventReminderCampaign: updatedCampaign };
  // Mutation en mémoire pour que computeNextRunAt voie l'état à jour.
  automation.triggerConfig = newTriggerConfig as never;
  await supabase
    .from("Automation")
    .update({ triggerConfig: newTriggerConfig as never, updatedAt: new Date().toISOString() })
    .eq("id", automation.id);
}

/**
 * Récap après événement : chaque jour à l'heure de notification, repère les
 * événements terminés dont le récap est dû aujourd'hui (lendemain reporté hors
 * Chabbat/Yom Tov) et envoie une notification invitant à créer le récap.
 * Ne génère aucun contenu : tout passe par validation humaine côté assistant.
 */
async function executeEventRecapNotifications(automation: AutomationWithCommunity, now: Date): Promise<void> {
  const supabase = createAdminClient();
  const settings = getRecapSettingsFromTriggerConfig(automation.triggerConfig);
  if (!settings || settings.status !== "active") return;

  const timezone = automation.community.timezone || settings.timezone || "Europe/Paris";
  const todayISO = dateISOInTz(now, timezone);

  // Aujourd'hui n'est pas un jour autorisé : on ne notifie pas (report naturel).
  if (!isAllowedRecapDay(todayISO, timezone)) return;

  const since = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from("Event")
    .select("id, title, startDate, endDate, status")
    .eq("communityId", automation.community.id)
    .neq("status", "ARCHIVED")
    .gte("startDate", since)
    .lte("startDate", now.toISOString())
    .order("startDate", { ascending: false })
    .limit(50);

  if (!events || events.length === 0) return;

  const history: RecapHistory = { ...getRecapHistory(automation.triggerConfig) };

  const { data: notifyUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("communityId", automation.community.id)
    .in("role", ["SUPER_ADMIN", "ADMIN"]);

  let changed = false;

  for (const event of events) {
    const entry = history[event.id];
    if (entry && (entry.status === "PUBLISHED" || entry.status === "IGNORED")) continue;
    if (entry && entry.status === "NOTIFIED" && entry.notifiedOn === todayISO) continue;

    const endISO = dateISOInTz(new Date(event.endDate ?? event.startDate), timezone);
    // Le récap est dû le lendemain, reporté au prochain jour autorisé.
    const recapDay = nextAllowedRecapDate(addDaysISO(endISO, 1), timezone);
    const dueToday = recapDay === todayISO;
    const postponedToday = entry?.status === "POSTPONED" && entry.postponedUntil === todayISO;
    if (!dueToday && !postponedToday) continue;

    if (notifyUsers && notifyUsers.length > 0) {
      const title = `Récap : ${event.title}`;
      const body = `Hier, c'était votre événement « ${event.title} ». N'oubliez pas de publier quelques photos sur vos réseaux. Voulez-vous créer une publication récap ?`;
      const link = `/dashboard/recap-auto?scope=event&eventId=${event.id}`;
      const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
        communityId: automation.community.id,
        type: "AI_CONTENT_READY",
        title,
        body,
        link,
        dedupeKey: `event-recap:${automation.id}:${event.id}:${todayISO}`,
        data: { eventId: event.id, automationId: automation.id, recap: true, notifiedOn: todayISO },
      });
      await Promise.allSettled(
        notifiedUsers.map((user) => notifyUser(supabase, user.id, { title, body, link }))
      );
    }

    history[event.id] = { status: "NOTIFIED", notifiedOn: todayISO };
    changed = true;
  }

  if (changed) {
    const config = (automation.triggerConfig ?? {}) as Record<string, unknown>;
    const newTriggerConfig = { ...config, recapHistory: history };
    automation.triggerConfig = newTriggerConfig as never;
    await supabase
      .from("Automation")
      .update({ triggerConfig: newTriggerConfig as never, updatedAt: new Date().toISOString() })
      .eq("id", automation.id);
  }
}

/**
 * Cette semaine en images : chaque semaine au jour/heure choisis, demande à
 * l'utilisateur s'il a pris des photos. Aucune génération automatique : tout
 * passe par l'assistant et la validation humaine.
 */
async function executeWeeklyImagesNotification(automation: AutomationWithCommunity): Promise<void> {
  const supabase = createAdminClient();
  const settings = getWeeklyImagesSettings(automation.triggerConfig);
  if (!settings || settings.status !== "active") return;

  const { data: notifyUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("communityId", automation.community.id)
    .in("role", ["SUPER_ADMIN", "ADMIN"]);

  if (!notifyUsers || notifyUsers.length === 0) return;

  const title = "Avez-vous pris des photos cette semaine ?";
  const body =
    "Je peux préparer une publication « Cette semaine en images » avec vos photos, prête à publier sur Instagram, Facebook et WhatsApp.";
  const link = "/dashboard/weekly-images-auto";
  const runAt = automation.nextRunAt ?? new Date().toISOString();
  const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
    communityId: automation.community.id,
    type: "AI_CONTENT_READY",
    title,
    body,
    link,
    dedupeKey: `weekly-images:${automation.id}:${runAt}`,
    data: { automationId: automation.id, weeklyImages: true, runAt },
  });
  await Promise.allSettled(
    notifiedUsers.map((user) => notifyUser(supabase, user.id, { title, body, link }))
  );
}

interface NotifyUserRow {
  id: string;
}

interface AutomationNotificationPayload {
  communityId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  dedupeKey: string;
  data?: Record<string, unknown> | null;
}

async function insertAutomationNotificationsOnce(
  supabase: AdminClient,
  users: NotifyUserRow[] | null | undefined,
  payload: AutomationNotificationPayload
): Promise<NotifyUserRow[]> {
  if (!users || users.length === 0) return [];

  const outcomes = await Promise.all(
    users.map(async (user) => ({
      user,
      created: await createNotificationOnce(supabase, {
        ...payload,
        userId: user.id,
        dedupeKey: `${payload.dedupeKey}:user:${user.id}`,
      }),
    }))
  );

  return outcomes.filter((outcome) => outcome.created).map((outcome) => outcome.user);
}

/**
 * Récap du mois : notifie le dernier jour, reporté hors Chabbat/Yom Tov.
 * Aucune génération ni publication n'est lancée sans validation humaine.
 */
async function executeMonthlyProgramRecapNotification(automation: AutomationWithCommunity, now: Date): Promise<void> {
  const supabase = createAdminClient();
  const settings = getMonthlySettings(automation.triggerConfig);
  if (!settings || settings.status !== "active") return;

  const timezone = automation.community.timezone || settings.timezone || "Europe/Paris";
  const programHistory: MonthlyHistory = { ...getMonthlyProgramHistory(automation.triggerConfig) };
  const recapHistory: MonthlyHistory = { ...getMonthlyRecapHistory(automation.triggerConfig) };

  const due = getDueMonthly(settings, now, programHistory, recapHistory, timezone);
  if (!due) return;

  const { data: notifyUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("communityId", automation.community.id)
    .in("role", ["SUPER_ADMIN", "ADMIN"]);

  const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

  if (notifyUsers && notifyUsers.length > 0) {
    const title = "Récap du mois";
    const body = "Le mois se termine. Voulez-vous préparer un récap en images des événements du mois ?";
    const link = `/dashboard/recap-auto?scope=monthly&month=${due.key}`;
    const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
      communityId: automation.community.id,
      type: "AI_CONTENT_READY",
      title,
      body,
      link,
      dedupeKey: `monthly-recap:${automation.id}:${due.key}`,
      data: { automationId: automation.id, monthly: true, runType: "recap", monthKey: due.key },
    });
    await Promise.allSettled(notifiedUsers.map((user) => notifyUser(supabase, user.id, { title, body, link })));
  }

  recapHistory[due.key] = { status: "NOTIFIED", notifiedOn: todayISO };

  const config = (automation.triggerConfig ?? {}) as Record<string, unknown>;
  const newTriggerConfig = { ...config, programHistory, recapHistory };
  automation.triggerConfig = newTriggerConfig as never;
  await supabase
    .from("Automation")
    .update({ triggerConfig: newTriggerConfig as never, updatedAt: new Date().toISOString() })
    .eq("id", automation.id);
}

async function notifyHayomYomOutcome(params: {
  automation: AutomationWithCommunity;
  dateISO: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  const { data: users } = await supabase.from("profiles").select("id")
    .eq("communityId", params.automation.community.id)
    .in("role", ["SUPER_ADMIN", "ADMIN"]);
  if (!users?.length) return;
  const link = "/dashboard/hayom-yom-sefer-hamitsvot";
  const notifiedUsers = await insertAutomationNotificationsOnce(supabase, users, {
    communityId: params.automation.community.id,
    type: params.type,
    title: params.title,
    body: params.body,
    link,
    dedupeKey: `hayom-yom:${params.automation.id}:${params.dateISO}:${params.type}`,
    data: { automationId: params.automation.id, date: params.dateISO, ...params.data },
  });
  await Promise.allSettled(notifiedUsers.map((user) => notifyUser(supabase, user.id, {
    title: params.title, body: params.body, link,
  })));
}

async function executeHayomYomPublication(
  automation: AutomationWithCommunity,
): Promise<"paused" | void> {
  const settings = getHayomYomSettings(automation.triggerConfig);
  if (!settings || settings.status !== "active") return;
  const supabase = createAdminClient();
  const dateISO = dateISOInTz(new Date(), settings.timezone);

  const access = await getHayomYomAccess({ admin: supabase, communityId: automation.community.id });
  if (!access.allowed) {
    const config = (automation.triggerConfig ?? {}) as Record<string, unknown>;
    const pausedConfig = { ...config, hayomYomSettings: { ...settings, status: "paused" } };
    automation.triggerConfig = pausedConfig as never;
    await supabase.from("Automation").update({ triggerConfig: pausedConfig as never, updatedAt: new Date().toISOString() }).eq("id", automation.id);
    await notifyHayomYomOutcome({
      automation, dateISO, type: "SUBSCRIPTION_EXPIRING",
      title: "Automatisation mise en pause",
      body: "Votre abonnement ne permet plus la publication automatique du Hayom Yom et du Sefer Hamitsvot.",
    });
    return "paused";
  }

  if (!isAllowedRecapDay(dateISO, settings.timezone)) {
    await notifyHayomYomOutcome({
      automation, dateISO, type: "AUTOMATION_TRIGGERED",
      title: "Publication annulée aujourd’hui",
      body: "Aucune publication Hayom Yom et Sefer Hamitsvot n’a été envoyée, car aujourd’hui est Chabbat ou Yom Tov.",
      data: { outcome: "SKIPPED_RELIGIOUS_DAY" },
    });
    return;
  }

  let study;
  try {
    study = await fetchDailyStudy(dateISO);
  } catch (error) {
    await notifyHayomYomOutcome({
      automation, dateISO, type: "AUTOMATION_FAILED",
      title: "Publication automatique annulée",
      body: `Les textes du jour n’ont pas pu être récupérés : ${error instanceof Error ? error.message : "source indisponible"}`,
      data: { outcome: "SOURCE_FAILED" },
    });
    return;
  }

  const { data: channel } = await supabase.from("Channel").select("*")
    .eq("communityId", automation.community.id)
    .eq("type", "FACEBOOK")
    .eq("isConnected", true)
    .eq("isActive", true)
    .maybeSingle();
  if (!channel) {
    await notifyHayomYomOutcome({
      automation, dateISO, type: "CHANNEL_DISCONNECTED",
      title: "Facebook doit être reconnecté",
      body: "La publication automatique n’a pas été envoyée, car aucune page Facebook active n’est connectée.",
      data: { outcome: "CHANNEL_MISSING" },
    });
    return;
  }

  const { data: draft, error: draftError } = await supabase.from("ContentDraft").insert({
    id: crypto.randomUUID(),
    communityId: automation.community.id,
    eventId: null,
    title: `Hayom Yom et Sefer Hamitsvot — ${study.dateLabel}`,
    body: study.facebookText,
    bodyHebrew: null,
    hashtags: [],
    cta: null,
    imageUrl: null,
    contentType: "DAILY_CONTENT",
    status: "READY_TO_PUBLISH",
    aiGenerated: false,
    aiModel: null,
    updatedAt: new Date().toISOString(),
  }).select().single();
  if (draftError || !draft) throw draftError ?? new Error("Brouillon introuvable");

  const { data: publication, error: publicationError } = await supabase.from("Publication").insert({
    id: crypto.randomUUID(),
    communityId: automation.community.id,
    eventId: null,
    draftId: draft.id,
    channelId: channel.id,
    channelType: "FACEBOOK",
    status: "PENDING",
    content: study.facebookText,
    mediaUrls: [],
    metadata: {
      automationId: automation.id,
      date: dateISO,
      hayomYomUrl: study.hayomYomUrl,
      seferHamitsvotUrl: study.seferHamitsvotUrl,
      source: "Beth Loubavitch",
    },
    updatedAt: new Date().toISOString(),
  }).select("*, channel:Channel(*)").single();
  if (publicationError || !publication) throw publicationError ?? new Error("Publication introuvable");

  const result = await publishToChannel(publication as Publication & { channel: Channel }, { createNotification: false });
  await notifyHayomYomOutcome({
    automation,
    dateISO,
    type: result.success ? "PUBLICATION_SUCCESS" : "PUBLICATION_FAILED",
    title: result.success ? "Études quotidiennes publiées" : "Échec de la publication Facebook",
    body: result.success
      ? "Le Hayom Yom et le Sefer Hamitsvot ont été publiés automatiquement sur Facebook."
      : `La publication Facebook a échoué : ${result.error ?? "erreur inconnue"}`,
    data: { publicationId: publication.id, externalUrl: result.externalUrl ?? null, outcome: result.success ? "PUBLISHED" : "FAILED" },
  });
}

export async function executeAutomationActions(
  automation: AutomationWithCommunity
): Promise<"paused" | void> {
  const supabase = createAdminClient();

  if (getHayomYomSettings(automation.triggerConfig)) {
    return executeHayomYomPublication(automation);
  }

  // Campagne J-10/J-5 : logique dédiée (un rappel par déclenchement).
  const campaign = getCampaignFromTriggerConfig(automation.triggerConfig);
  if (campaign) {
    await executeEventReminderCampaign(automation, campaign, new Date());
    return;
  }

  // Programme & récap du mois : notification mensuelle (validation humaine).
  if (getMonthlySettings(automation.triggerConfig)) {
    await executeMonthlyProgramRecapNotification(automation, new Date());
    return;
  }

  // Récap après événement : notifications uniquement (validation humaine).
  if (getRecapSettingsFromTriggerConfig(automation.triggerConfig)) {
    await executeEventRecapNotifications(automation, new Date());
    return;
  }

  // Cette semaine en images : notification hebdomadaire (validation humaine).
  if (getWeeklyImagesSettings(automation.triggerConfig)) {
    await executeWeeklyImagesNotification(automation);
    return;
  }

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

        const selectedTemplateImageUrl = automation.trigger === "WEEKLY_SHABBAT"
          ? await renderShabbatPosterImage({
              supabase,
              triggerConfig,
              communityId: automation.community.id,
              shabbatTimes,
            })
          : null;

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
            imageUrl: selectedTemplateImageUrl,
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
            subject: automation.trigger === "WEEKLY_SHABBAT"
              ? `Chabbat Chalom — Horaires de Chabbat — ${automation.community.name}`
              : `Message de ${automation.community.name}`,
            body: generated.body,
            imageUrl: selectedTemplateImageUrl,
          });
        }

        const autoPublishChannels = action.channels ?? [];
        let autoPublishSucceeded = false;
        if (!action.requiresValidation && autoPublishChannels.length > 0) {
          const socialChannels = autoPublishChannels.filter((c) => c !== "EMAIL");
          const { data: channels } = await supabase
            .from("Channel")
            .select("id")
            .eq("communityId", automation.community.id)
            .in("type", socialChannels as never[])
            .eq("isActive", true);

          if (channels && channels.length > 0) {
            const channelIds = channels.map((c) => c.id);
            await createPublicationsFromDraft({
              draftId: draft.id,
              communityId: automation.community.id,
              channelIds,
            });
            await publishToAllChannels(draft.id, channelIds);
            autoPublishSucceeded = true;
          } else if (socialChannels.length > 0 && notifyUsers && notifyUsers.length > 0) {
            // Aucun canal social actif trouvé — avertir l'admin
            const missingText = socialChannels.join(", ");
            const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
              communityId: automation.community.id,
              type: "AI_CONTENT_READY",
              title: "Canaux non configurés",
              body: `L'affiche Chabbat est prête mais aucun canal actif (${missingText}) n'est trouvé. Configurez-les dans Paramètres > Canaux.`,
              link: "/dashboard/settings/channels",
              dedupeKey: `missing-channels:${automation.id}:${automation.nextRunAt ?? draft.id}`,
              data: { draftId: draft.id, automationId: automation.id, channelTypes: socialChannels },
            });
            await Promise.allSettled(
              notifiedUsers.map((user) =>
                notifyUser(supabase, user.id, {
                  title: "Canaux non configurés",
                  body: `Configurez vos réseaux sociaux dans Paramètres > Canaux pour que l'affiche parte automatiquement.`,
                  link: "/dashboard/settings/channels",
                })
              )
            );
          }
        }

        if (notifyUsers && notifyUsers.length > 0 && !autoPublishSucceeded) {
          const isScheduledEvent = automation.trigger === "CUSTOM_SCHEDULE" && Boolean(automation.eventId);
          const isShabbat = automation.trigger === "WEEKLY_SHABBAT";
          const notifTitle = isScheduledEvent ? `Événement : ${eventName}` : isShabbat ? "Affiche Chabbat prête" : "Message prêt à envoyer";
          const notifBody = isScheduledEvent
            ? `C'est l'heure de l'événement "${eventName}".`
            : isShabbat
            ? "L'affiche de Chabbat est générée. Ouvrez l'Assistant pour la publier."
            : `Il est temps d'envoyer votre message sur ${channelsText} pour ${eventName}.`;
          const notifLink = isScheduledEvent
            ? `/dashboard/assistant?eventId=${automation.eventId}`
            : `/dashboard/assistant?draftId=${draft.id}`;
          const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
            communityId: automation.community.id,
            type: isScheduledEvent ? "EVENT_REMINDER" : "AI_CONTENT_READY",
            title: notifTitle,
            body: notifBody,
            link: notifLink,
            dedupeKey: `generated-content:${automation.id}:${automation.nextRunAt ?? draft.id}`,
            data: isScheduledEvent
              ? { automationId: automation.id, eventId: automation.eventId }
              : { draftId: draft.id, automationId: automation.id, channelTypes: action.channels ?? [] },
          });
          await Promise.allSettled(
            notifiedUsers.map((user) => notifyUser(supabase, user.id, { title: notifTitle, body: notifBody, link: notifLink }))
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
    Envoyé via <strong>EasyCom IA</strong> · Communication communautaire assistée par IA
  </div>
</body>
</html>`;

            await resend.emails.send({
              from: process.env.EMAIL_FROM ?? `${automation.community.name} <noreply@easycom-ai.com>`,
              to: toEmails,
              subject: action.emailSubject || "Message important de votre communauté",
              html: formattedContent,
            });
            console.log(`[Automation] Email envoyé avec succès via Resend à ${toEmails.length} destinataires.`);
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
          const notifTitle = action.notificationTitle || "Rappel automatique";
          const notifBody = action.notificationBody || "Une automatisation s'est déclenchée.";
          const notifiedUsers = await insertAutomationNotificationsOnce(supabase, notifyUsers, {
            communityId: automation.community.id,
            type: "AUTOMATION_TRIGGERED",
            title: notifTitle,
            body: notifBody,
            link: "/dashboard",
            dedupeKey: `create-notification:${automation.id}:${automation.nextRunAt ?? new Date().toISOString()}:${notifTitle}:${notifBody}`,
            data: { automationId: automation.id },
          });
          // Email + push (scénario « app fermée »)
          await Promise.allSettled(
            notifiedUsers.map((user) => notifyUser(supabase, user.id, { title: notifTitle, body: notifBody, link: "/dashboard" }))
          );
        }
        break;
      }
    }
  }
}

function computeNextRunAt(automation: Automation, now: Date): Date | null {
  const config = (automation.triggerConfig ?? {}) as Record<string, unknown>;

  // Campagne J-10/J-5 : prochain rappel non encore publié (ou rien si terminé).
  const campaign = getCampaignFromTriggerConfig(config);
  if (campaign) {
    return getNextPendingReminder(campaign)?.runAt ?? null;
  }

  // Récap après événement : exécution quotidienne à l'heure de notification.
  const recapSettings = getRecapSettingsFromTriggerConfig(config);
  if (recapSettings) {
    return recapSettings.status === "active" ? nextDailyRunAt(recapSettings, now) : null;
  }

  // Cette semaine en images : prochaine occurrence hebdomadaire.
  const weeklyImagesSettings = getWeeklyImagesSettings(config);
  if (weeklyImagesSettings) {
    return weeklyImagesSettings.status === "active" ? nextWeeklyImagesRunAt(weeklyImagesSettings, now) : null;
  }

  const hayomYomSettings = getHayomYomSettings(config);
  if (hayomYomSettings) {
    return hayomYomSettings.status === "active" ? nextHayomYomRunAt(hayomYomSettings, now) : null;
  }

  // Programme & récap du mois : prochaine occurrence (programme ou récap).
  const monthlySettings = getMonthlySettings(config);
  if (monthlySettings) {
    if (monthlySettings.status !== "active") return null;
    const tz = monthlySettings.timezone || "Europe/Paris";
    return getNextMonthlyRun(monthlySettings, now, tz)?.runAt ?? null;
  }

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
