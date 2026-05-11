"use client";

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

interface Automation {
  id: string;
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
  recentRuns: AutomationRun[];
  embedded?: boolean;
}

interface AutomationFormState {
  id: string | null;
  name: string;
  description: string;
  trigger: string;
  time: string;
  day: string;
  daysBefore: string;
  contentType: string;
  channels: string[];
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
  { value: "HOLIDAY_GREETING", label: "Voeux de fête" },
  { value: "EVENT_REMINDER", label: "Rappel événement" },
  { value: "COMMUNITY_NEWS", label: "Actualité communauté" },
  { value: "GENERAL", label: "Général" },
];

const CHANNEL_OPTIONS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "EMAIL", "WEB"];
const DAY_OPTIONS = [
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "sunday", label: "Dimanche" },
];

const RUN_STATUS_ICON: Record<string, React.ReactNode> = {
  RUNNING: <RefreshCw className="size-3.5 text-emerald-600 animate-spin" />,
  SUCCESS: <CheckCircle className="size-3.5 text-emerald-600" />,
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
    name: "Nouvelle automatisation",
    description: "",
    trigger: "WEEKLY_SHABBAT",
    time: "10:00",
    day: "friday",
    daysBefore: "1",
    contentType: "SHABBAT_TIMES",
    channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
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
  return {
    id: automation.id,
    name: automation.name,
    description: automation.description ?? "",
    trigger: automation.trigger,
    time: String(config.time ?? "10:00"),
    day: String(config.day ?? "friday"),
    daysBefore: String(config.daysBefore ?? config.daysBeforeHoliday ?? 1),
    contentType: generateAction?.contentType ?? "GENERAL",
    channels: generateAction?.channels ?? [],
    requiresValidation: validationAction?.requiresValidation ?? true,
    isActive: automation.isActive,
  };
}

function buildTriggerConfig(form: AutomationFormState) {
  if (form.trigger === "DAILY") return { time: form.time };
  if (form.trigger === "WEEKLY_SHABBAT") return { day: "friday", dayOfWeek: 5, time: form.time, daysBefore: Number(form.daysBefore) || 1 };
  if (form.trigger === "JEWISH_HOLIDAY") return { daysBeforeHoliday: Number(form.daysBefore) || 1, time: form.time };
  if (form.trigger === "CUSTOM_SCHEDULE") return { day: form.day, time: form.time };
  return {};
}

