"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommunityProfileDisplayLabel, getCommunityProfileLabel } from "@/lib/community/profile-labels";
import { GENERAL_DEFAULT_PUBLICATION_CATEGORY, isDefaultAutomationPublicationId } from "@/lib/automation/suggested-publications";
import {
  Zap, Plus, Play, Pause, Clock, CheckCircle, XCircle,
  AlertCircle, Calendar, RefreshCw, Settings, Trash2, X, Save,
} from "lucide-react";
import { formatRelative, cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import type { BillingConfig } from "@/lib/billing";

interface AutomationRun {
  id: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  automation: { name: string };
}

interface AutomationAction {
  type: string;
  contentType?: string;
  channels?: string[];
  requiresValidation?: boolean;
}

interface AutomationPreset {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  trigger: string;
  triggerConfig: Record<string, unknown> | null;
  actions: AutomationAction[] | null;
  category: string;
  clientTypes?: string[];
  sortOrder?: number;
}

interface Automation {
  id: string;
  presetId?: string | null;
  eventId?: string | null;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  status: string;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  triggerConfig: Record<string, unknown> | null;
  actions: AutomationAction[] | null;
  createdAt: Date;
  event: { title: string; startDate: Date } | null;
  runs: AutomationRun[];
}

interface Props {
  automations: Automation[];
  presets?: AutomationPreset[];
  recentRuns: AutomationRun[];
  embedded?: boolean;
  requiresValidationDefault?: boolean;
  communityType?: string;
  profileLabel?: string;
  billingConfig: BillingConfig;
}

interface AutomationFormState {
  id: string | null;
  presetId: string | null;
  name: string;
  description: string;
  trigger: string;
  repeat: "none" | "daily" | "weekly" | "monthly" | "custom";
  time: string;
  date: string;
  day: string;
  customDays: string[];
  daysBefore: string;
  contentType: string;
  channels: string[];
  message: string;
  requiresValidation: boolean;
  isActive: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  WEEKLY_SHABBAT: "ðŸ•¯ï¸ Chabbat hebdomadaire",
  JEWISH_HOLIDAY: "✨ Fête juive",
  BEFORE_EVENT: "â° Avant un événement",
  EVENT_DAY: "ðŸ“… Jour de l'événement",
  AFTER_EVENT: "ðŸ“‹ Après un événement",
  DAILY: "ðŸŒ… Quotidien",
  CUSTOM_SCHEDULE: "âš™ï¸ Planning personnalisé",
  MANUAL: "ðŸ‘† Manuel",
};

const CHANNEL_OPTIONS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "EMAIL"];
const SOCIAL_LOGOS: Record<string, React.ReactNode> = {
  WHATSAPP: (
    <svg className="size-4.5 fill-[#25D366]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.42 9.863-9.864.002-2.634-1.02-5.11-2.881-6.974C16.592 1.897 14.1 1.87 11.999 1.87c-5.439 0-9.861 4.421-9.865 9.867-.001 1.733.46 3.424 1.336 4.921l-.988 3.597 3.7-.978zM17.15 14.5c-.282-.141-1.67-.824-1.928-.918-.258-.095-.447-.141-.636.141-.189.282-.731.918-.897 1.107-.166.189-.333.213-.615.072-1.048-.523-1.83-.984-2.525-2.18-.184-.316.184-.294.526-.976.059-.118.03-.222-.015-.316-.045-.094-.447-1.077-.612-1.472-.16-.388-.323-.336-.447-.342-.116-.006-.25-.007-.386-.007-.136 0-.356.05-.543.254-.187.204-.714.698-.714 1.701 0 1.004.73 1.976.832 2.113.102.136 1.436 2.193 3.48 3.076.486.209.866.335 1.161.429.489.156.935.134 1.286.082.392-.058 1.205-.493 1.376-.97.171-.476.171-.885.12-.97-.051-.085-.19-.136-.472-.277z"/>
    </svg>
  ),
  INSTAGRAM: (
    <svg className="size-4.5 stroke-[2] fill-none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="url(#ig-grad-auto)">
      <defs>
        <linearGradient id="ig-grad-auto" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  FACEBOOK: (
    <svg className="size-4.5 fill-[#1877F2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
    </svg>
  ),
  TELEGRAM: (
    <svg className="size-4.5 fill-[#0088cc]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.422 1.32a1.328 1.328 0 00-1.284-.092L1.51 9.074a1.31 1.31 0 00-.142 2.378L5.91 13.53l12.44-8.082c.162-.105.352.12.214.258l-10.156 10.19-.364 5.342c.036.56.326.83.676.83a1.18 1.18 0 00.866-.396l2.544-2.456 5.27 3.882c.974.536 2.03-.024 2.226-1.156l2.946-13.886a1.324 1.324 0 00-.746-1.368z"/>
    </svg>
  ),
  EMAIL: (
    <svg className="size-4.5 stroke-[#EA4335] fill-none stroke-[2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
};

// Kept while older embedded automation UI is phased out.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_AUTOMATION_DESCRIPTION =
  "Vous recevrez une notification et vous pourrez publier automatiquement en un clic sur vos réseaux.";
const DAY_OPTIONS = [
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "saturday", label: "Samedi" },
  { value: "sunday", label: "Dimanche" },
];

const REPEAT_OPTIONS: Array<{ value: AutomationFormState["repeat"]; label: string }> = [
  { value: "none", label: "Une seule fois" },
  { value: "daily", label: "Chaque jour" },
  { value: "weekly", label: "Chaque semaine" },
  { value: "monthly", label: "Chaque mois" },
  { value: "custom", label: "Jours personnalisés" },
];

interface PredefinedAutomationCard {
  key: string;
  presetId?: string;
  label: string;
  description: string;
  emoji: string;
  category?: string;
  status: "preset" | "configurable" | "coming_soon";
  trigger?: string;
  triggerConfig?: Record<string, unknown>;
  contentType?: string;
  requiresValidation?: boolean;
  channels?: string[];
  time?: string;
  day?: string;
  assistantMessage?: string;
  aiInstruction?: string;
}

type AssistantStatus = "idle" | "creating" | "created" | "error";

interface AssistantMessage {
  role: "assistant" | "user";
  text: string;
}

type SuggestedCard = PredefinedAutomationCard & { matchingAutomation?: Automation };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PREDEFINED_AUTOMATIONS: PredefinedAutomationCard[] = [
  {
    key: "shabbat-times",
    label: "Horaires de Chabbat",
    description: "Publication hebdomadaire des horaires avec activation rapide.",
    emoji: "ðŸ•¯ï¸",
    status: "preset",
    trigger: "WEEKLY_SHABBAT",
    contentType: "GENERAL",
    channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
    time: "10:00",
  },
  {
    key: "activities",
    label: "Activités",
    description: "Préparez des annonces régulières pour vos événements et activités.",
    emoji: "ðŸ“…",
    status: "configurable",
    trigger: "CUSTOM_SCHEDULE",
    contentType: "GENERAL",
    channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
    day: "thursday",
    time: "18:00",
  },
  {
    key: "reminder-j10",
    label: "Rappels J-10",
    description: "Structure visuelle prête pour les rappels avant événement.",
    emoji: "â³",
    status: "coming_soon",
  },
  {
    key: "reminder-j5",
    label: "Rappels J-5",
    description: "Bloc prêt à connecter à une logique de rappels plus fine.",
    emoji: "ðŸ””",
    status: "coming_soon",
  },
  {
    key: "regular-courses",
    label: "Cours réguliers",
    description: "Planifiez vos cours récurrents avec une fréquence personnalisable.",
    emoji: "ðŸ“˜",
    status: "configurable",
    trigger: "CUSTOM_SCHEDULE",
    contentType: "COURSE_ANNOUNCEMENT",
    channels: ["WHATSAPP", "TELEGRAM", "EMAIL"],
    day: "wednesday",
    time: "20:00",
  },
  {
    key: "scheduled-posts",
    label: "Publications programmées",
    description: "Préparez à l'avance vos publications à heure fixe.",
    emoji: "ðŸ—“ï¸",
    status: "configurable",
    trigger: "CUSTOM_SCHEDULE",
    contentType: "GENERAL",
    channels: ["INSTAGRAM", "FACEBOOK", "EMAIL"],
    day: "monday",
    time: "09:00",
  },
  {
    key: "auto-messages",
    label: "Messages automatiques",
    description: "Diffusez automatiquement un message ou une pensée du jour.",
    emoji: "ðŸ’¬",
    status: "configurable",
    trigger: "DAILY",
    contentType: "DAILY_CONTENT",
    channels: ["WHATSAPP", "TELEGRAM", "EMAIL"],
    time: "08:00",
  },
  {
    key: "follow-ups",
    label: "Relances",
    description: "Carte prête pour vos relances futures sans casser l'existant.",
    emoji: "ðŸ“¨",
    status: "coming_soon",
  },
  {
    key: "important-notifications",
    label: "Notifications importantes",
    description: "Préconfigurez vos communications urgentes ou essentielles.",
    emoji: "ðŸš¨",
    status: "configurable",
    trigger: "MANUAL",
    contentType: "COMMUNITY_NEWS",
    channels: ["EMAIL", "WHATSAPP", "TELEGRAM"],
  },
];

const RUN_STATUS_ICON: Record<string, React.ReactNode> = {
  RUNNING: <RefreshCw className="size-3.5 text-blue-600 animate-spin" />,
  SUCCESS: <CheckCircle className="size-3.5 text-blue-600" />,
  PARTIAL_SUCCESS: <AlertCircle className="size-3.5 text-amber-600" />,
  FAILED: <XCircle className="size-3.5 text-red-600" />,
  SKIPPED: <Clock className="size-3.5 text-slate-400" />,
};

const RUN_STATUS_VARIANT: Record<string, "draft" | "info" | "ready" | "published" | "scheduled" | "failed"> = {
  RUNNING: "info",
  SUCCESS: "published",
  PARTIAL_SUCCESS: "ready",
  FAILED: "failed",
  SKIPPED: "draft",
};

function defaultForm(requiresValidation = true): AutomationFormState {
  const defaultSendAt = new Date(Date.now() + 5 * 60 * 1000);
  return {
    id: null,
    presetId: null,
    name: "Nouvelle automatisation",
    description: "",
    trigger: "CUSTOM_SCHEDULE",
    repeat: "none",
    time: formatTimeInput(defaultSendAt),
    date: formatDateInput(defaultSendAt),
    day: "friday",
    customDays: [],
    daysBefore: "2",
    contentType: "GENERAL",
    channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
    message: "",
    requiresValidation,
    isActive: true,
  };
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function buildNextRunAt(form: AutomationFormState) {
  if (!form.date || !form.time || form.trigger === "MANUAL") return null;
  const nextRun = new Date(`${form.date}T${form.time}:00`);
  if (Number.isNaN(nextRun.getTime())) return null;
  return nextRun.toISOString();
}

function getGenerateAction(automation: Automation): AutomationAction | null {
  return automation.actions?.find((action) => action.type === "GENERATE_CONTENT") ?? null;
}

function getValidationAction(automation: Automation): AutomationAction | null {
  return automation.actions?.find((action) => action.type === "CREATE_PUBLICATION") ?? null;
}

function formFromAutomation(automation: Automation): AutomationFormState {
  const config = automation.triggerConfig ?? {};
  const generateAction = getGenerateAction(automation);
  const validationAction = getValidationAction(automation);
  const nextRunAt = automation.nextRunAt ? new Date(automation.nextRunAt) : null;
  const hasValidNextRunAt = nextRunAt !== null && !Number.isNaN(nextRunAt.getTime());
  const repeat: AutomationFormState["repeat"] = (() => {
    if (automation.trigger === "DAILY") return "daily";
    if (automation.trigger === "CUSTOM_SCHEDULE") {
      const value = String(config.repeat ?? "").toLowerCase();
      if (value === "weekly") return "weekly";
      if (value === "monthly") return "monthly";
      if (value === "custom") return "custom";
    }
    return "none";
  })();
  return {
    id: automation.id,
    presetId: automation.presetId ?? null,
    name: automation.name,
    description: automation.description ?? "",
    trigger: automation.trigger,
    repeat,
    time: hasValidNextRunAt ? formatTimeInput(nextRunAt) : String(config.time ?? "10:00"),
    date: hasValidNextRunAt ? formatDateInput(nextRunAt) : typeof config.date === "string" ? config.date : "",
    day: String(config.day ?? "friday"),
    customDays: Array.isArray(config.days) ? config.days.map((entry) => String(entry)) : [],
    daysBefore: String(config.daysBefore ?? config.daysBeforeHoliday ?? 1),
    contentType: generateAction?.contentType ?? "GENERAL",
    channels: (generateAction?.channels ?? []).filter((channel) => CHANNEL_OPTIONS.includes(channel)),
    message: typeof config.message === "string" ? config.message : "",
    requiresValidation: validationAction?.requiresValidation ?? true,
    isActive: automation.isActive,
  };
}

function buildTriggerConfig(form: AutomationFormState) {
  const baseConfig = {
    eventTitle: form.name.trim(),
    time: form.time,
    date: form.date || null,
    message: form.message.trim() || null,
  };
  if (form.trigger === "DAILY") return baseConfig;
  if (form.trigger === "BEFORE_EVENT") return { ...baseConfig, daysBefore: Number(form.daysBefore) || 1 };
  if (form.trigger === "AFTER_EVENT") return { ...baseConfig, daysAfter: Number(form.daysBefore) || 1 };
  if (form.trigger === "EVENT_DAY") return baseConfig;
  if (form.trigger === "WEEKLY_SHABBAT") return { ...baseConfig, day: "friday", dayOfWeek: 5, daysBefore: Number(form.daysBefore) || 1 };
  if (form.trigger === "JEWISH_HOLIDAY") return { ...baseConfig, daysBeforeHoliday: Number(form.daysBefore) || 1 };
  if (form.trigger === "CUSTOM_SCHEDULE") {
    return {
      ...baseConfig,
      repeat: form.repeat,
      day: form.day,
      days: form.customDays,
      dayOfMonth: form.date ? new Date(form.date).getDate() : null,
    };
  }
  return {};
}

const INVALID_PROFILE_LABELS = new Set([
  "",
  "OTHER",
  "STRUCTURE",
  "PROFIL",
  "PROFILS",
  "PROFIL UTILISATEUR",
  "PROFILS UTILISATEUR",
  "AUTRE PROFIL",
  "AUTRES PROFILS",
  "VOTRE PROFIL",
]);

function normalizeProfileLabel(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DAY_LABELS: Record<string, string> = {
  sunday: "dimanche",
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
};

function getConfigString(config: Record<string, unknown> | null | undefined, key: string) {
  const value = config?.[key];
  return typeof value === "string" ? value : "";
}

function getConfigNumber(config: Record<string, unknown> | null | undefined, key: string) {
  const value = config?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatAssistantTime(time: string) {
  const [hours = "10", minutes = "00"] = time.split(":");
  return minutes === "00" ? `${Number(hours)}h` : `${Number(hours)}h${minutes}`;
}

function formatDayAndTime(day: string | undefined, time: string) {
  if (!day) return formatAssistantTime(time);
  const label = DAY_LABELS[day] ?? day;
  const hour = Number(time.split(":")[0] ?? 10);
  const period = hour < 12 ? " matin" : hour < 18 ? " après-midi" : " soir";
  return `${label}${period} à ${formatAssistantTime(time)}`;
}

function getCardScheduleLabel(card: PredefinedAutomationCard) {
  const config = card.triggerConfig ?? {};
  const time = (card.time ?? getConfigString(config, "time")) || "10:00";
  const day = (card.day ?? getConfigString(config, "day")) || undefined;
  const repeat = getConfigString(config, "repeat");
  const daysBefore = getConfigNumber(config, "daysBefore");
  const dayOfMonth = getConfigNumber(config, "dayOfMonth");

  if (card.trigger === "BEFORE_EVENT" && daysBefore) return `${daysBefore} jours avant à ${formatAssistantTime(time)}`;
  if (card.trigger === "AFTER_EVENT") return `juste après l'événement`;
  if (card.trigger === "EVENT_DAY") return `le matin de l'événement`;
  if (card.trigger === "DAILY" || repeat === "daily") return `chaque matin à ${formatAssistantTime(time)}`;
  if (repeat === "monthly" || dayOfMonth) return `le ${dayOfMonth ?? 15} du mois à ${formatAssistantTime(time)}`;
  if (repeat === "weekly" || day) return formatDayAndTime(day ?? "friday", time);
  return formatAssistantTime(time);
}

function getAssistantChannelsLabel(card: PredefinedAutomationCard) {
  const channels = card.channels ?? [];
  if (channels.length === 0) return "les canaux pourront être choisis plus tard";
  const labels = channels.map((channel) => {
    if (channel === "WHATSAPP") return "WhatsApp manuel";
    if (channel === "EMAIL") return "Email";
    return channel.charAt(0) + channel.slice(1).toLowerCase();
  });
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

function getAssistantMessage(card: PredefinedAutomationCard) {
  if (card.assistantMessage) return card.assistantMessage;
  return `Je vais préparer ${card.label.toLowerCase()} au bon moment. Je propose ${getCardScheduleLabel(card)}, avec ${getAssistantChannelsLabel(card)}. Ça vous convient ?`;
}

function isPositiveAssistantReply(value: string) {
  const normalized = normalizeProfileLabel(value);
  return /\b(OUI|OK|D ACCORD|DACCORD|VALID|VALIDE|PARFAIT|GO|YES)\b/.test(normalized);
}

function buildNextRunAtFromCard(card: PredefinedAutomationCard) {
  const config = card.triggerConfig ?? {};
  const time = (card.time ?? getConfigString(config, "time")) || "10:00";
  const [rawHours = "10", rawMinutes = "00"] = time.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const now = new Date();
  const next = new Date(now);
  next.setHours(Number.isFinite(hours) ? hours : 10, Number.isFinite(minutes) ? minutes : 0, 0, 0);

  const repeat = getConfigString(config, "repeat");
  const day = (card.day ?? getConfigString(config, "day")) || "";
  const dayOfMonth = getConfigNumber(config, "dayOfMonth");

  if (repeat === "monthly" || dayOfMonth) {
    next.setDate(dayOfMonth ?? 15);
    if (next <= now) next.setMonth(next.getMonth() + 1);
    return next.toISOString();
  }

  if (repeat === "weekly" || day) {
    const targetDay = DAY_INDEX[day] ?? DAY_INDEX.friday;
    const diff = (targetDay - next.getDay() + 7) % 7;
    next.setDate(next.getDate() + (diff === 0 && next <= now ? 7 : diff));
    return next.toISOString();
  }

  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

function buildAssistantTriggerConfig(card: PredefinedAutomationCard, note: string) {
  const config = card.triggerConfig ?? {};
  const time = (card.time ?? getConfigString(config, "time")) || "10:00";
  const day = (card.day ?? getConfigString(config, "day")) || undefined;
  const repeat = getConfigString(config, "repeat") || (card.trigger === "DAILY" ? "daily" : "none");

  return {
    ...config,
    eventTitle: card.label,
    time,
    day,
    repeat,
    days: day ? [day] : Array.isArray(config.days) ? config.days : [],
    message: note.trim() || null,
    notificationHoursBefore: 2,
    validationBeforeSend: true,
    assistantActivated: true,
    assistantInternalInstruction: card.aiInstruction ?? `L'utilisateur souhaite activer l'automatisation ${card.label}.`,
    assistantVisibleReply: getAssistantMessage(card),
    whatsappDeliveryMode: "manual_copy",
    whatsappAutoSend: false,
  };
}

export function AutomationsClient({ automations, presets = [], recentRuns, embedded = false, requiresValidationDefault = true, communityType = "OTHER", profileLabel: profileLabelProp, billingConfig }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toggling, setToggling] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AutomationFormState>(() => defaultForm(requiresValidationDefault));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [hiddenPresetIds, setHiddenPresetIds] = useState<string[]>([]);
  const [expandedSpecificPresets, setExpandedSpecificPresets] = useState(false);
  const [assistantCard, setAssistantCard] = useState<PredefinedAutomationCard | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantNote, setAssistantNote] = useState("");
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>("idle");
  const activeCount = automations.filter((a) => a.isActive).length;
  const profileLabelFromProps = profileLabelProp?.trim() ?? "";
  const profileLabel = (
    profileLabelFromProps && !INVALID_PROFILE_LABELS.has(normalizeProfileLabel(profileLabelFromProps))
      ? profileLabelFromProps
      : getCommunityProfileLabel(communityType, "plural") || getCommunityProfileDisplayLabel(communityType)
  ).trim();
  const dynamicPresetCards: PredefinedAutomationCard[] = presets.map((preset) => {
    const generateAction = getGenerateAction({ actions: preset.actions } as Automation);
    const config = preset.triggerConfig ?? {};
    return {
      key: preset.id,
      presetId: isDefaultAutomationPublicationId(preset.id) ? undefined : preset.id,
      label: preset.title,
      description: preset.description ?? "Automatisation prédéfinie par l'admin global.",
      emoji: preset.icon ?? "âš¡",
      category: preset.category,
      status: "configurable",
      trigger: preset.trigger,
      triggerConfig: preset.triggerConfig ?? {},
      contentType: generateAction?.contentType,
      channels: generateAction?.channels,
      time: typeof config.time === "string" ? config.time : undefined,
      day: typeof config.day === "string" ? config.day : undefined,
      assistantMessage: typeof config.assistantMessage === "string" ? config.assistantMessage : undefined,
      aiInstruction: typeof config.aiInstruction === "string" ? config.aiInstruction : undefined,
    };
  });
  const predefinedCards = dynamicPresetCards.map((card) => {
    const matchingAutomation = automations.find((automation) => {
      const generateAction = getGenerateAction(automation);
      if (card.presetId && automation.presetId === card.presetId) return true;
      if (card.trigger && automation.trigger !== card.trigger) return false;
      if (card.contentType && generateAction?.contentType !== card.contentType) return false;
      return true;
    });

    return { ...card, matchingAutomation };
  });
  const visiblePresetCards = predefinedCards.filter((card) => !hiddenPresetIds.includes(card.key));
  const profilePresetCards = visiblePresetCards.filter((card) => card.category !== GENERAL_DEFAULT_PUBLICATION_CATEGORY && card.category !== "GENERAL");
  const generalPresetCards = visiblePresetCards.filter((card) => card.category === GENERAL_DEFAULT_PUBLICATION_CATEGORY || card.category === "GENERAL");
  const visibleProfilePresetCards = expandedSpecificPresets ? profilePresetCards : profilePresetCards.slice(0, 10);
  const visibleAutomations = automations;

  useEffect(() => {
    if (searchParams.get("newAutomation") !== "1") return;

    setForm(defaultForm(requiresValidationDefault));
    setFormOpen(true);
    setFeedback(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("newAutomation");
    router.replace(params.toString() ? `/dashboard/automations?${params.toString()}` : "/dashboard/automations", { scroll: false });
  }, [requiresValidationDefault, router, searchParams]);

  function IosAutomationSwitch({
    active,
    loading,
    onClick,
  }: {
    active: boolean;
    loading: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        aria-label={active ? "Desactiver l'automatisation" : "Activer l'automatisation"}
        aria-pressed={active}
        disabled={loading}
        onClick={onClick}
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 disabled:cursor-wait disabled:opacity-70",
          active ? "bg-emerald-500" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200",
            active ? "translate-x-6" : "translate-x-0"
          )}
        >
          {loading && <RefreshCw className="size-3 animate-spin text-slate-500" />}
        </span>
      </button>
    );
  }

  function openCreateForm() {
    setForm(defaultForm(requiresValidationDefault));
    setFormOpen(true);
    setFeedback(null);
  }

  function openAssistantForPublication(card: PredefinedAutomationCard) {
    setAssistantCard(card);
    setAssistantMessages([{ role: "assistant", text: getAssistantMessage(card) }]);
    setAssistantInput("");
    setAssistantNote("");
    setAssistantStatus("idle");
    setFeedback(null);
  }

  function closeAssistant() {
    setAssistantCard(null);
    setAssistantMessages([]);
    setAssistantInput("");
    setAssistantNote("");
    setAssistantStatus("idle");
  }

  async function confirmAssistantAutomation(userText = "Oui") {
    if (!assistantCard || assistantStatus === "creating" || assistantStatus === "created") return;
    setAssistantStatus("creating");
    setAssistantMessages((current) => [...current, { role: "user", text: userText }]);
    const created = await createAutomationFromCard(assistantCard, undefined, assistantNote);
    if (!created) {
      setAssistantStatus("error");
      setAssistantMessages((current) => [
        ...current,
        { role: "assistant", text: "Je n'ai pas pu l'ajouter pour l'instant. Réessayez dans un instant." },
      ]);
      return;
    }
    setAssistantStatus("created");
    setAssistantMessages((current) => [
      ...current,
      { role: "assistant", text: "C'est noté, je l'ai ajouté à votre Agenda connecté IA." },
    ]);
  }

  async function submitAssistantInput() {
    const text = assistantInput.trim();
    if (!text || !assistantCard) return;
    setAssistantInput("");

    if (isPositiveAssistantReply(text)) {
      await confirmAssistantAutomation(text);
      return;
    }

    setAssistantNote(text);
    setAssistantMessages((current) => [
      ...current,
      { role: "user", text },
      {
        role: "assistant",
        text: "Très bien, je garde cette précision. Je l'ajoute avec validation avant envoi et notification 2h avant ?",
      },
    ]);
  }

  async function hidePresetSuggestion(suggestionId: string) {
    setHiddenPresetIds((current) => [...current, suggestionId]);
    const response = await fetch(`/api/automations/presets/${suggestionId}/hide`, { method: "POST" });
    if (!response.ok) {
      setHiddenPresetIds((current) => current.filter((id) => id !== suggestionId));
      alert("Impossible de masquer cette suggestion.");
      return;
    }
    router.refresh();
  }

  function openEditForm(automation: Automation) {
    setForm(formFromAutomation(automation));
    setFormOpen(true);
    setFeedback(null);
  }

  function updateForm(patch: Partial<AutomationFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

function updateRepeat(value: AutomationFormState["repeat"]) {
    updateForm({ repeat: value, trigger: "CUSTOM_SCHEDULE" });
  }

  function toggleChannel(channel: string) {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel],
    }));
  }

  function toggleCustomDay(day: string) {
    setForm((current) => ({
      ...current,
      customDays: current.customDays.includes(day)
        ? current.customDays.filter((item) => item !== day)
        : [...current.customDays, day],
    }));
  }

  async function saveAutomation() {
    if (!form.name.trim()) {
      setFeedback({ type: "error", text: "Veuillez renseigner le titre de l'evenement." });
      return;
    }

    if (form.trigger !== "MANUAL" && !form.time) {
      setFeedback({ type: "error", text: "Veuillez choisir une heure." });
      return;
    }
    if (form.trigger !== "MANUAL" && !form.date) {
      setFeedback({ type: "error", text: "Veuillez choisir la date de l'evenement." });
      return;
    }
    if ((form.repeat === "weekly" || form.repeat === "custom") && form.trigger === "CUSTOM_SCHEDULE" && form.customDays.length === 0) {
      setFeedback({ type: "error", text: "Veuillez selectionner au moins un jour." });
      return;
    }
    if (form.channels.length === 0) {
      setFeedback({ type: "error", text: "Veuillez selectionner au moins une plateforme." });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        name: form.name,
        presetId: form.presetId ?? undefined,
        description: "",
        trigger: form.trigger,
        triggerConfig: buildTriggerConfig(form),
        contentType: form.contentType,
        channels: form.channels,
        requiresValidation: form.requiresValidation,
        isActive: form.isActive,
        nextRunAt: buildNextRunAt(form),
      };
      const res = await fetch(form.id ? `/api/automations/${form.id}` : "/api/automations", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        setFeedback({ type: "error", text: data.error ?? "Impossible d'enregistrer l'automatisation. Veuillez reessayer." });
        return;
      }
      setFormOpen(false);
      setFeedback({ type: "success", text: "Automatisation enregistree avec succes." });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutomation(id: string, isActive: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) alert("Erreur lors du changement de statut.");
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  async function triggerNow(id: string) {
    setTriggering(id);
    try {
      const res = await fetch(`/api/automations/${id}/trigger`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Erreur lors du test.");
        return;
      }
      alert("Test envoye. Verifiez les destinataires email de la communaute.");
      router.refresh();
    } catch {
      alert("Erreur lors du test.");
    } finally {
      setTriggering(null);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette automatisation ?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert("Erreur lors de la suppression.");
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setDeleting(null);
    }
  }

  async function createAutomationFromCard(card: PredefinedAutomationCard, channels?: string[], note = "") {
    setSaving(true);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: card.label,
          description: card.description,
          presetId: card.presetId && !isDefaultAutomationPublicationId(card.presetId) ? card.presetId : undefined,
          trigger: card.trigger ?? "CUSTOM_SCHEDULE",
          triggerConfig: buildAssistantTriggerConfig(card, note),
          contentType: card.contentType ?? "GENERAL",
          channels: channels ?? card.channels ?? [],
          requiresValidation: card.requiresValidation ?? requiresValidationDefault,
          isActive: true,
          nextRunAt: buildNextRunAtFromCard(card),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
        return true;
      }
      if (data.code === "PAYWALL_REQUIRED") {
        setUpgradeOpen(true);
        return false;
      }
      setFeedback({ type: "error", text: data.error ?? "Erreur lors de la création de l'automatisation." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function createPreset(preset: string, channels?: string[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, channels }),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json().catch(() => ({}));
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        alert(data.error ?? "Erreur lors de la création de l'automatisation.");
      }
    } finally {
      setSaving(false);
    }
  }

  function renderAutomationCard(automation: Automation) {
    return (
      <Card
        key={automation.id}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md hover:shadow-blue-100/50",
          !automation.isActive && "opacity-60"
        )}
      >
        <CardContent className="p-4 pr-12">
          <button
            type="button"
            aria-label="Supprimer l'automatisation"
            onClick={() => deleteAutomation(automation.id)}
            disabled={deleting === automation.id}
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
          >
            {deleting === automation.id ? <RefreshCw className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          </button>

          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-wide text-slate-900">{automation.name}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="h-8 rounded-full bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
                onClick={() => openEditForm(automation)}
              >
                <Settings className="size-3.5" />
                Configurer
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-3 text-xs"
                onClick={() => triggerNow(automation.id)}
                loading={triggering === automation.id}
              >
                <Play className="size-3.5" />
                Tester
              </Button>
              <IosAutomationSwitch
                active={automation.isActive}
                loading={toggling === automation.id}
                onClick={() => toggleAutomation(automation.id, automation.isActive)}
              />
              <span className="text-xs font-semibold text-slate-500">
                {automation.isActive ? "Activée" : "Désactivée"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderSuggestedCard(card: SuggestedCard, index: number) {
    const alreadyActive = Boolean(card.matchingAutomation);
    return (
      <Card
        key={card.key}
        className={cn(
          "relative min-h-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md hover:shadow-cyan-100/50",
          alreadyActive && "bg-slate-50/80"
        )}
      >
        <CardContent className="flex h-full flex-col p-4">
          <button
            type="button"
            aria-label="Masquer cette suggestion"
            onClick={() => void hidePresetSuggestion(card.key)}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-3.5" />
          </button>

          <div className="flex items-start gap-3 pr-7">
            <span className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-black",
              ["border-cyan-100 bg-cyan-50 text-cyan-700", "border-slate-200 bg-slate-50 text-slate-700", "border-emerald-100 bg-emerald-50 text-emerald-700"][index % 3]
            )}>
              {card.emoji}
            </span>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-black leading-5 text-slate-900">{card.label}</h3>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">{card.description}</p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            {alreadyActive ? (
              <Badge variant="published" className="border border-emerald-100 bg-emerald-50 text-emerald-700">
                Déjà activée
              </Badge>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">Assistant IA</span>
            )}
            <Button
              type="button"
              size="sm"
              disabled={alreadyActive || saving}
              onClick={() => openAssistantForPublication(card)}
              className="h-8 rounded-full bg-slate-950 px-3 text-xs text-white hover:bg-cyan-800 disabled:bg-slate-300"
            >
              <Zap className="size-3.5" />
              {alreadyActive ? "Active" : "Activer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderSuggestedSection(params: {
    title: ReactNode;
    cards: SuggestedCard[];
    emptyText?: string;
    showMore?: boolean;
  }) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-slate-800">{params.title}</h2>
          <Badge variant="info" className="w-fit border border-blue-100 bg-blue-50 text-blue-700">
            {activeCount} active{activeCount > 1 ? "s" : ""}
          </Badge>
        </div>

        {params.cards.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {params.cards.map((card, index) => renderSuggestedCard(card, index))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            <p>{params.emptyText ?? "Aucune publication IA proposée n'est disponible pour le moment."}</p>
          </div>
        )}

        {params.showMore && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpandedSpecificPresets(true)}
            className="rounded-full border-slate-200 px-4"
          >
            Voir plus
          </Button>
        )}
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        config={billingConfig}
        featureLabel="Automatisations"
        title="Automatisations illimitées avec le mode payant"
        description="Le mode gratuit permet de créer une seule automatisation IA. Passez au mode payant pour programmer toutes vos routines de communication."
      />
      {!embedded && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-cyan-800/60 bg-gradient-to-br from-[#081f36] via-[#0d304f] to-[#08192d] p-6 shadow-lg shadow-slate-950/35">
            <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-300" />
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Publications Automatisées IA</h1>
            <div className="mt-5 rounded-2xl border border-cyan-200/30 bg-white/10 p-4 text-sm leading-6 text-cyan-50 shadow-inner shadow-cyan-950/20">
              Programmez vos automatisations réseaux sociaux pour communiquer au bon moment et rester actif sur toutes vos plateformes. Elles seront ajoutées à votre Agenda IA.
            </div>
          </div>

        </div>
      )}

      {!embedded && (
        <section className="space-y-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/30">
          {profilePresetCards.length > 0 && renderSuggestedSection({
            title: (
              <>
                Publications automatiques IA proposées pour les{" "}
                <span className="text-[1.18em] font-black text-sky-500">{profileLabel}</span>
              </>
            ),
            cards: visibleProfilePresetCards,
            showMore: profilePresetCards.length > visibleProfilePresetCards.length,
          })}

          {renderSuggestedSection({
            title: "Automatisations de publications proposées",
            cards: profilePresetCards.length > 0 ? generalPresetCards : visiblePresetCards,
            emptyText: "Aucune publication IA proposée n'est encore disponible. Vous pouvez créer votre propre automatisation.",
          })}

          <div className="mt-5 flex flex-col items-center gap-2 border-t border-slate-100 pt-5 text-center">
            <Button
              onClick={openCreateForm}
              className="rounded-full bg-blue-600 px-5 text-white shadow-sm shadow-blue-200 hover:bg-blue-700"
            >
              <Plus className="size-4" />
              Créer une nouvelle automatisation de publication
            </Button>
            <p className="text-sm text-slate-500">
              Choisissez parmi ces automatisations prédéfinies ou créez vos propres automatisations personnalisées.
            </p>
          </div>
        </section>
      )}

      {!embedded && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-blue-100/30">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 h-1 w-8 rounded-full bg-blue-500" />
              <h2 className="text-lg font-black text-slate-900">Automatisations actives</h2>
              <p className="mt-1 text-sm text-slate-500">Gérez les publications automatisées déjà créées.</p>
            </div>
          </div>

          {automations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Zap className="size-7 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Aucune automatisation active</p>
                  <p className="mt-1 text-sm text-slate-400">Créez une automatisation ou activez une publication IA ci-dessus.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {automations.map((automation) => renderAutomationCard(automation))}
            </div>
          )}
        </section>
      )}

      {!embedded && (
        <section className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5 text-center shadow-sm shadow-cyan-100/40">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-cyan-400" />
          <p className="text-sm font-semibold text-slate-700">Retrouvez vos automatisations créées dans votre Agenda IA.</p>
          <Link href="/dashboard/events" className="mt-4 inline-flex">
            <Button className="rounded-full bg-cyan-700 px-5 text-white hover:bg-cyan-800">
              <Calendar className="size-4" />
              Voir mon Agenda IA
            </Button>
          </Link>
        </section>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-cyan-100 bg-white shadow-2xl shadow-slate-950/20">
            <CardHeader className="bg-[linear-gradient(135deg,#0f172a,#164e63,#0e7490)] px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-black">
                    <Calendar className="size-5 text-cyan-200" />
                    Nouvelle automatisation
                  </CardTitle>
                  <p className="mt-1 text-sm leading-6 text-cyan-50">
                    Créez une automatisation réseaux sociaux ! Elle apparaîtra aussi dans votre Agenda IA.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} className="text-white hover:bg-white/15 hover:text-white">
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid max-h-[calc(90vh-116px)] gap-4 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_34%)] p-5 lg:grid-cols-2">
              {feedback && (
                <div className={cn(
                  "lg:col-span-2 rounded-xl border px-3 py-2 text-sm",
                  feedback.type === "success" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700"
                )}>
                  {feedback.text}
                </div>
              )}
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Nom de l&apos;automatisation
                <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Date
                <input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Heure de publication
                <input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Répétition
                <select value={form.repeat} onChange={(event) => updateRepeat(event.target.value as AutomationFormState["repeat"])} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                  {REPEAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Notification avant publication (en heures)
                <input type="number" min="0" max="30" value={form.daysBefore} onChange={(event) => updateForm({ daysBefore: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                <span className="block text-xs font-normal text-slate-500">Vous recevrez une notification {form.daysBefore || 2} heures avant la publication.</span>
                <Link href="/dashboard/settings?section=editorial" className="block text-xs font-semibold text-cyan-700 hover:text-cyan-900">
                  Modifier ce délai dans mes paramètres
                </Link>
              </label>
              {(form.repeat === "weekly" || form.repeat === "custom") && (
                <div className="space-y-2 lg:col-span-2">
                  <p className="text-sm font-medium text-slate-700">Jours de répétition</p>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleCustomDay(option.value)}
                        className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", form.customDays.includes(option.value) ? "border-cyan-200 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="space-y-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
                Ajouter une note
                <textarea
                  value={form.message}
                  onChange={(event) => updateForm({ message: event.target.value })}
                  rows={3}
                  placeholder="Ajoutez une précision pour l'Assistant IA..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                />
              </label>
              <div className="space-y-2 lg:col-span-2">
                <p className="text-sm font-medium text-slate-700">Plateformes</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { channel: "WHATSAPP", label: "WhatsApp", logo: SOCIAL_LOGOS.WHATSAPP },
                    { channel: "INSTAGRAM", label: "Instagram", logo: SOCIAL_LOGOS.INSTAGRAM },
                    { channel: "FACEBOOK", label: "Facebook", logo: SOCIAL_LOGOS.FACEBOOK },
                    { channel: "TELEGRAM", label: "Telegram", logo: SOCIAL_LOGOS.TELEGRAM },
                    { channel: "EMAIL", label: "Email", logo: SOCIAL_LOGOS.EMAIL },
                  ].map((item) => (
                    <button
                      key={item.channel}
                      type="button"
                      onClick={() => toggleChannel(item.channel)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:scale-[1.02]",
                        form.channels.includes(item.channel)
                          ? "border-cyan-200 bg-cyan-50 text-cyan-800 ring-2 ring-cyan-100"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {item.logo}
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 lg:col-span-2">
                <p className="text-sm font-medium text-slate-700">Mode d&apos;envoi</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      value: true,
                      title: "Me demander avant chaque publication",
                      description: "L'IA prépare, vous validez avant l'envoi.",
                    },
                    {
                      value: false,
                      title: "Publier automatiquement à l'heure prévue",
                      description: "L'IA publie seule selon vos paramètres.",
                    },
                  ].map((option) => (
                    <button
                      key={String(option.value)}
                      type="button"
                      onClick={() => updateForm({ requiresValidation: option.value })}
                      className={cn(
                        "rounded-xl border p-3 text-left transition",
                        form.requiresValidation === option.value
                          ? "border-cyan-300 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-100"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <span className="block text-sm font-bold">{option.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-2">
                <Button type="button" variant="outline" className="ml-auto border-slate-200" onClick={() => setFormOpen(false)}>Annuler</Button>
                <Button type="button" onClick={saveAutomation} loading={saving} className="bg-cyan-700 hover:bg-cyan-800"><Save className="size-4" />Enregistrer l&apos;automatisation</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {assistantCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg overflow-hidden border-cyan-100 bg-white shadow-2xl shadow-slate-950/20">
            <CardHeader className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-black">
                    <Zap className="size-5 text-cyan-200" />
                    Assistant IA
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-300">{assistantCard.label}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={closeAssistant} className="text-white hover:bg-white/15 hover:text-white">
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 bg-slate-50 p-5">
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {assistantMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
                      message.role === "assistant"
                        ? "mr-auto border border-slate-200 bg-white text-slate-700"
                        : "ml-auto bg-cyan-700 text-white"
                    )}
                  >
                    {message.text}
                  </div>
                ))}
                {assistantStatus === "creating" && (
                  <div className="mr-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    <RefreshCw className="size-4 animate-spin" />
                    J&apos;ajoute l&apos;automatisation...
                  </div>
                )}
              </div>

              {assistantStatus === "created" ? (
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                  <Button type="button" variant="outline" onClick={closeAssistant} className="rounded-full border-slate-200">
                    Fermer
                  </Button>
                  <Link href="/dashboard/events">
                    <Button className="rounded-full bg-cyan-700 text-white hover:bg-cyan-800">
                      <Calendar className="size-4" />
                      Voir dans mon Agenda connecté IA
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <div className="flex gap-2">
                    <input
                      value={assistantInput}
                      onChange={(event) => setAssistantInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void submitAssistantInput();
                        }
                      }}
                      placeholder="Répondez oui, ou précisez un détail..."
                      className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                    <Button
                      type="button"
                      onClick={() => void submitAssistantInput()}
                      disabled={assistantStatus === "creating"}
                      className="rounded-full bg-cyan-700 px-4 text-white hover:bg-cyan-800"
                    >
                      Envoyer
                    </Button>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={closeAssistant} className="rounded-full border-slate-200">
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void confirmAssistantAutomation()}
                      loading={assistantStatus === "creating"}
                      className="rounded-full bg-slate-950 text-white hover:bg-cyan-800"
                    >
                      Oui, ajoute-la
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {embedded && (
        <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-white via-blue-50/80 to-slate-100 p-5 shadow-sm shadow-blue-100/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Automatisations</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Programmations automatiques</h2>
          <p className="mt-1 text-slate-500">{activeCount} automatisation{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""}</p>
          <div className="mt-4 grid gap-2">
            <Button size="sm" onClick={openCreateForm} className="justify-start bg-blue-600 hover:bg-blue-700"><Plus className="size-4" />Créer une nouvelle automatisation</Button>
            <Button size="sm" variant="outline" className="justify-start border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => createPreset("WEEKLY_SHABBAT")} loading={saving}><Zap className="size-4" />Créer Chabbat automatiquement</Button>
          </div>
        </div>
      )}

      {embedded && (
      <div className="grid grid-cols-1 gap-6">
        <div className={cn("space-y-3", !embedded && "lg:col-span-2")}>
          {visibleAutomations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Zap className="size-7 text-slate-400" /></div>
                <div><p className="font-semibold text-slate-700">Aucune automatisation</p><p className="text-sm text-slate-400 mt-1">Créez des automatisations pour publier du contenu automatiquement.</p></div>
                <Button size="sm" onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-700"><Plus className="size-4" />Créer une nouvelle automatisation</Button>
              </CardContent>
            </Card>
          ) : visibleAutomations.map((automation) => {
            const lastRun = automation.runs[0];
            const generateAction = getGenerateAction(automation);
            return (
              <Card key={automation.id} className={cn("border border-slate-200/90 bg-white/95 transition-shadow hover:shadow-sm hover:shadow-blue-100/50", !automation.isActive && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl", automation.isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>{TRIGGER_LABELS[automation.trigger]?.split(" ")[0] ?? "âš¡"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="font-semibold text-slate-800">{automation.name}</p>{automation.description && <p className="text-xs text-slate-500 mt-0.5">{automation.description}</p>}</div>
                        <Badge variant={automation.isActive ? "published" : "draft"} className="text-[11px]">{automation.isActive ? "Actif" : "Pausé"}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{TRIGGER_LABELS[automation.trigger]?.slice(2) ?? automation.trigger}</span>
                        {generateAction?.contentType && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{generateAction.contentType}</span>}
                        {automation.event && <span className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar className="size-3" />{automation.event.title}</span>}
                        {automation.nextRunAt && <span className="text-xs text-slate-500">Prochaine : {formatRelative(automation.nextRunAt)}</span>}
                        {automation.lastRunAt && <span className="text-xs text-slate-400">Dernière : {formatRelative(automation.lastRunAt)}</span>}
                      </div>
                      {lastRun && <div className="flex items-center gap-1.5 mt-2">{RUN_STATUS_ICON[lastRun.status]}<span className="text-xs text-slate-500">{{ RUNNING: "En cours...", SUCCESS: "Succès", PARTIAL_SUCCESS: "Succès partiel", FAILED: "Échec", SKIPPED: "Ignoré" }[lastRun.status] ?? lastRun.status} ({formatRelative(lastRun.startedAt)})</span></div>}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAutomation(automation.id, automation.isActive)} loading={toggling === automation.id}>{automation.isActive ? <><Pause className="size-3" /> Mettre en pause</> : <><Play className="size-3" /> Activer</>}</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => triggerNow(automation.id)} loading={triggering === automation.id}><Play className="size-3" />Lancer maintenant</Button>
                        <Button size="sm" className="h-7 bg-blue-600 text-xs text-white hover:bg-blue-700" onClick={() => openEditForm(automation)}><Settings className="size-3" />Configurer</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteAutomation(automation.id)} loading={deleting === automation.id}><Trash2 className="size-3" />Supprimer</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className={cn("space-y-4", embedded && recentRuns.length === 0 && "hidden")}>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Clock className="size-4 text-slate-500" />Activité récente</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentRuns.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Aucune exécution récente</p> : recentRuns.slice(0, 10).map((run) => (
                <div key={run.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
                  {RUN_STATUS_ICON[run.status]}
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-700 truncate">{run.automation.name}</p><p className="text-[11px] text-slate-400">{formatRelative(run.startedAt)}</p>{run.error && <p className="text-[11px] text-red-600 line-clamp-1 mt-0.5">{run.error}</p>}</div>
                  <Badge variant={RUN_STATUS_VARIANT[run.status] ?? "draft"} className="text-[10px] flex-shrink-0">{{ RUNNING: "En cours", SUCCESS: "OK", PARTIAL_SUCCESS: "Partiel", FAILED: "Échec", SKIPPED: "Ignoré" }[run.status] ?? run.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
