"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationFloatButton } from "@/components/ui/float-button";
import {
  Zap, Plus, Play, Pause, Clock, CheckCircle, XCircle,
  AlertCircle, Calendar, RefreshCw, Settings, Trash2, X, Save,
} from "lucide-react";
import { formatRelative, cn } from "@/lib/utils";

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
}

interface AutomationFormState {
  id: string | null;
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
  WEEKLY_SHABBAT: "🕯️ Chabbat hebdomadaire",
  JEWISH_HOLIDAY: "✨ Fête juive",
  BEFORE_EVENT: "⏰ Avant un événement",
  EVENT_DAY: "📅 Jour de l'événement",
  AFTER_EVENT: "📋 Après un événement",
  DAILY: "🌅 Quotidien",
  CUSTOM_SCHEDULE: "⚙️ Planning personnalisé",
  MANUAL: "👆 Manuel",
};

const TRIGGER_OPTIONS = [
  { value: "WEEKLY_SHABBAT", label: "Chabbat hebdomadaire" },
  { value: "DAILY", label: "Tous les jours" },
  { value: "JEWISH_HOLIDAY", label: "Avant une fête juive" },
  { value: "CUSTOM_SCHEDULE", label: "Planning personnalisé" },
  { value: "MANUAL", label: "Manuel" },
];

const CONTENT_TYPES = [
  { value: "SHABBAT_TIMES", label: "Horaires de Chabbat" },
  { value: "DAILY_CONTENT", label: "Pensée du jour" },
  { value: "COURSE_ANNOUNCEMENT", label: "Annonce de cours" },
  { value: "HOLIDAY_GREETING", label: "Vœux de fête" },
  { value: "EVENT_REMINDER", label: "Rappel événement" },
  { value: "COMMUNITY_NEWS", label: "Actualité communauté" },
  { value: "GENERAL", label: "Général" },
];

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

const CLIENT_PLATFORM_OPTIONS = [
  { channel: "WHATSAPP", label: "WhatsApp", logo: SOCIAL_LOGOS.WHATSAPP, className: "bg-emerald-500 text-white border-emerald-300" },
  { channel: "INSTAGRAM", label: "Instagram", logo: SOCIAL_LOGOS.INSTAGRAM, className: "bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 text-white border-pink-300" },
  { channel: "FACEBOOK", label: "Facebook", logo: SOCIAL_LOGOS.FACEBOOK, className: "bg-blue-600 text-white border-blue-300" },
  { channel: "TELEGRAM", label: "Telegram", logo: SOCIAL_LOGOS.TELEGRAM, className: "bg-sky-500 text-white border-sky-300" },
  { channel: "EMAIL", label: "Email", logo: SOCIAL_LOGOS.EMAIL, className: "bg-slate-700 text-white border-slate-500" },
];
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
  { value: "none", label: "Ne pas repeter" },
  { value: "daily", label: "Tous les jours" },
  { value: "weekly", label: "Toutes les semaines" },
  { value: "monthly", label: "Tous les mois" },
  { value: "custom", label: "Jours personnalises" },
];

interface PredefinedAutomationCard {
  key: string;
  presetId?: string;
  label: string;
  description: string;
  emoji: string;
  status: "preset" | "configurable" | "coming_soon";
  trigger?: string;
  contentType?: string;
  requiresValidation?: boolean;
  channels?: string[];
  time?: string;
  day?: string;
}