export function AutomationsClient({ automations, recentRuns, embedded = false }: Props) {
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AutomationFormState>(() => defaultForm());
  const activeCount = automations.filter((a) => a.isActive).length;

  function openCreateForm() {
    setForm(defaultForm());
    setFormOpen(true);
  }

  function openEditForm(automation: Automation) {
    setForm(formFromAutomation(automation));
    setFormOpen(true);
  }

  function updateForm(patch: Partial<AutomationFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function toggleChannel(channel: string) {
    setForm((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel],
    }));
  }

  async function saveAutomation() {
    if (!form.name.trim()) {
      alert("Donnez un nom à l'automatisation.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        trigger: form.trigger,
        triggerConfig: buildTriggerConfig(form),
        contentType: form.contentType,
        channels: form.channels,
        requiresValidation: form.requiresValidation,
        isActive: form.isActive,
      };
      const res = await fetch(form.id ? `/api/automations/${form.id}` : "/api/automations", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Erreur lors de l'enregistrement.");
        return;
      }
      setFormOpen(false);
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
      if (!res.ok) alert(data.error ?? "Erreur lors du déclenchement.");
      router.refresh();
    } catch {
      alert("Erreur lors du déclenchement.");
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

  async function createPreset(preset: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      if (res.ok) router.refresh();
      else alert("Erreur lors de la création de l'automatisation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Communication</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Automatisations</h1>
              <p className="text-slate-500 mt-1">Créez, configurez et déclenchez vos publications automatiques.</p>
            </div>
            <Button size="sm" onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500">
              <Plus className="size-4" />
              Créer une automatisation
            </Button>
          </div>
        </div>
      )}

      {formOpen && (
        <Card className="border-emerald-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="size-4 text-emerald-600" />
                  {form.id ? "Configurer l'automatisation" : "Créer une automatisation"}
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500">Les changements sont enregistrés directement sur votre compte.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}><X className="size-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Nom
              <input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Déclencheur
              <select value={form.trigger} onChange={(event) => updateForm({ trigger: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400">
                {TRIGGER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 lg:col-span-2">
              Description
              <textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            </label>
            {form.trigger !== "MANUAL" && (
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Heure
                <input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </label>
            )}
            {(form.trigger === "WEEKLY_SHABBAT" || form.trigger === "JEWISH_HOLIDAY") && (
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Jours avant
                <input type="number" min="0" max="30" value={form.daysBefore} onChange={(event) => updateForm({ daysBefore: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </label>
            )}
            {form.trigger === "CUSTOM_SCHEDULE" && (
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Jour
                <select value={form.day} onChange={(event) => updateForm({ day: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400">
                  {DAY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Type de contenu
              <select value={form.contentType} onChange={(event) => updateForm({ contentType: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400">
                {CONTENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <div className="space-y-2 lg:col-span-2">
              <p className="text-sm font-medium text-slate-700">Canaux</p>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((channel) => (
                  <button key={channel} type="button" onClick={() => toggleChannel(channel)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", form.channels.includes(channel) ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}>{channel}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
              <Button type="button" onClick={() => updateForm({ isActive: !form.isActive })} variant={form.isActive ? "default" : "outline"} size="sm">{form.isActive ? "Active" : "En pause"}</Button>
              <Button type="button" onClick={() => updateForm({ requiresValidation: !form.requiresValidation })} variant={form.requiresValidation ? "outline" : "default"} size="sm">{form.requiresValidation ? "Validation requise" : "Publier sans validation"}</Button>
              <Button type="button" onClick={saveAutomation} loading={saving} className="ml-auto bg-emerald-600 hover:bg-emerald-700"><Save className="size-4" />Enregistrer</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {embedded && (
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Automatisations</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Programmations automatiques</h2>
          <p className="mt-1 text-slate-500">{activeCount} automatisation{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""}</p>
          <div className="mt-4 grid gap-2">
            <Button size="sm" onClick={openCreateForm} className="justify-start bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4" />Créer une automatisation</Button>
            <Button size="sm" variant="outline" className="justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => createPreset("WEEKLY_SHABBAT")} loading={saving}><Zap className="size-4" />Créer Chabbat automatiquement</Button>
          </div>
        </div>
      )}

      <div className={cn("grid gap-6", embedded ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
        <div className={cn("space-y-3", !embedded && "lg:col-span-2")}>
          {automations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Zap className="size-7 text-slate-400" /></div>
                <div><p className="font-semibold text-slate-700">Aucune automatisation</p><p className="text-sm text-slate-400 mt-1">Créez des automatisations pour publier du contenu automatiquement.</p></div>
                <Button size="sm" onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4" />Créer une automatisation</Button>
              </CardContent>
            </Card>
          ) : automations.map((automation) => {
            const lastRun = automation.runs[0];
            const generateAction = getGenerateAction(automation);
            return (
              <Card key={automation.id} className={cn("border transition-shadow hover:shadow-sm", !automation.isActive && "opacity-60")}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl", automation.isActive ? "bg-emerald-100" : "bg-slate-100")}>{TRIGGER_LABELS[automation.trigger]?.split(" ")[0] ?? "⚡"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="font-semibold text-slate-800">{automation.name}</p>{automation.description && <p className="text-xs text-slate-500 mt-0.5">{automation.description}</p>}</div>
                        <Badge variant={automation.isActive ? "published" : "draft"} className="text-[11px]">{automation.isActive ? "Actif" : "Pausé"}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{TRIGGER_LABELS[automation.trigger]?.slice(2) ?? automation.trigger}</span>
                        {generateAction?.contentType && <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{generateAction.contentType}</span>}
                        {automation.event && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Calendar className="size-3" />{automation.event.title}</span>}
                        {automation.nextRunAt && <span className="text-xs text-slate-500">Prochaine : {formatRelative(automation.nextRunAt)}</span>}
                        {automation.lastRunAt && <span className="text-xs text-slate-400">Dernière : {formatRelative(automation.lastRunAt)}</span>}
                      </div>
                      {lastRun && <div className="flex items-center gap-1.5 mt-2">{RUN_STATUS_ICON[lastRun.status]}<span className="text-xs text-slate-500">{{ RUNNING: "En cours…", SUCCESS: "Succès", PARTIAL_SUCCESS: "Succès partiel", FAILED: "Échec", SKIPPED: "Ignoré" }[lastRun.status] ?? lastRun.status} ({formatRelative(lastRun.startedAt)})</span></div>}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleAutomation(automation.id, automation.isActive)} loading={toggling === automation.id}>{automation.isActive ? <><Pause className="size-3" /> Mettre en pause</> : <><Play className="size-3" /> Activer</>}</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => triggerNow(automation.id)} loading={triggering === automation.id}><Play className="size-3" />Lancer maintenant</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditForm(automation)}><Settings className="size-3" />Configurer</Button>
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
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200"><CardContent className="p-4 space-y-2"><div className="flex items-center gap-2"><span className="text-xl">🕯️</span><p className="text-sm font-semibold text-emerald-900">Automatisation Chabbat</p></div><p className="text-xs text-emerald-700 leading-relaxed">L&apos;automatisation Chabbat prépare les horaires chaque semaine en se basant sur votre ville.</p></CardContent></Card>
        </div>
      </div>
    </div>
  );
}
