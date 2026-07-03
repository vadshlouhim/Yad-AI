import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEmailsWithAi } from "@/lib/email/classify-ai";
import {
  dedupeClassifications,
  formatDayKeyInTimezone,
  formatTimeInTimezone,
  getEmailAiState,
  isSameLocalDay,
  type EmailNotificationRule,
} from "@/lib/email/ai-settings";
import { fetchGmailMessages } from "@/lib/email/gmail-fetch";
import { withEmailAiState } from "@/lib/email/ai-settings";
import { notifyForMatchingEmailRules, ruleMatchesEmail } from "@/lib/email/email-alerts";

function isDailyNotificationWindow(now: Date, timezone: string) {
  const time = formatTimeInTimezone(now, timezone);
  const [hour, minute] = time.split(":").map(Number);
  return hour === 16 && minute < 15;
}

export async function runDailyEmailAiClassification() {
  const admin = createAdminClient();
  const now = new Date();

  const { data: channels } = await admin
    .from("Channel")
    .select("id, communityId, settings, refreshToken, isConnected, handle")
    .eq("type", "EMAIL")
    .eq("isConnected", true);

  for (const channel of channels ?? []) {
    if (!channel.refreshToken || !channel.isConnected) continue;

    const { data: community } = await admin
      .from("Community")
      .select("timezone")
      .eq("id", channel.communityId)
      .single();

    const timezone = community?.timezone || "Europe/Paris";
    if (!isDailyNotificationWindow(now, timezone)) continue;

    const state = getEmailAiState(channel.settings);
    const activeRules = state.rules.filter((rule) => rule.status === "ACTIVE");
    if (activeRules.length === 0) continue;

    let emails;
    try {
      emails = await fetchGmailMessages(channel.refreshToken, 15);
    } catch (error) {
      console.error("[Email Daily AI] Gmail fetch error:", error);
      continue;
    }
    const classifications = await classifyEmailsWithAi(emails);
    const nextClassifications = dedupeClassifications(classifications);

    const rulesByUser = new Map<string, EmailNotificationRule[]>();
    for (const rule of activeRules) {
      const list = rulesByUser.get(rule.userId) ?? [];
      list.push(rule);
      rulesByUser.set(rule.userId, list);
    }

    const runEntries = [...state.dailyRuns];

    for (const [userId, rules] of rulesByUser) {
      if (runEntries.some((run) => run.userId === userId && run.source === "daily_16h" && isSameLocalDay(run.createdAt, timezone, now))) {
        continue;
      }

      const matched = nextClassifications.filter((email) => rules.some((rule) => ruleMatchesEmail(rule, email, now)));
      const notification = await notifyForMatchingEmailRules({
        admin,
        userId,
        communityId: channel.communityId,
        classifications: nextClassifications,
        rules,
        now,
        source: "daily_16h",
      });

      runEntries.push({
        id: crypto.randomUUID(),
        userId,
        runDate: formatDayKeyInTimezone(now, timezone),
        runTime: formatTimeInTimezone(now, timezone),
        timezone,
        status: "SUCCESS",
        emailsChecked: emails.length,
        emailsClassified: nextClassifications.length,
        rulesTriggered: matched.length,
        notificationSent: notification.notificationSent,
        source: "daily_16h",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    await admin
      .from("Channel")
      .update({
        settings: withEmailAiState(channel.settings, {
          ...state,
          classifications: nextClassifications,
          dailyRuns: runEntries.slice(-120),
          lastClassifiedAt: now.toISOString(),
        }),
        lastSyncAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      .eq("id", channel.id);
  }
}
