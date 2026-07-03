import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyEmailsWithAi } from "@/lib/email/classify-ai";
import {
  dedupeClassifications,
  formatDayKeyInTimezone,
  formatTimeInTimezone,
  getEmailAiState,
  isSameLocalDay,
  withEmailAiState,
} from "@/lib/email/ai-settings";
import { fetchGmailMessages, type GmailFetchedMessage } from "@/lib/email/gmail-fetch";
import { notifyForMatchingEmailRules } from "@/lib/email/email-alerts";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  emails?: GmailFetchedMessage[];
  trigger?: "manual" | "page_open" | "daily_16h";
  timezone?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();
  if (!profile?.communityId) {
    return NextResponse.json({ error: "Communaute introuvable" }, { status: 400 });
  }

  let payload: RequestBody = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const { data: channel } = await admin
    .from("Channel")
    .select("id, isConnected, refreshToken, settings")
    .eq("communityId", profile.communityId)
    .eq("type", "EMAIL")
    .maybeSingle();

  if (!channel?.isConnected || !channel.refreshToken) {
    return NextResponse.json({ error: "Google Email non connecte" }, { status: 400 });
  }

  const { data: community } = await admin
    .from("Community")
    .select("timezone")
    .eq("id", profile.communityId)
    .single();

  const timezone = payload.timezone || community?.timezone || "Europe/Paris";
  const now = new Date();
  const dayKey = formatDayKeyInTimezone(now, timezone);
  const trigger = payload.trigger ?? "manual";

  const state = getEmailAiState(channel.settings);
  const alreadyRanToday = state.lastOpenClassificationDayByUser[user.id] === dayKey;
  if (trigger === "page_open" && alreadyRanToday && state.classifications.length > 0) {
    return NextResponse.json({
      classifications: state.classifications,
      lastClassifiedAt: state.lastClassifiedAt,
      skippedRecent: true,
    });
  }

  let emails: GmailFetchedMessage[] = [];
  let syncError: string | null = null;
  try {
    emails =
      Array.isArray(payload.emails) && payload.emails.length > 0
        ? payload.emails
        : await fetchGmailMessages(channel.refreshToken, 15);
  } catch (error) {
    console.error("[Email Classify] Gmail fetch error:", error);
    syncError =
      "Connexion Google Email invalide. Verifiez GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET, puis reconnectez Gmail.";
  }

  if (syncError) {
    return NextResponse.json({
      classifications: state.classifications,
      lastClassifiedAt: state.lastClassifiedAt,
      skippedRecent: true,
      syncError,
    });
  }

  const classifications = await classifyEmailsWithAi(emails);
  const activeRules = state.rules.filter((rule) => rule.userId === user.id && rule.status === "ACTIVE");
  const notification =
    activeRules.length > 0
      ? await notifyForMatchingEmailRules({
          admin,
          userId: user.id,
          communityId: profile.communityId,
          classifications,
          rules: activeRules,
          now,
          source: trigger,
        })
      : { matchedCount: 0, notificationSent: false };
  const nextState = {
    ...state,
    classifications: dedupeClassifications(classifications),
    lastClassifiedAt: now.toISOString(),
    lastOpenClassificationDayByUser:
      trigger === "page_open"
        ? { ...state.lastOpenClassificationDayByUser, [user.id]: dayKey }
        : state.lastOpenClassificationDayByUser,
    dailyRuns: [
      ...state.dailyRuns.filter((run) => !(run.userId === user.id && run.source === trigger && isSameLocalDay(run.createdAt, timezone, now))),
      {
        id: crypto.randomUUID(),
        userId: user.id,
        runDate: dayKey,
        runTime: formatTimeInTimezone(now, timezone),
        timezone,
        status: "SUCCESS" as const,
        emailsChecked: emails.length,
        emailsClassified: classifications.length,
        rulesTriggered: notification.matchedCount,
        notificationSent: notification.notificationSent,
        source:
          trigger === "daily_16h"
            ? "daily_16h"
            : "page_open",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ].slice(-120),
  };

  const { error } = await admin
    .from("Channel")
    .update({
      settings: withEmailAiState(channel.settings, nextState),
      lastSyncAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })
    .eq("id", channel.id);

  if (error) {
    console.error("[Email Classify] Save error:", error);
    return NextResponse.json({ error: "Impossible d'enregistrer la classification." }, { status: 500 });
  }

  return NextResponse.json({
    classifications: nextState.classifications,
    lastClassifiedAt: nextState.lastClassifiedAt,
    skippedRecent: false,
  });
}
