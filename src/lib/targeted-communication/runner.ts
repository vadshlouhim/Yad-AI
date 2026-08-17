import "server-only";

import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJewishHolidays } from "@/lib/automation/hebcal";
import { sendWhatsAppMessages } from "@/lib/whatsapp/send";
import { targetedDb } from "./auth";
import { computeNextTargetedRun, formatTargetedMessage, getSchoolHolidayState } from "./core";

type Row = Record<string, unknown>;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function exclusionReason(automation: Row, scheduledFor: Date, timezone: string) {
  const dateISO = formatInTimeZone(scheduledFor, timezone, "yyyy-MM-dd");
  const holidays = await getJewishHolidays({ year: Number(dateISO.slice(0, 4)) });
  const today = holidays.filter((holiday) => holiday.date.slice(0, 10) === dateISO);
  const holHamoed = today.some((holiday) => {
    const text = normalize(`${holiday.name} ${holiday.subcat ?? ""}`);
    return text.includes("hol hamoed") || text.includes("chol hamoed");
  });
  if (automation.skipHolHamoed && holHamoed) return "‘Hol Hamoed";
  if (automation.skipYomTov && today.length > 0 && !holHamoed) return "Yom Tov";
  if (automation.skipSchoolHolidays) {
    const school = await getSchoolHolidayState(scheduledFor, String(automation.schoolZone ?? "C"));
    if (!school.reliable) return "Calendrier des vacances scolaires indisponible";
    if (school.holiday) return "Vacances scolaires";
  }
  return null;
}

async function advanceAutomation(db: ReturnType<typeof targetedDb>, automation: Row, scheduledFor: Date, error: string | null = null) {
  const community = automation.community as Row;
  const nextRunAt = computeNextTargetedRun({
    weekday: Number(automation.weekday),
    sendTime: String(automation.sendTime),
    timezone: String(community.timezone ?? "Europe/Paris"),
    after: new Date(scheduledFor.getTime() + 1_000),
  });
  await db.from("TargetedAutomation").update({
    nextRunAt: nextRunAt.toISOString(),
    lastRunAt: scheduledFor.toISOString(),
    lastError: error,
    updatedAt: new Date().toISOString(),
  }).eq("id", String(automation.id));
}

async function notifyValidation(db: ReturnType<typeof targetedDb>, automation: Row, occurrenceId: string) {
  const { data: users } = await db.from("profiles").select("id").eq("communityId", String(automation.communityId));
  if (!users?.length) return;
  await db.from("Notification").insert((users as Array<{ id: string }>).map((user) => ({
    id: crypto.randomUUID(),
    userId: user.id,
    communityId: String(automation.communityId),
    type: "AUTOMATION_TRIGGERED",
    title: "Envoi ciblé à valider",
    body: `${String(automation.name)} est prêt. Validez l’envoi depuis Communication ciblée.`,
    link: "/dashboard/communication-ciblee",
    isRead: false,
    data: { targetedAutomationId: automation.id, occurrenceId },
  })));
}

async function sendInBatches<T>(items: T[], send: (item: T) => Promise<boolean>) {
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < items.length; index += 5) {
    const results = await Promise.all(items.slice(index, index + 5).map(send));
    sent += results.filter(Boolean).length;
    failed += results.filter((result) => !result).length;
  }
  return { sent, failed };
}