const PREDEFINED_AUTOMATIONS: PredefinedAutomationCard[] = [
  {
    key: "shabbat-times",
    label: "Horaires de Chabbat",
    description: "Publication hebdomadaire des horaires avec activation rapide.",
    emoji: "🕯️",
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
    emoji: "📅",
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
    emoji: "⏳",
    status: "coming_soon",
  },
  {
    key: "reminder-j5",
    label: "Rappels J-5",
    description: "Bloc prêt à connecter à une logique de rappels plus fine.",
    emoji: "🔔",
    status: "coming_soon",
  },
  {
    key: "regular-courses",
    label: "Cours réguliers",
    description: "Planifiez vos cours récurrents avec un rythme personnalisable.",
    emoji: "📘",
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
    emoji: "🗓️",
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
    emoji: "💬",
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
    emoji: "📨",
    status: "coming_soon",
  },
  {
    key: "important-notifications",
    label: "Notifications importantes",
    description: "Préconfigurez vos communications urgentes ou essentielles.",
    emoji: "🚨",
    status: "configurable",
    trigger: "MANUAL",
    contentType: "COMMUNITY_NEWS",
    channels: ["EMAIL", "WHATSAPP", "TELEGRAM"],
  },
];

const QUICK_AUTOMATION_EVENT_ACTIONS = [
  "Me rappeler",
  "Envoyer un message",
  "Publier un contenu",
  "Répondre en un clic",
  "Créer un récap",
  "Suivre une demande",
  "Surveiller une urgence",
  "Créer une routine",
  "Préparer avec l’IA",
  "Déclencher après un événement",
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

function defaultForm(): AutomationFormState {
  const defaultSendAt = new Date(Date.now() + 5 * 60 * 1000);
  return {
    id: null,
    name: "Nouvel evenement",
    description: "",
    trigger: "CUSTOM_SCHEDULE",
    repeat: "none",
    time: formatTimeInput(defaultSendAt),
    date: formatDateInput(defaultSendAt),
    day: "friday",
    customDays: [],
    daysBefore: "1",
    contentType: "GENERAL",
    channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
    message: "",
    requiresValidation: true,
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

export function AutomationsClient({ automations, presets = [], recentRuns, embedded = false }: Props) {
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AutomationFormState>(() => defaultForm());
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const activeCount = automations.filter((a) => a.isActive).length;
  const dynamicPresetCards: PredefinedAutomationCard[] = presets.map((preset) => {
    const generateAction = getGenerateAction({ actions: preset.actions } as Automation);
    const config = preset.triggerConfig ?? {};
    return {
      key: preset.id,
      presetId: preset.id,
      label: preset.title,
      description: preset.description ?? "Automatisation prédéfinie par l'admin global.",
      emoji: preset.icon ?? "⚡",
      status: "configurable",
      trigger: preset.trigger,
      contentType: generateAction?.contentType,
      channels: generateAction?.channels,
      time: typeof config.time === "string" ? config.time : undefined,
      day: typeof config.day === "string" ? config.day : undefined,
    };
  });
  const predefinedCards = (dynamicPresetCards.length > 0 ? dynamicPresetCards : PREDEFINED_AUTOMATIONS).map((card) => {
    const matchingAutomation = automations.find((automation) => {
      const generateAction = getGenerateAction(automation);
      if (card.presetId && automation.presetId === card.presetId) return true;
      if (card.trigger && automation.trigger !== card.trigger) return false;
      if (card.contentType && generateAction?.contentType !== card.contentType) return false;
      return true;
    });

    return { ...card, matchingAutomation };
  });
  const shabbatAutomationId =
    predefinedCards.find((card) => card.key === "shabbat-times")?.matchingAutomation?.id ?? null;
  const visibleAutomations = automations.filter((automation) => automation.id !== shabbatAutomationId);

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
    setForm(defaultForm());
    setFormOpen(true);
    setFeedback(null);
  }

  function openCreateFormWithLabel(label: string) {
    setForm({
      ...defaultForm(),
      name: label,
    });
    setFormOpen(true);
    setFeedback(null);
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

  function getAutomationChannels(automation: Automation | null | undefined) {
    if (!automation) return [];
    return getGenerateAction(automation)?.channels ?? [];
  }

  async function updateAutomationChannels(automation: Automation, channels: string[]) {
    setToggling(automation.id);
    try {
      const generateAction = getGenerateAction(automation);
      const validationAction = getValidationAction(automation);
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: generateAction?.contentType ?? "GENERAL",
          channels,
          requiresValidation: validationAction?.requiresValidation ?? true,
        }),
      });
      if (!res.ok) alert("Erreur lors de la mise à jour des plateformes.");
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  async function toggleAutomationChannel(automation: Automation, channel: string) {
    const channels = getAutomationChannels(automation);
    const nextChannels = channels.includes(channel)
      ? channels.filter((item) => item !== channel)
      : [...channels, channel];
    await updateAutomationChannels(automation, nextChannels);
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
        description: "",
        trigger: "CUSTOM_SCHEDULE",
        triggerConfig: buildTriggerConfig({ ...form, trigger: "CUSTOM_SCHEDULE" }),
        contentType: "GENERAL",
        channels: form.channels,
        requiresValidation: true,
        isActive: true,
        nextRunAt: buildNextRunAt({ ...form, trigger: "CUSTOM_SCHEDULE" }),
      };
      const res = await fetch(form.id ? `/api/automations/${form.id}` : "/api/automations", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
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

  async function createAutomationFromCard(card: PredefinedAutomationCard, channels?: string[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: card.label,
          description: "",
          presetId: card.presetId,
          trigger: card.trigger ?? "CUSTOM_SCHEDULE",
          triggerConfig: {
            eventTitle: card.label,
            time: card.time ?? "10:00",
            day: card.day ?? "friday",
            repeat: "none",
            days: card.day ? [card.day] : [],
          },
          contentType: card.contentType ?? "GENERAL",
          channels: channels ?? card.channels ?? defaultForm().channels,
          requiresValidation: true,
          isActive: true,
        }),
      });
      if (res.ok) router.refresh();
      else alert("Erreur lors de la création de l'automatisation.");
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
      else alert("Erreur lors de la création de l'automatisation.");
    } finally {
      setSaving(false);
    }
  }

  function renderAutomationCard(automation: Automation) {
    const lastRun = automation.runs[0];
    const generateAction = getGenerateAction(automation);

    return (
      <Card
        key={automation.id}
        className={cn(
          "relative border border-slate-200/90 bg-white/95 transition-shadow hover:shadow-sm hover:shadow-blue-100/50",
          !automation.isActive && "opacity-60"
        )}
      >
        <CardContent className="p-4">
          <div className="absolute right-3 top-3 flex items-center gap-1">
            <button
              type="button"
              aria-label="Modifier l'automatisation"
              onClick={() => openEditForm(automation)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
            >
              <Settings className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Supprimer l'automatisation"
              onClick={() => deleteAutomation(automation.id)}
              disabled={deleting === automation.id}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 shadow-sm transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
            >
              {deleting === automation.id ? <RefreshCw className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          </div>

          <div className="flex flex-col gap-4 pr-20">
            <div className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl",
              automation.isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
            )}>
              {TRIGGER_LABELS[automation.trigger]?.split(" ")[0] ?? "⚡"}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{automation.name}</p>
                  {automation.description && <p className="mt-0.5 text-xs text-slate-500">{automation.description}</p>}
                </div>
                <Badge variant={automation.isActive ? "published" : "draft"} className="w-fit text-[11px]">
                  {automation.isActive ? "Actif" : "Pause"}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {TRIGGER_LABELS[automation.trigger]?.slice(2) ?? automation.trigger}
                </span>
                {generateAction?.contentType && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{generateAction.contentType}</span>
                )}
                {automation.event && (
                  <span className="flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
                    <Calendar className="size-3" />
                    {automation.event.title}
                  </span>
                )}
                {automation.nextRunAt && <span className="text-xs text-slate-500">Prochaine : {formatRelative(automation.nextRunAt)}</span>}
                {automation.lastRunAt && <span className="text-xs text-slate-400">Derniere : {formatRelative(automation.lastRunAt)}</span>}
              </div>

              {generateAction?.channels && generateAction.channels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {generateAction.channels.map((channel) => (
                    <span key={channel} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {SOCIAL_LOGOS[channel]}
                      {channel}
                    </span>
                  ))}
                </div>
              )}

              {lastRun && (
                <div className="mt-3 flex items-center gap-1.5">
                  {RUN_STATUS_ICON[lastRun.status]}
                  <span className="text-xs text-slate-500">
                    {{ RUNNING: "En cours...", SUCCESS: "Succes", PARTIAL_SUCCESS: "Succes partiel", FAILED: "Echec", SKIPPED: "Ignore" }[lastRun.status] ?? lastRun.status}
                    {" "}({formatRelative(lastRun.startedAt)})
                  </span>
                </div>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {automation.isActive ? "Automatisation active" : "Automatisation desactivee"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full px-2.5 text-xs"
                  onClick={() => triggerNow(automation.id)}
                  loading={triggering === automation.id}
                >
                  <Play className="size-3" />
                  Tester
                </Button>
              </div>
              <IosAutomationSwitch
                active={automation.isActive}
                loading={toggling === automation.id}
                onClick={() => toggleAutomation(automation.id, automation.isActive)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-cyan-800/60 bg-gradient-to-br from-[#081f36] via-[#0d304f] to-[#08192d] p-6 shadow-lg shadow-slate-950/35">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-300" />
                <h1 className="mt-2 text-2xl font-bold text-white">Automatisations</h1>
                <p className="mt-1 text-sm text-cyan-100/75">Gérez et configurez vos scénarios de publication sur vos réseaux sociaux.</p>
              </div>
              <div>
                <Button onClick={openCreateForm} className="rounded-full bg-cyan-300 text-cyan-950 hover:bg-cyan-200 px-5 py-5 text-sm font-semibold transition-all">
                  <Plus className="size-4 mr-1" />
                  Nouvelle automatisation
                </Button>
              </div>
            </div>
          </div>

        </div>
      )}

      {false && !embedded && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-blue-100/30">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="hidden">
                Scénarios prédéfinis pour les <span className="text-blue-900">Synagogues / Beth Habad</span>
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Activez vos automatisations r??currentes, choisissez les r??seaux de publication ??? Facebook, Instagram, WhatsApp ou tous ?? la fois ??? puis recevez une notification au bon moment. Vous validez, et EasyCom AI publie en un clic.
              </p>
            </div>
            <Badge variant="info" className="border border-blue-100 bg-blue-50 text-blue-700">
              {activeCount} active{activeCount > 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {predefinedCards.map((card) => {
              const existing = card.matchingAutomation;
              const activeChannels = getAutomationChannels(existing);

              return (
                <div
                  key={card.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50/65 p-4 shadow-sm shadow-slate-200/70"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl shadow-inner shadow-blue-100">
                      {card.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{card.label}</p>
                        <Badge
                          variant={existing?.isActive ? "published" : "draft"}
                          className="shrink-0 text-[10px]"
                        >
                          {existing?.isActive ? "Activé" : "Désactivé"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{DEFAULT_AUTOMATION_DESCRIPTION}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {CLIENT_PLATFORM_OPTIONS.map((platform) => {
                      const isPlatformActive = activeChannels.includes(platform.channel);
                      return (
                        <button
                          key={platform.channel}
                          type="button"
                          aria-label={`${isPlatformActive ? "Désactiver" : "Activer"} ${platform.label}`}
                          title={platform.label}
                          onClick={() => {
                            if (existing) {
                              void toggleAutomationChannel(existing, platform.channel);
                              return;
                            }
                            if (card.status === "preset") {
                              void createPreset("WEEKLY_SHABBAT", [platform.channel]);
                              return;
                            }
                            if (card.status === "configurable") {
                              void createAutomationFromCard(card, [platform.channel]);
                            }
                          }}
                          disabled={card.status === "coming_soon" || toggling === existing?.id || saving}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40",
                            platform.className,
                            isPlatformActive ? "opacity-100 ring-2 ring-blue-200 ring-offset-2" : "opacity-45 grayscale"
                          )}
                        >
                          {platform.logo}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {existing ? (
                      <>
                        <AutomationFloatButton
                          active={existing.isActive}
                          loading={toggling === existing.id}
                          onClick={() => toggleAutomation(existing.id, existing.isActive)}
                        />
                        <span className="hidden" />
                        {false ? (
                        <Button>
                          {existing!.isActive ? (
                            <>
                              <Pause className="size-3" />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <Play className="size-3" />
                              Activer
                            </>
                          )}
                        </Button>
                        ) : null}
                      </>
                    ) : card.status === "preset" ? (
                      <Button
                        size="sm"
                        className="h-8 rounded-full bg-red-600 text-xs text-white hover:bg-red-700"
                        onClick={() => createPreset("WEEKLY_SHABBAT")}
                        loading={saving}
                      >
                        <Zap className="size-3" />
                        Activer
                      </Button>
                    ) : card.status === "configurable" ? (
                      <Button
                        size="sm"
                        className="h-8 rounded-full bg-red-600 text-xs text-white hover:bg-red-700"
                        onClick={() => createAutomationFromCard(card)}
                      >
                        <Play className="size-3" />
                        Activer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="h-8 rounded-full border-slate-200 text-xs text-slate-400"
                      >
                        Bientôt disponible
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-center border-t border-slate-100 pt-5">
            <Button
              onClick={openCreateForm}
              className="rounded-full bg-blue-600 px-5 text-white shadow-sm shadow-blue-200 hover:bg-blue-700"
            >
              <Plus className="size-4" />
              Ajouter une automatisation Récurrente
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {QUICK_AUTOMATION_EVENT_ACTIONS.map((label) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                onClick={() => openCreateFormWithLabel(label)}
                className="rounded-full border-slate-200 bg-white px-4 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                {label}
              </Button>
            ))}
          </div>
        </section>
      )}

      {!embedded && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-blue-100/30">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mes automatisations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Activez vos automatisations r??currentes, choisissez les r??seaux de publication ??? Facebook, Instagram, WhatsApp ou tous ?? la fois ??? puis recevez une notification au bon moment. Vous validez, et EasyCom AI publie en un clic.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={openCreateForm} className="rounded-full bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>
          </div>

          {automations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Zap className="size-7 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Aucune automatisation personnalisee</p>
                  <p className="mt-1 text-sm text-slate-400">Creez une automatisation ou activez un scenario ci-dessus.</p>
                </div>
                <Button size="sm" onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="size-4" />
                  Creer une automatisation
                </Button>
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
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-cyan-100 bg-white shadow-2xl shadow-slate-950/20">
            <CardHeader className="bg-[linear-gradient(135deg,#0f172a,#164e63,#0e7490)] px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-black">
                    <Calendar className="size-5 text-cyan-200" />
                    Nouvel événement
                  </CardTitle>
                  <p className="mt-1 text-sm leading-6 text-cyan-50">Configurez la date, l&apos;heure, les plateformes et la note associée.</p>
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
                Titre de l&apos;événement
                <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Date
                <input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Heure de l&apos;événement
                <input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Choix de répétition
                <select value={form.repeat} onChange={(event) => updateRepeat(event.target.value as AutomationFormState["repeat"])} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                  {REPEAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {form.repeat !== "weekly" && form.repeat !== "custom" && (
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  Jour
                  <select value={form.day} onChange={(event) => updateForm({ day: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                    {DAY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              )}
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
                Ajoutez une note
                <textarea
                  value={form.message}
                  onChange={(event) => updateForm({ message: event.target.value })}
                  rows={3}
                  placeholder="Exemple : rappel du cours de Torah ce soir à 20h30 au Beth Habad."
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
              <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-2">
                <Button type="button" variant="outline" className="ml-auto border-slate-200" onClick={() => setFormOpen(false)}>Annuler</Button>
                <Button type="button" onClick={saveAutomation} loading={saving} className="bg-cyan-700 hover:bg-cyan-800"><Save className="size-4" />Enregistrer l&apos;événement</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {false && formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
        <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border-blue-100 bg-white/95 shadow-xl shadow-blue-100/40">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="size-4 text-blue-600" />
                  À quelle heure voulez-vous configurer cet événement ?
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">Configurez les horaires, la repetition, les plateformes et le message.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}><X className="size-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {feedback && (
              <div className={cn(
                "lg:col-span-2 rounded-xl border px-3 py-2 text-sm",
                feedback!.type === "success" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700"
              )}>
                {feedback!.text}
              </div>
            )}
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Titre de l&apos;événement
              <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Date d&apos;envoi automatique
              <input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Déclencheur
              <select value={form.trigger} onChange={(event) => updateForm({ trigger: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white">
                {TRIGGER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
              Description
              <textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
            </label>
            {form.trigger !== "MANUAL" && (
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Heure d&apos;envoi automatique
                <input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
              </label>
            )}
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Choix de répétition
              <select value={form.repeat} onChange={(event) => updateRepeat(event.target.value as AutomationFormState["repeat"])} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white">
                {REPEAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {(form.trigger === "WEEKLY_SHABBAT" || form.trigger === "JEWISH_HOLIDAY") && (
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Jours avant
                <input type="number" min="0" max="30" value={form.daysBefore} onChange={(event) => updateForm({ daysBefore: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
              </label>
            )}
            {form.trigger === "CUSTOM_SCHEDULE" && form.repeat !== "weekly" && form.repeat !== "custom" && (
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Jour
                <select value={form.day} onChange={(event) => updateForm({ day: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white">
                  {DAY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}
            {(form.repeat === "weekly" || form.repeat === "custom") && (
              <div className="space-y-2 lg:col-span-2">
                <p className="text-sm font-medium text-slate-700">Jours de répétition</p>
                <div className="flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleCustomDay(option.value)}
                      className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", form.customDays.includes(option.value) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Type de contenu
              <select value={form.contentType} onChange={(event) => updateForm({ contentType: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white">
                {CONTENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
              Quel message souhaitez-vous préparer pour cette automatisation ?
              <textarea
                value={form.message}
                onChange={(event) => updateForm({ message: event.target.value })}
                rows={3}
                placeholder="Exemple : Bonjour, rappel du cours de Torah ce soir à 20h30 au Beth Habad. Nous vous attendons nombreux."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
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
                        ? "border-blue-200 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {item.logo}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-700 lg:col-span-2">
              Automatisation active
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateForm({ isActive: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
            </label>
            <div className="flex flex-wrap items-center justify-end gap-2 lg:col-span-2">
              <Button type="button" variant="outline" className="ml-auto border-slate-200" onClick={() => setFormOpen(false)}>Annuler</Button>
              <Button type="button" onClick={saveAutomation} loading={saving} className="bg-blue-600 hover:bg-blue-700"><Save className="size-4" />Enregistrer l&apos;automatisation</Button>
            </div>
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
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl", automation.isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500")}>{TRIGGER_LABELS[automation.trigger]?.split(" ")[0] ?? "⚡"}</div>
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
                      {lastRun && <div className="flex items-center gap-1.5 mt-2">{RUN_STATUS_ICON[lastRun.status]}<span className="text-xs text-slate-500">{{ RUNNING: "En cours…", SUCCESS: "Succès", PARTIAL_SUCCESS: "Succès partiel", FAILED: "Échec", SKIPPED: "Ignoré" }[lastRun.status] ?? lastRun.status} ({formatRelative(lastRun.startedAt)})</span></div>}
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
