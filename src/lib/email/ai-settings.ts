import type { Json } from "@/types/database.types";

export type EmailCategory = "urgent" | "important" | "non_important";

export interface EmailAiClassification {
  id: string;
  threadId?: string | null;
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  date: string;
  timestamp: number;
  read: boolean;
  hasAttachment: boolean;
  category: EmailCategory;
  urgencyScore: number;
  classificationReason: string;
  actionRecommended: string | null;
  suggestedReply: string | null;
  classifiedAt: string;
}

export interface EmailNotificationRule {
  id: string;
  userId: string;
  name: string;
  status: "ACTIVE" | "DISABLED";
  conditions: {
    senderEmail?: string | null;
    senderDomain?: string | null;
    subjectKeywords?: string[];
    bodyKeywords?: string[];
    hasAttachment?: boolean;
    categories?: EmailCategory[];
    unansweredSinceDays?: number | null;
    excludeNewsletters?: boolean;
    customPrompt?: string | null;
  };
  notificationChannel: "browser_push";
  createdByAi: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAiDailyRun {
  id: string;
  userId: string;
  runDate: string;
  runTime: string;
  timezone: string;
  status: "SUCCESS" | "SKIPPED" | "FAILED";
  emailsChecked: number;
  emailsClassified: number;
  rulesTriggered: number;
  notificationSent: boolean;
  source: "page_open" | "daily_16h";
  createdAt: string;
  updatedAt: string;
}

export interface EmailAiState {
  classifications: EmailAiClassification[];
  rules: EmailNotificationRule[];
  dailyRuns: EmailAiDailyRun[];
  lastOpenClassificationDayByUser: Record<string, string>;
  lastClassifiedAt: string | null;
}

const EMPTY_STATE: EmailAiState = {
  classifications: [],
  rules: [],
  dailyRuns: [],
  lastOpenClassificationDayByUser: {},
  lastClassifiedAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function getEmailAiState(settings: Json | null | undefined): EmailAiState {
  if (!isRecord(settings) || !isRecord(settings.emailAi)) {
    return EMPTY_STATE;
  }

  const emailAi = settings.emailAi as Record<string, unknown>;
  return {
    classifications: Array.isArray(emailAi.classifications)
      ? (emailAi.classifications as EmailAiClassification[])
      : [],
    rules: Array.isArray(emailAi.rules) ? (emailAi.rules as EmailNotificationRule[]) : [],
    dailyRuns: Array.isArray(emailAi.dailyRuns) ? (emailAi.dailyRuns as EmailAiDailyRun[]) : [],
    lastOpenClassificationDayByUser: isRecord(emailAi.lastOpenClassificationDayByUser)
      ? (emailAi.lastOpenClassificationDayByUser as Record<string, string>)
      : {},
    lastClassifiedAt: typeof emailAi.lastClassifiedAt === "string" ? emailAi.lastClassifiedAt : null,
  };
}

export function withEmailAiState(settings: Json | null | undefined, state: EmailAiState): Json {
  const base = isRecord(settings) ? { ...settings } : {};
  return {
    ...base,
    emailAi: {
      classifications: state.classifications,
      rules: state.rules,
      dailyRuns: state.dailyRuns.slice(-120),
      lastOpenClassificationDayByUser: state.lastOpenClassificationDayByUser,
      lastClassifiedAt: state.lastClassifiedAt,
    },
  } as Json;
}

export function formatDayKeyInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatTimeInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function isSameLocalDay(dateIso: string | null | undefined, timezone: string, now = new Date()) {
  if (!dateIso) return false;
  return formatDayKeyInTimezone(new Date(dateIso), timezone) === formatDayKeyInTimezone(now, timezone);
}

export function dedupeClassifications(items: EmailAiClassification[]) {
  const map = new Map<string, EmailAiClassification>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
}