export async function sendTargetedOccurrence(params: { automationId: string; occurrenceId: string; forceApproved?: boolean }) {
  const admin = createAdminClient();
  const db = targetedDb(admin);
  const [{ data: automationData }, { data: occurrenceData }] = await Promise.all([
    db.from("TargetedAutomation").select("*,community:Community(id,name,address,timezone),category:TargetedCategory(id,name,isActive)").eq("id", params.automationId).maybeSingle(),
    db.from("TargetedOccurrence").select("*").eq("id", params.occurrenceId).eq("automationId", params.automationId).maybeSingle(),
  ]);
  if (!automationData || !occurrenceData) return { success: false, error: "Occurrence introuvable." };
  const automation = automationData as unknown as Row;
  const occurrence = occurrenceData as unknown as Row;
  if (["CANCELED", "SENT", "SKIPPED"].includes(String(occurrence.status))) return { success: false, error: "Cette occurrence ne peut plus être envoyée." };
  if (automation.mode === "CONFIRM" && !params.forceApproved) return { success: false, error: "Une validation est requise." };
  const category = automation.category as Row;
  if (category.isActive === false) return { success: false, error: "La catégorie est désactivée." };

  const { data: subscriptions } = await db.from("TargetedSubscription")
    .select("member:CommunityMember(id,firstName,lastName,phone,optInWhatsapp)")
    .eq("categoryId", String(automation.categoryId));
  const members = ((subscriptions ?? []) as unknown as Array<{ member: { firstName: string | null; lastName: string | null; phone: string | null; optInWhatsapp: boolean } | null }>)
    .map((subscription) => subscription.member)
    .filter((member): member is NonNullable<typeof member> => Boolean(member?.phone && member.optInWhatsapp));
  const community = automation.community as Row;
  const scheduledFor = new Date(String(occurrence.scheduledFor));
  const template = String(occurrence.messageOverride ?? automation.message);
  const eventTime = String(occurrence.eventTimeOverride ?? automation.eventTime ?? "") || null;
  const result = await sendInBatches(members, async (member) => {
    const message = formatTargetedMessage({
      template,
      firstName: member.firstName,
      lastName: member.lastName,
      eventName: String(automation.eventName ?? automation.name),
      scheduledFor,
      timezone: String(community.timezone ?? "Europe/Paris"),
      eventTime,
      address: String(automation.address ?? community.address ?? ""),
      link: String(automation.link ?? ""),
    });
    const sent = await sendWhatsAppMessages({ communityId: String(automation.communityId), phones: [member.phone!], text: message, admin });
    return sent.sent === 1;
  });
  const success = result.failed === 0;
  const error = success ? null : `${result.failed} envoi(s) ont échoué.`;
  await db.from("TargetedOccurrence").update({
    status: success ? "SENT" : "FAILED",
    error,
    processedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).eq("id", params.occurrenceId);
  await db.from("TargetedAutomation").update({ lastError: error, updatedAt: new Date().toISOString() }).eq("id", params.automationId);
  return { success, ...result, total: members.length, error };
}

async function processTargetedAutomation(db: ReturnType<typeof targetedDb>, automation: Row) {
  const scheduledFor = new Date(String(automation.nextRunAt));
  const now = new Date().toISOString();
  const { data: upserted } = await db.from("TargetedOccurrence").upsert({
    id: crypto.randomUUID(),
    automationId: String(automation.id),
    scheduledFor: scheduledFor.toISOString(),
    status: "PENDING",
    updatedAt: now,
  }, { onConflict: "automationId,scheduledFor", ignoreDuplicates: true }).select().maybeSingle();
  let occurrence = upserted as unknown as Row | null;
  if (!occurrence) {
    const { data } = await db.from("TargetedOccurrence").select("*").eq("automationId", String(automation.id)).eq("scheduledFor", scheduledFor.toISOString()).maybeSingle();
    occurrence = data as unknown as Row | null;
  }
  if (!occurrence) return;
  if (String(occurrence.status) === "CANCELED") {
    await advanceAutomation(db, automation, scheduledFor);
    return;
  }
  const reason = await exclusionReason(automation, scheduledFor, String((automation.community as Row).timezone ?? "Europe/Paris"));
  if (reason) {
    await db.from("TargetedOccurrence").update({ status: "SKIPPED", error: reason, processedAt: now, updatedAt: now }).eq("id", String(occurrence.id));
    await advanceAutomation(db, automation, scheduledFor, reason);
    return;
  }
  if (automation.mode === "CONFIRM") {
    await db.from("TargetedOccurrence").update({ status: "AWAITING_VALIDATION", updatedAt: now }).eq("id", String(occurrence.id));
    await notifyValidation(db, automation, String(occurrence.id));
    await advanceAutomation(db, automation, scheduledFor);
    return;
  }
  const result = await sendTargetedOccurrence({ automationId: String(automation.id), occurrenceId: String(occurrence.id), forceApproved: true });
  await advanceAutomation(db, automation, scheduledFor, result.success ? null : result.error ?? "Échec de l’envoi ciblé");
}

export async function runTargetedCommunication() {
  const admin = createAdminClient();
  const db = targetedDb(admin);
  const { data, error } = await db.from("TargetedAutomation")
    .select("*,community:Community(id,name,address,timezone),category:TargetedCategory(id,name,isActive)")
    .eq("isActive", true)
    .lte("nextRunAt", new Date().toISOString())
    .limit(25);
  if (error) throw error;
  for (const automation of (data ?? []) as unknown as Row[]) {
    if ((automation.category as Row | null)?.isActive === false) {
      await advanceAutomation(db, automation, new Date(String(automation.nextRunAt)), "Catégorie désactivée");
      continue;
    }
    await processTargetedAutomation(db, automation);
  }
  return { processed: data?.length ?? 0 };
}
