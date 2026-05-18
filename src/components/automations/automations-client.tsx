"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap, Plus, Play, Pause, Clock, CheckCircle, XCircle,
  AlertCircle, Calendar, RefreshCw, Settings, Trash2, X, Save
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
  WEEKLY_SHABBAT: "ðŸ•¯ï¸ Chabbat hebdomadaire",
  JEWISH_HOLIDAY: "âœ¨ FÃªte juive",
  BEFORE_EVENT: "â° Avant un Ã©vÃ©nement",
  EVENT_DAY: "ðŸ“… Jour de l'Ã©vÃ©nement",
  AFTER_EVENT: "ðŸ“‹ AprÃ¨s un Ã©vÃ©nement",
  DAILY: "ðŸŒ… Quotidien",
  CUSTOM_SCHEDULE: "âš™ï¸ Planning personnalisÃ©",
  MANUAL: "ðŸ‘† Manuel",
};

const TRIGGER_OPTIONS = [
  { value: "WEEKLY_SHABBAT", label: "Chabbat hebdomadaire" },
  { value: "DAILY", label: "Tous les jours" },
  { value: "JEWISH_HOLIDAY", label: "Avant une fÃªte juive" },
  { value: "CUSTOM_SCHEDULE", label: "Planning personnalisÃ©" },
  { value: "MANUAL", label: "Manuel" },
];

const CONTENT_TYPES = [
  { value: "SHABBAT_TIMES", label: "Horaires de Chabbat" },
  { value: "DAILY_CONTENT", label: "PensÃ©e du jour" },
  { value: "COURSE_ANNOUNCEMENT", label: "Annonce de cours" },
  { value: "HOLIDAY_GREETING", label: "Voeux de fÃªte" },
  { value: "EVENT_REMINDER", label: "Rappel Ã©vÃ©nement" },
  { value: "COMMUNITY_NEWS", label: "ActualitÃ© communauté" },
  { value: "GENERAL", label: "GÃ©nÃ©ral" },
];

