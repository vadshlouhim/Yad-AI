"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap, Plus, Play, Pause, Clock, CheckCircle, XCircle,
  AlertCircle, Calendar, RefreshCw, Settings, Trash2, X, Save,
} from "lucide-react";
import { formatRelative, cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { DAVID_AUTOMATION_IMAGE_URL } from "@/components/automations/automation-design-kit";
import { COMMUNITY_AUTOMATION_MODULES, type CommunityAutomationModuleDefinition } from "@/components/automations/community-automation-registry";
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
  JEWISH_HOLIDAY: "? Fête juive",
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
  RUNNING: <RefreshCw className="size-3.5 text-violet-600 animate-spin" />,
  SUCCESS: <CheckCircle className="size-3.5 text-violet-600" />,
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

// Une automatisation porte-t-elle une campagne de rappels J-10/J-5 ?
function isEventReminderCampaign(automation: Automation) {
  const cfg = automation.triggerConfig;
  return Boolean(cfg && typeof cfg === "object" && (cfg as Record<string, unknown>).eventReminderCampaign);
}

function isHayomYomAutomation(automation: Automation) {
  const cfg = automation.triggerConfig;
  return Boolean(cfg && typeof cfg === "object" && (cfg as Record<string, unknown>).hayomYomSettings);
}

function isJewishHolidayAutomation(automation: Automation) {
  const cfg = automation.triggerConfig;
  return Boolean(cfg && typeof cfg === "object" && (cfg as Record<string, unknown>).holidayPoster);
}

// Une automatisation porte-t-elle un récap automatique après événement ?
function isEventRecap(automation: Automation) {
  const cfg = automation.triggerConfig;
  return Boolean(cfg && typeof cfg === "object" && (cfg as Record<string, unknown>).eventRecapSettings);
}

// Une automatisation porte-t-elle « Cette semaine en images » ?
function isWeeklyImages(automation: Automation) {
  const cfg = automation.triggerConfig;
  return Boolean(cfg && typeof cfg === "object" && (cfg as Record<string, unknown>).weeklyImagesSettings);
}

// Une automatisation porte-t-elle « Programme & récap du mois » ?
function isMonthlyProgramRecap(automation: Automation) {
  const cfg = automation.triggerConfig;
  return Boolean(cfg && typeof cfg === "object" && (cfg as Record<string, unknown>).monthlyProgramRecapSettings);
}

function getSpecializedAutomationHref(automation: Automation) {
  if (automation.trigger === "WEEKLY_SHABBAT") return "/dashboard/shabbat-times-auto";
  if (isHayomYomAutomation(automation)) return "/dashboard/hayom-yom-sefer-hamitsvot";
  if (isEventReminderCampaign(automation)) return "/dashboard/event-reminders-auto";
  if (isEventRecap(automation)) return "/dashboard/recap-auto";
  if (isWeeklyImages(automation)) return "/dashboard/weekly-images-auto";
  if (isMonthlyProgramRecap(automation)) return "/dashboard/recap-auto";
  if (isJewishHolidayAutomation(automation)) return "/dashboard/jewish-holidays-auto";
  return null;
}

function getAutomationsForModule(module: CommunityAutomationModuleDefinition, automations: Automation[]) {
  if (module.kind === "tool") return [];
  return automations.filter((automation) => {
    if (module.trigger && automation.trigger === module.trigger) return true;
    return Boolean(module.configKeys?.some((configKey) => automation.triggerConfig?.[configKey]));
  });
}

export function AutomationsClient({ automations, recentRuns, embedded = false, requiresValidationDefault = true, profileLabel, billingConfig }: Props) {
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
  const activeCount = automations.filter((a) => a.isActive).length;
  const automationTitleTarget = profileLabel?.trim() || "votre structure";
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

  useEffect(() => {
    const automationId = searchParams.get("edit");
    if (!automationId) return;
    const automation = automations.find((item) => item.id === automationId);
    if (!automation) return;

    const specializedHref = getSpecializedAutomationHref(automation);
    if (specializedHref) {
      router.replace(specializedHref);
      return;
    }

    setForm(formFromAutomation(automation));
    setFormOpen(true);
    setFeedback(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.replace(params.toString() ? `/dashboard/automations?${params.toString()}` : "/dashboard/automations", { scroll: false });
  }, [automations, router, searchParams]);

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

  function openEditForm(automation: Automation) {
    const specializedHref = getSpecializedAutomationHref(automation);
    if (specializedHref) {
      router.push(specializedHref);
      return;
    }
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
    const specializedHref = getSpecializedAutomationHref(automation);
    return (
      <Card
        key={automation.id}
        className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md hover:shadow-violet-100/50"
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
              {specializedHref ? (
                <Link href={specializedHref}>
                  <Button size="sm" className="h-8 rounded-full bg-violet-600 px-3 text-xs text-white hover:bg-violet-700">
                    <Settings className="size-3.5" />
                    Configurer
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  className="h-8 rounded-full bg-violet-600 px-3 text-xs text-white hover:bg-violet-700"
                  onClick={() => openEditForm(automation)}
                >
                  <Settings className="size-3.5" />
                  Configurer
                </Button>
              )}
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

  return (
    <div className="space-y-6">
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        config={billingConfig}
        featureLabel="Automatisations"
        title="Débloquez les automatisations IA"
        description="Le mode gratuit ne permet aucune automatisation IA. Passez à l'offre Pro (3 automatisations) ou Business (5 automatisations) pour programmer vos routines de communication."
      />
      {!embedded && (
        <div className="relative overflow-visible rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/20">
          <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
            <div className="rounded-full bg-white/[0.04] p-5">
              <Zap className="size-28 text-white/[0.08]" strokeWidth={1.6} />
            </div>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-4xl">
              <div className="mb-4 h-1.5 w-12 rounded-full bg-white/80" />
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Toutes les automatisations spécialement conçues pour les{" "}
                <span className="text-white">{automationTitleTarget}</span>
              </h1>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="relative z-20 flex w-full max-w-xl items-center gap-4 text-white sm:w-auto">
                <div className="flex size-24 shrink-0 items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={DAVID_AUTOMATION_IMAGE_URL} alt="David, agent intelligent" className="h-full w-full object-contain object-bottom" />
                </div>
                <p className="max-w-sm text-sm font-black leading-6 text-white">
                  Je suis David, gérez vos automatisations et suivez celles déjà actives.
                </p>
              </div>
              <div className="flex w-fit items-center gap-2 rounded-2xl border border-white/15 bg-white/12 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-[#22084b]/20">
                <Zap className="size-4" />
                {activeCount} active{activeCount > 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      )}

      {!embedded && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-violet-100/30">
          <div className="mb-5">
            <div className="mb-3 h-1 w-8 rounded-full bg-[#421388]" />
            <h2 className="text-lg font-black text-slate-900">Communication communautaire</h2>
            <p className="mt-1 text-sm text-slate-500">Retrouvez tous vos modules, même avant leur première configuration.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {COMMUNITY_AUTOMATION_MODULES.map((module) => {
              const moduleAutomations = getAutomationsForModule(module, automations);
              const activeModuleAutomations = moduleAutomations.filter((automation) => automation.isActive && automation.status !== "PAUSED");
              const isAvailableTool = module.kind === "tool";
              const stateLabel = isAvailableTool
                ? "Disponible"
                : activeModuleAutomations.length > 0
                  ? "Active"
                  : moduleAutomations.length > 0
                    ? "En pause"
                    : "À configurer";
              const stateClass = isAvailableTool
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : activeModuleAutomations.length > 0
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : moduleAutomations.length > 0
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-600";
              const campaignLabel = module.supportsMultipleCampaigns && activeModuleAutomations.length > 0
                ? `${activeModuleAutomations.length} campagne${activeModuleAutomations.length > 1 ? "s" : ""} active${activeModuleAutomations.length > 1 ? "s" : ""}`
                : null;
              const ModuleIcon = module.icon;

              return (
                <article key={module.key} className="flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", module.iconSurfaceClass)}>
                      <ModuleIcon className={cn("size-5", module.iconClass)} />
                    </span>
                    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-black", stateClass)}>{stateLabel}</span>
                  </div>
                  <div className="mt-4 flex-1">
                    <h3 className="text-base font-black leading-6 text-slate-900">{module.shortLabel}</h3>
                    <p className="mt-1.5 text-sm leading-5 text-slate-500">{module.description}</p>
                    {campaignLabel && <p className="mt-2 text-xs font-bold text-blue-700">{campaignLabel}</p>}
                  </div>
                  <Link
                    href={module.href}
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#421388] px-3 text-sm font-black text-[#421388] transition-colors hover:bg-violet-50"
                  >
                    {isAvailableTool ? "Ouvrir" : moduleAutomations.length > 0 ? "Gérer" : "Configurer"}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!embedded && (
        <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5 shadow-violet-100/30">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 h-1 w-8 rounded-full bg-violet-500" />
              <h2 className="text-lg font-black text-slate-900">Automatisations enregistrées</h2>
              <p className="mt-1 text-sm text-slate-500">Automatisations actives, personnalisées et anciennes configurations compatibles.</p>
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
                  <p className="mt-1 text-sm text-slate-400">Créez une automatisation ou activez une proposition ci-dessus.</p>
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-violet-100 bg-white shadow-2xl shadow-slate-950/20">
            <CardHeader className="bg-[linear-gradient(135deg,#4c1d95,#6d28d9,#4f46e5)] px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-black">
                    <Calendar className="size-5 text-violet-200" />
                    Nouvelle automatisation
                  </CardTitle>
                  <p className="mt-1 text-sm leading-6 text-violet-50">
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
                  feedback.type === "success" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-red-200 bg-red-50 text-red-700"
                )}>
                  {feedback.text}
                </div>
              )}
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Nom de l&apos;automatisation
                <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Date
                <input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Heure de publication
                <input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Répétition
                <select value={form.repeat} onChange={(event) => updateRepeat(event.target.value as AutomationFormState["repeat"])} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                  {REPEAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Notification avant publication (en heures)
                <input type="number" min="0" max="30" value={form.daysBefore} onChange={(event) => updateForm({ daysBefore: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                <span className="block text-xs font-normal text-slate-500">Vous recevrez une notification {form.daysBefore || 2} heures avant la publication.</span>
                <Link href="/dashboard/settings?section=editorial" className="block text-xs font-semibold text-violet-700 hover:text-violet-900">
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
                        className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", form.customDays.includes(option.value) ? "border-violet-200 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
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
                  placeholder="Ajoutez une précision..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
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
                          ? "border-violet-200 bg-violet-50 text-violet-800 ring-2 ring-violet-100"
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
                          ? "border-violet-300 bg-violet-50 text-violet-900 ring-2 ring-violet-100"
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
                <Button type="button" onClick={saveAutomation} loading={saving} className="bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]"><Save className="size-4" />Enregistrer l&apos;automatisation</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {embedded && (
        <div className="rounded-3xl border border-violet-100/80 bg-gradient-to-br from-white via-violet-50/80 to-slate-100 p-5 shadow-sm shadow-violet-100/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Automatisations</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Programmations automatiques</h2>
          <p className="mt-1 text-slate-500">{activeCount} automatisation{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""}</p>
          <div className="mt-4 grid gap-2">
            <Button size="sm" onClick={openCreateForm} className="justify-start bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]"><Plus className="size-4" />Créer une nouvelle automatisation</Button>
            <Button size="sm" variant="outline" className="justify-start border-violet-200 text-violet-700 hover:bg-violet-50" onClick={() => createPreset("WEEKLY_SHABBAT")} loading={saving}><Zap className="size-4" />Créer Chabbat automatiquement</Button>
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
                <Button size="sm" onClick={openCreateForm} className="bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]"><Plus className="size-4" />Créer une nouvelle automatisation</Button>
              </CardContent>
            </Card>
          ) : visibleAutomations.map((automation) => {
            const lastRun = automation.runs[0];
            const generateAction = getGenerateAction(automation);
            return (
              <Card key={automation.id} className="border border-slate-200/90 bg-white/95 transition-shadow hover:shadow-sm hover:shadow-violet-100/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl", automation.isActive ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500")}>{TRIGGER_LABELS[automation.trigger]?.split(" ")[0] ?? "âš¡"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="font-semibold text-slate-800">{automation.name}</p>{automation.description && <p className="text-xs text-slate-500 mt-0.5">{automation.description}</p>}</div>
                        <Badge variant={automation.isActive ? "published" : "draft"} className="text-[11px]">{automation.isActive ? "Actif" : "Pausé"}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{TRIGGER_LABELS[automation.trigger]?.slice(2) ?? automation.trigger}</span>
                        {generateAction?.contentType && <span className="text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{generateAction.contentType}</span>}
                        {automation.event && <span className="text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar className="size-3" />{automation.event.title}</span>}
                        {automation.nextRunAt && <span className="text-xs text-slate-500">Prochaine : {formatRelative(automation.nextRunAt)}</span>}
                        {automation.lastRunAt && <span className="text-xs text-slate-400">Dernière : {formatRelative(automation.lastRunAt)}</span>}
                      </div>
                      {lastRun && <div className="flex items-center gap-1.5 mt-2">{RUN_STATUS_ICON[lastRun.status]}<span className="text-xs text-slate-500">{{ RUNNING: "En cours...", SUCCESS: "Succès", PARTIAL_SUCCESS: "Succès partiel", FAILED: "Échec", SKIPPED: "Ignoré" }[lastRun.status] ?? lastRun.status} ({formatRelative(lastRun.startedAt)})</span></div>}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAutomation(automation.id, automation.isActive)} loading={toggling === automation.id}>{automation.isActive ? <><Pause className="size-3" /> Mettre en pause</> : <><Play className="size-3" /> Activer</>}</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => triggerNow(automation.id)} loading={triggering === automation.id}><Play className="size-3" />Lancer maintenant</Button>
                        {automation.trigger === "WEEKLY_SHABBAT" ? (
                          <Link href="/dashboard/shabbat-times-auto"><Button size="sm" className="h-7 bg-violet-600 text-xs text-white hover:bg-violet-700"><Settings className="size-3" />Configurer</Button></Link>
                        ) : isEventReminderCampaign(automation) ? (
                          <Link href="/dashboard/event-reminders-auto"><Button size="sm" className="h-7 bg-violet-600 text-xs text-white hover:bg-violet-700"><Settings className="size-3" />Configurer</Button></Link>
                        ) : isEventRecap(automation) ? (
                          <Link href="/dashboard/recap-auto"><Button size="sm" className="h-7 bg-violet-600 text-xs text-white hover:bg-violet-700"><Settings className="size-3" />Configurer</Button></Link>
                        ) : isWeeklyImages(automation) ? (
                          <Link href="/dashboard/weekly-images-auto"><Button size="sm" className="h-7 bg-violet-600 text-xs text-white hover:bg-violet-700"><Settings className="size-3" />Configurer</Button></Link>
                        ) : isMonthlyProgramRecap(automation) ? (
                          <Link href="/dashboard/recap-auto"><Button size="sm" className="h-7 bg-violet-600 text-xs text-white hover:bg-violet-700"><Settings className="size-3" />Configurer</Button></Link>
                        ) : (
                          <Button size="sm" className="h-7 bg-violet-600 text-xs text-white hover:bg-violet-700" onClick={() => openEditForm(automation)}><Settings className="size-3" />Configurer</Button>
                        )}
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