const CHANNEL_OPTIONS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "EMAIL"];
const CLIENT_PLATFORM_OPTIONS = [
  { channel: "WHATSAPP", label: "WhatsApp", logo: "W", className: "bg-emerald-500 text-white border-emerald-300" },
  { channel: "INSTAGRAM", label: "Instagram", logo: "I", className: "bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 text-white border-pink-300" },
  { channel: "FACEBOOK", label: "Facebook", logo: "f", className: "bg-blue-600 text-white border-blue-300" },
];
const DEFAULT_AUTOMATION_DESCRIPTION =
  "Vous recevrez une notification et vous pourrez publier automatiquement en un clic sur vos rÃ©seaux.";
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
    emoji: "ðŸ•¯ï¸",
    status: "preset",
    trigger: "WEEKLY_SHABBAT",
    contentType: "GENERAL",
    channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
    time: "10:00",
  },
  {
    key: "activities",
    label: "ActivitÃ©s",
    description: "PrÃ©parez des annonces rÃ©guliÃ¨res pour vos Ã©vÃ©nements et activitÃ©s.",
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
    description: "Structure visuelle prÃªte pour les rappels avant Ã©vÃ©nement.",
    emoji: "â³",
    status: "coming_soon",
  },
  {
    key: "reminder-j5",
    label: "Rappels J-5",
    description: "Bloc prÃªt Ã  connecter Ã  une logique de rappels plus fine.",
    emoji: "ðŸ””",
    status: "coming_soon",
  },
  {
    key: "regular-courses",
    label: "Cours rÃ©guliers",
    description: "Planifiez vos cours rÃ©currents avec un rythme personnalisable.",
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
    label: "Publications programmÃ©es",
    description: "PrÃ©parez Ã  l'avance vos publications Ã  heure fixe.",
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
    description: "Diffusez automatiquement un message ou une pensÃ©e du jour.",
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
    description: "Carte prÃªte pour vos relances futures sans casser l'existant.",
    emoji: "ðŸ“¨",
    status: "coming_soon",
  },
  {
    key: "important-notifications",
    label: "Notifications importantes",
    description: "PrÃ©-configurez vos communications urgentes ou essentielles.",
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

function defaultForm(): AutomationFormState {
  return {
    id: null,
    name: "Nouvel evenement",
    description: "",
    trigger: "CUSTOM_SCHEDULE",
    repeat: "none",
    time: "10:00",
    date: "",
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
    time: String(config.time ?? "10:00"),
    date: typeof config.date === "string" ? config.date : "",
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

  function openCreateForm() {
    setForm(defaultForm());
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
    if (value === "daily") {
      updateForm({ repeat: value, trigger: "DAILY" });
      return;
    }
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
      if (!res.ok) alert("Erreur lors de la mise Ã  jour des plateformes.");
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
        description: form.description,
        trigger: form.trigger,
        triggerConfig: buildTriggerConfig(form),
        contentType: form.contentType,
        channels: form.channels,
        requiresValidation: true,
        isActive: true,
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
      if (!res.ok) alert(data.error ?? "Erreur lors du dÃ©clenchement.");
      router.refresh();
    } catch {
      alert("Erreur lors du dÃ©clenchement.");
    } finally {
      setTriggering(null);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm("ÃŠtes-vous sÃ»r de vouloir supprimer cette automatisation ?")) return;
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
      else alert("Erreur lors de la crÃ©ation de l'automatisation.");
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
      else alert("Erreur lors de la crÃ©ation de l'automatisation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="overflow-hidden rounded-3xl border border-blue-800/60 bg-[#0d2f6b] p-6 shadow-lg shadow-slate-950/35">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 h-1.5 w-10 rounded-full bg-blue-300" />
              <h1 className="mt-2 text-2xl font-bold text-white">Automatisations</h1>
              <p className="mt-1 text-sm text-blue-100/75">CrÃ©ez, configurez et dÃ©clenchez vos publications automatiques.</p>
            </div>
            <div className="hidden">
              <Button size="sm" onClick={openCreateForm} className="bg-white text-slate-900 hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-white/70">
                <Plus className="size-4" />
                CrÃ©er une nouvelle automatisation
              </Button>
              <Link href="/dashboard/settings/channels">
                <Button size="sm" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                  Connecter mes rÃ©seaux sociaux
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!embedded && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-blue-100/30">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="hidden">
                Scénarios prédéfinis pour les <span className="text-blue-900">Synagogues / Beth Habad</span>
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Voici les automatisations qu&apos;EasyCom AI peut prÃ©parer de maniÃ¨re rÃ©currente. Vous pouvez les activer, les dÃ©sactiver ou ajouter vos propres automatisations rÃ©guliÃ¨res. Ã€ chaque contenu prÃªt, vous recevez une notification et pouvez le publier en un clic sur vos rÃ©seaux.
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
                          {existing?.isActive ? "ActivÃ©" : "DÃ©sactivÃ©"}
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
                        <Button
                          size="sm"
                          className={cn(
                            "h-8 rounded-full text-xs text-white shadow-sm",
                            existing.isActive ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                          )}
                          onClick={() => toggleAutomation(existing.id, existing.isActive)}
                          loading={toggling === existing.id}
                        >
                          {existing.isActive ? (
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
                        <span className="hidden" />
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
                        BientÃ´t disponible
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
              Ajouter une automatisation RÃ©currente
            </Button>
          </div>
        </section>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
        <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border-blue-100 bg-white/95 shadow-xl shadow-blue-100/40">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="size-4 text-blue-600" />
                  Ã€ quelle heure voulez-vous configurer cet Ã©vÃ©nement ?
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
                feedback.type === "success" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700"
              )}>
                {feedback.text}
              </div>
            )}
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Titre de l&apos;Ã©vÃ©nement
              <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Date (si nÃ©cessaire)
              <input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
            </label>
            <label className="hidden">
              Déclencheur
              <select value={form.trigger} onChange={(event) => updateForm({ trigger: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white">
                {TRIGGER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="hidden">
              Description
              <textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
            </label>
            {form.trigger !== "MANUAL" && (
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Heure souhaitÃ©e
                <input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white" />
              </label>
            )}
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Choix de rÃ©pÃ©tition
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
                <p className="text-sm font-medium text-slate-700">Jours de rÃ©pÃ©tition</p>
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
              Quel message souhaitez-vous prÃ©parer pour cette automatisation ?
              <textarea
                value={form.message}
                onChange={(event) => updateForm({ message: event.target.value })}
                rows={3}
                placeholder="Exemple : Bonjour, rappel du cours de Torah ce soir Ã  20h30 au Beth Habad. Nous vous attendons nombreux."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
              />
            </label>
            <div className="space-y-2 lg:col-span-2">
              <p className="text-sm font-medium text-slate-700">Plateformes</p>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((channel) => (
                  <button key={channel} type="button" onClick={() => toggleChannel(channel)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", form.channels.includes(channel) ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>{channel}</button>
                ))}
              </div>
            </div>
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
            <Button size="sm" onClick={openCreateForm} className="justify-start bg-blue-600 hover:bg-blue-700"><Plus className="size-4" />CrÃ©er une nouvelle automatisation</Button>
            <Button size="sm" variant="outline" className="justify-start border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => createPreset("WEEKLY_SHABBAT")} loading={saving}><Zap className="size-4" />CrÃ©er Chabbat automatiquement</Button>
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
                <div><p className="font-semibold text-slate-700">Aucune automatisation</p><p className="text-sm text-slate-400 mt-1">CrÃ©ez des automatisations pour publier du contenu automatiquement.</p></div>
                <Button size="sm" onClick={openCreateForm} className="bg-blue-600 hover:bg-blue-700"><Plus className="size-4" />CrÃ©er une nouvelle automatisation</Button>
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
                        <Badge variant={automation.isActive ? "published" : "draft"} className="text-[11px]">{automation.isActive ? "Actif" : "PausÃ©"}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{TRIGGER_LABELS[automation.trigger]?.slice(2) ?? automation.trigger}</span>
                        {generateAction?.contentType && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{generateAction.contentType}</span>}
                        {automation.event && <span className="text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar className="size-3" />{automation.event.title}</span>}
                        {automation.nextRunAt && <span className="text-xs text-slate-500">Prochaine : {formatRelative(automation.nextRunAt)}</span>}
                        {automation.lastRunAt && <span className="text-xs text-slate-400">DerniÃ¨re : {formatRelative(automation.lastRunAt)}</span>}
                      </div>
                      {lastRun && <div className="flex items-center gap-1.5 mt-2">{RUN_STATUS_ICON[lastRun.status]}<span className="text-xs text-slate-500">{{ RUNNING: "En coursâ€¦", SUCCESS: "SuccÃ¨s", PARTIAL_SUCCESS: "SuccÃ¨s partiel", FAILED: "Ã‰chec", SKIPPED: "IgnorÃ©" }[lastRun.status] ?? lastRun.status} ({formatRelative(lastRun.startedAt)})</span></div>}
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
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Clock className="size-4 text-slate-500" />ActivitÃ© rÃ©cente</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentRuns.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Aucune exÃ©cution rÃ©cente</p> : recentRuns.slice(0, 10).map((run) => (
                <div key={run.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
                  {RUN_STATUS_ICON[run.status]}
                  <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-700 truncate">{run.automation.name}</p><p className="text-[11px] text-slate-400">{formatRelative(run.startedAt)}</p>{run.error && <p className="text-[11px] text-red-600 line-clamp-1 mt-0.5">{run.error}</p>}</div>
                  <Badge variant={RUN_STATUS_VARIANT[run.status] ?? "draft"} className="text-[10px] flex-shrink-0">{{ RUNNING: "En cours", SUCCESS: "OK", PARTIAL_SUCCESS: "Partiel", FAILED: "Ã‰chec", SKIPPED: "IgnorÃ©" }[run.status] ?? run.status}</Badge>
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
