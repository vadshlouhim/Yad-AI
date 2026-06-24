"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_REMINDER_TIME,
  REMINDER_CHANNELS,
  reminderLabel,
  recomputeReminderDates,
  sortReminders,
  subtractDaysISO,
  type EventReminder,
  type EventReminderCampaign,
  type ReminderChannel,
  type ScheduleMode,
} from "@/lib/automation/event-reminders";

// ── Logos SVG officiels (pas d'emojis) ──────────────────────────────────────
const CHANNEL_LOGOS: Record<ReminderChannel, React.ReactNode> = {
  INSTAGRAM: (
    <svg className="size-4 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  FACEBOOK: (
    <svg className="size-4 fill-current" viewBox="0 0 24 24">
      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
    </svg>
  ),
  WHATSAPP: (
    <svg className="size-4 fill-current" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.42 9.863-9.864.002-2.634-1.02-5.11-2.881-6.974C16.592 1.897 14.1 1.87 11.999 1.87c-5.439 0-9.861 4.421-9.865 9.867-.001 1.733.46 3.424 1.336 4.921l-.988 3.597 3.7-.978zM17.15 14.5c-.282-.141-1.67-.824-1.928-.918-.258-.095-.447-.141-.636.141-.189.282-.731.918-.897 1.107-.166.189-.333.213-.615.072-1.048-.523-1.83-.984-2.525-2.18-.184-.316.184-.294.526-.976.059-.118.03-.222-.015-.316-.045-.094-.447-1.077-.612-1.472-.16-.388-.323-.336-.447-.342-.116-.006-.25-.007-.386-.007-.136 0-.356.05-.543.254-.187.204-.714.698-.714 1.701 0 1.004.73 1.976.832 2.113.102.136 1.436 2.193 3.48 3.076.486.209.866.335 1.161.429.489.156.935.134 1.286.082.392-.058 1.205-.493 1.376-.97.171-.476.171-.885.12-.97-.051-.085-.19-.136-.472-.277z" />
    </svg>
  ),
  EMAIL: (
    <svg className="size-4 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
};

const CHANNEL_LABELS: Record<ReminderChannel, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

const STATUS_LABELS: Record<EventReminder["status"], { label: string; cls: string }> = {
  DRAFT: { label: "Brouillon", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  SCHEDULED: { label: "Programmé", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  PENDING_VALIDATION: { label: "En attente de validation", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  PUBLISHED: { label: "Publié", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Annulé", cls: "bg-slate-100 text-slate-400 border-slate-200" },
  ERROR: { label: "Erreur", cls: "bg-red-50 text-red-700 border-red-200" },
};

interface Community {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  timezone: string;
  tone: string;
  plan: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  coverImageUrl: string | null;
  status: string;
}

interface CampaignAutomation {
  id: string;
  name: string;
  isActive: boolean;
  status: string;
  nextRunAt: string | null;
  triggerConfig: Record<string, unknown> | null;
  updatedAt: string;
  eventId: string | null;
}

interface Props {
  community: Community;
  upcomingEvents: UpcomingEvent[];
  campaigns: CampaignAutomation[];
}

type View = "overview" | "customize" | "success";

const TZ = "Europe/Paris";

function formatDate(date: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00Z`));
}

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date()
  );
}

function getCampaign(automation: CampaignAutomation): EventReminderCampaign | null {
  const cfg = automation.triggerConfig;
  if (!cfg || typeof cfg !== "object") return null;
  const value = (cfg as Record<string, unknown>).eventReminderCampaign;
  return value && typeof value === "object" ? (value as EventReminderCampaign) : null;
}

function newReminderId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `rem_${Date.now()}_${Math.random()}`;
}

export function EventRemindersAutoClient({ community, upcomingEvents, campaigns }: Props) {
  const [view, setView] = useState<View>("overview");
  const [campaign, setCampaign] = useState<EventReminderCampaign | null>(null);
  const [savedAutomationId, setSavedAutomationId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Formulaire « Ajouter un événement »
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: "", date: "", time: "", location: "" });

  // Formulaire « ajouter un rappel libre »
  const [freeMode, setFreeMode] = useState<"days" | "date">("days");
  const [freeDays, setFreeDays] = useState("");
  const [freeDate, setFreeDate] = useState("");

  const hasActiveCampaign = campaigns.some((c) => c.status === "ACTIVE");

  // ── Construit une campagne via l'API generate-plan ──────────────────────
  async function startCampaign(params: {
    eventId: string | null;
    eventName: string;
    eventDate: string;
    eventTime: string | null;
    eventLocation: string | null;
    sourceType: "existing_event" | "new_event";
  }) {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      // Vérifie qu'aucune campagne n'existe déjà pour cet événement.
      if (params.eventId) {
        const dup = await fetch("/api/event-reminders-auto/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "check-duplicate", eventId: params.eventId }),
        }).then((r) => r.json());
        if (dup?.exists && dup.automation) {
          const existing = getCampaign(dup.automation as CampaignAutomation);
          if (existing) {
            setCampaign(existing);
            setSavedAutomationId((dup.automation as CampaignAutomation).id);
            setNotice("Une campagne existe déjà pour cet événement — vous pouvez la modifier ci-dessous.");
            setView("customize");
            return;
          }
        }
      }

      const channels: ReminderChannel[] = ["INSTAGRAM", "FACEBOOK", "WHATSAPP"];
      const res = await fetch("/api/event-reminders-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate-plan", eventDate: params.eventDate, channels }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de générer le plan de rappels.");
        return;
      }
      if (data.removedPastReminders) {
        setNotice("Les rappels déjà passés ont été retirés automatiquement.");
      }
      setCampaign({
        eventId: params.eventId,
        eventName: params.eventName,
        eventDate: params.eventDate,
        eventTime: params.eventTime,
        eventLocation: params.eventLocation,
        eventContact: null,
        eventRegistrationUrl: null,
        mainVisualUrl: null,
        sourceType: params.sourceType,
        scheduleMode: "notification",
        channels,
        reminders: data.reminders as EventReminder[],
        validated: false,
      });
      setSavedAutomationId(null);
      setView("customize");
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  function updateReminder(id: string, patch: Partial<EventReminder>) {
    setCampaign((prev) =>
      prev ? { ...prev, reminders: prev.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : prev
    );
  }

  function deleteReminder(id: string) {
    setCampaign((prev) => (prev ? { ...prev, reminders: prev.reminders.filter((r) => r.id !== id) } : prev));
  }

  function toggleReminderChannel(id: string, channel: ReminderChannel) {
    setCampaign((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reminders: prev.reminders.map((r) => {
          if (r.id !== id) return r;
          const has = r.channels.includes(channel);
          const channels = has ? r.channels.filter((c) => c !== channel) : [...r.channels, channel];
          return { ...r, channels };
        }),
      };
    });
  }

  function addFreeReminder() {
    if (!campaign) return;
    setError("");
    let reminder: EventReminder | null = null;

    if (freeMode === "days") {
      const days = Number(freeDays);
      if (!Number.isInteger(days) || days < 0) {
        setError("Indiquez un nombre de jours valide (0 = Jour J).");
        return;
      }
      const date = subtractDaysISO(campaign.eventDate, days);
      reminder = {
        id: newReminderId(),
        offsetDays: days,
        exactDate: null,
        date,
        time: DEFAULT_REMINDER_TIME,
        label: reminderLabel(days, null),
        channels: [...campaign.channels],
        status: "DRAFT",
        visualUrl: null,
        agendaItemId: null,
        publishedDraftId: null,
      };
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(freeDate)) {
        setError("Choisissez une date exacte valide.");
        return;
      }
      reminder = {
        id: newReminderId(),
        offsetDays: null,
        exactDate: freeDate,
        date: freeDate,
        time: DEFAULT_REMINDER_TIME,
        label: "Rappel personnalisé",
        channels: [...campaign.channels],
        status: "DRAFT",
        visualUrl: null,
        agendaItemId: null,
        publishedDraftId: null,
      };
    }

    setCampaign((prev) => (prev ? { ...prev, reminders: sortReminders([...prev.reminders, reminder!]) } : prev));
    setFreeDays("");
    setFreeDate("");
  }

  // Rappels triés et nettoyés (retire les passés) pour l'affichage.
  const displayReminders = useMemo(() => {
    if (!campaign) return [];
    return sortReminders(recomputeReminderDates(campaign.reminders, campaign.eventDate, new Date(), TZ));
  }, [campaign]);

  async function persist(mode: "save-config" | "validate-campaign") {
    if (!campaign) return;
    setError("");
    setSaving(true);
    try {
      const payload: EventReminderCampaign = { ...campaign, reminders: displayReminders };
      const res = await fetch("/api/event-reminders-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, campaign: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }
      setSavedAutomationId(data.id ?? null);
      const updated = getCampaign(data as CampaignAutomation);
      if (updated) setCampaign(updated);
      if (mode === "validate-campaign") setView("success");
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function publishNow() {
    if (!savedAutomationId) return;
    setTriggering(true);
    setTriggerSuccess(false);
    setError("");
    try {
      const res = await fetch(`/api/automations/${savedAutomationId}/trigger`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Erreur lors du déclenchement.");
      } else {
        setTriggerSuccess(true);
        setTimeout(() => setTriggerSuccess(false), 4000);
      }
    } catch {
      setError("Erreur réseau lors du déclenchement.");
    } finally {
      setTriggering(false);
    }
  }

  // ── Bandeau d'en-tête (toujours visible) ───────────────────────────────
  const header = (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 p-6 text-white shadow-lg shadow-violet-900/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 h-1.5 w-10 rounded-full bg-white/60" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Automatisation J-10 / J-5</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-50/90">
            Planifiez automatiquement vos rappels avant chaque événement.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              hasActiveCampaign ? "bg-emerald-400/20 text-emerald-50" : "bg-white/15 text-white/80"
            )}
          >
            <span className={cn("size-2 rounded-full", hasActiveCampaign ? "bg-emerald-300" : "bg-white/50")} />
            {hasActiveCampaign ? "Campagne active" : "Aucune campagne active"}
          </span>
          <Link href="/dashboard/events">
            <Button size="sm" variant="outline" className="h-9 rounded-xl border-white/30 bg-white/10 px-4 text-xs text-white hover:bg-white/20">
              <CalendarDays className="size-4" />
              Voir dans l&apos;Agenda IA
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-6 px-4 sm:px-6">
      {header}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{notice}</div>
      )}

      {view === "overview" && (
        <OverviewView
          community={community}
          upcomingEvents={upcomingEvents}
          campaigns={campaigns}
          saving={saving}
          showNewEvent={showNewEvent}
          setShowNewEvent={setShowNewEvent}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          onChooseEvent={(ev) =>
            startCampaign({
              eventId: ev.id,
              eventName: ev.title,
              eventDate: ev.startDate.slice(0, 10),
              eventTime: null,
              eventLocation: null,
              sourceType: "existing_event",
            })
          }
          onCreateEvent={() => {
            if (!newEvent.name.trim() || !newEvent.date) {
              setError("Renseignez au moins le nom et la date de l'événement.");
              return;
            }
            startCampaign({
              eventId: null,
              eventName: newEvent.name.trim(),
              eventDate: newEvent.date,
              eventTime: newEvent.time || null,
              eventLocation: newEvent.location || null,
              sourceType: "new_event",
            });
          }}
          onEditCampaign={(automation) => {
            const c = getCampaign(automation);
            if (c) {
              setCampaign(c);
              setSavedAutomationId(automation.id);
              setView("customize");
            }
          }}
        />
      )}

      {view === "customize" && campaign && (
        <CustomizeView
          campaign={campaign}
          reminders={displayReminders}
          saving={saving}
          onBack={() => {
            setView("overview");
            setNotice("");
          }}
          setScheduleMode={(m) => setCampaign((prev) => (prev ? { ...prev, scheduleMode: m } : prev))}
          updateReminder={updateReminder}
          deleteReminder={deleteReminder}
          toggleReminderChannel={toggleReminderChannel}
          freeMode={freeMode}
          setFreeMode={setFreeMode}
          freeDays={freeDays}
          setFreeDays={setFreeDays}
          freeDate={freeDate}
          setFreeDate={setFreeDate}
          addFreeReminder={addFreeReminder}
          onSaveDraft={() => persist("save-config")}
          onValidate={() => persist("validate-campaign")}
        />
      )}

      {view === "success" && campaign && (
        <SuccessView
          campaign={campaign}
          reminders={displayReminders}
          triggering={triggering}
          triggerSuccess={triggerSuccess}
          canPublishNow={Boolean(savedAutomationId)}
          onPublishNow={publishNow}
          onBackToOverview={() => {
            setView("overview");
            setCampaign(null);
            setNotice("");
          }}
        />
      )}
    </div>
  );
}

// ── Vue d'ensemble ──────────────────────────────────────────────────────────
function OverviewView(props: {
  community: Community;
  upcomingEvents: UpcomingEvent[];
  campaigns: CampaignAutomation[];
  saving: boolean;
  showNewEvent: boolean;
  setShowNewEvent: (v: boolean) => void;
  newEvent: { name: string; date: string; time: string; location: string };
  setNewEvent: (v: { name: string; date: string; time: string; location: string }) => void;
  onChooseEvent: (ev: UpcomingEvent) => void;
  onCreateEvent: () => void;
  onEditCampaign: (automation: CampaignAutomation) => void;
}) {
  const { upcomingEvents, campaigns, saving, showNewEvent, setShowNewEvent, newEvent, setNewEvent } = props;
  const [showEventList, setShowEventList] = useState(false);

  return (
    <>
      {/* Comment ça fonctionne */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Comment ça fonctionne&nbsp;?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, t: "Choisissez l'événement", d: "Sélectionnez un événement à venir ou ajoutez un nouvel événement." },
            { n: 2, t: "L'IA prépare les rappels", d: "EasyCom IA propose automatiquement J-10, J-5, J-3, Demain et Jour J." },
            { n: 3, t: "Validez la campagne", d: "Vérifiez les aperçus, choisissez le mode de publication et ajoutez à l'Agenda IA." },
          ].map((step) => (
            <div key={step.n} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                {step.n}
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-900">{step.t}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deux entrées */}
      <section className="grid gap-4 sm:grid-cols-2">
        {/* Mes événements à venir */}
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/50 p-6 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <CalendarDays className="size-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">Mes événements à venir</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Choisissez un événement déjà présent dans votre Agenda IA.
          </p>
          {!showEventList ? (
            <Button
              onClick={() => setShowEventList(true)}
              className="mt-4 h-10 rounded-xl bg-violet-600 px-4 text-sm text-white hover:bg-violet-700"
            >
              Choisir un événement
              <ChevronRight className="size-4" />
            </Button>
          ) : upcomingEvents.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white p-3 text-xs text-slate-500">
              Aucun événement à venir dans l&apos;Agenda IA.{" "}
              <Link href="/dashboard/events" className="font-semibold text-violet-700 hover:underline">
                Ajouter un événement
              </Link>
            </p>
          ) : (
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {upcomingEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  disabled={saving}
                  onClick={() => props.onChooseEvent(ev)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-violet-300 hover:bg-violet-50/50 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{ev.title}</span>
                    <span className="block text-xs text-slate-400">{formatDate(ev.startDate.slice(0, 10))}</span>
                  </span>
                  <ChevronRight className="size-4 flex-shrink-0 text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ajouter un événement */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <CalendarPlus className="size-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">Ajouter un événement</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Créez un événement depuis zéro pour lancer la campagne.</p>
          {!showNewEvent ? (
            <Button
              onClick={() => setShowNewEvent(true)}
              variant="outline"
              className="mt-4 h-10 rounded-xl border-slate-200 px-4 text-sm"
            >
              <Plus className="size-4" />
              Nouvel événement
            </Button>
          ) : (
            <div className="mt-4 space-y-3">
              <input
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                placeholder="Nom de l'événement"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={newEvent.date}
                  min={todayISO()}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>
              <input
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="Lieu (optionnel)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <Button
                onClick={props.onCreateEvent}
                disabled={saving}
                className="h-10 w-full rounded-xl bg-violet-600 px-4 text-sm text-white hover:bg-violet-700"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Préparer les rappels
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Campagnes actives */}
      {campaigns.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Campagnes</h2>
          <div className="mt-4 space-y-2">
            {campaigns.map((automation) => {
              const c = getCampaign(automation);
              if (!c) return null;
              const remindersCount = c.reminders.length;
              const next = automation.nextRunAt
                ? new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
                    new Date(automation.nextRunAt)
                  )
                : "—";
              return (
                <div
                  key={automation.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{c.eventName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(c.eventDate)} · {remindersCount} rappel{remindersCount > 1 ? "s" : ""} · prochain&nbsp;: {next}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                        automation.status === "ACTIVE"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500"
                      )}
                    >
                      {automation.status === "ACTIVE" ? "Active" : automation.status === "PAUSED" ? "En pause" : "Brouillon"}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => props.onEditCampaign(automation)}
                      className="h-8 rounded-xl bg-violet-600 px-3 text-xs text-white hover:bg-violet-700"
                    >
                      Modifier
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

// ── Vue de personnalisation (timeline) ──────────────────────────────────────
function CustomizeView(props: {
  campaign: EventReminderCampaign;
  reminders: EventReminder[];
  saving: boolean;
  onBack: () => void;
  setScheduleMode: (m: ScheduleMode) => void;
  updateReminder: (id: string, patch: Partial<EventReminder>) => void;
  deleteReminder: (id: string) => void;
  toggleReminderChannel: (id: string, channel: ReminderChannel) => void;
  freeMode: "days" | "date";
  setFreeMode: (m: "days" | "date") => void;
  freeDays: string;
  setFreeDays: (v: string) => void;
  freeDate: string;
  setFreeDate: (v: string) => void;
  addFreeReminder: () => void;
  onSaveDraft: () => void;
  onValidate: () => void;
}) {
  const { campaign, reminders, saving } = props;

  return (
    <>
      <div className="flex items-center justify-between">
        <button onClick={props.onBack} className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Retour
        </button>
        <span className="text-sm font-semibold text-slate-900">{campaign.eventName}</span>
      </div>

      {/* Mode de publication (toute la campagne) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Mode de publication</h2>
        <p className="mt-1 text-sm text-slate-500">Choisi pour toute la campagne. Vous voyez les aperçus avant toute publication.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              { mode: "notification" as ScheduleMode, title: "Avec validation", desc: "Chaque rappel est préparé puis publié seulement après votre validation." },
              { mode: "direct" as ScheduleMode, title: "Publication automatique", desc: "Après validation de la campagne, les rappels partent automatiquement à l'heure prévue." },
            ]
          ).map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => props.setScheduleMode(opt.mode)}
              className={cn(
                "rounded-2xl border p-4 text-left transition",
                campaign.scheduleMode === opt.mode
                  ? "border-violet-500 bg-violet-50 ring-1 ring-violet-200"
                  : "border-slate-200 bg-white hover:border-violet-200"
              )}
            >
              <p className="text-sm font-semibold text-slate-900">{opt.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Timeline des rappels */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Vos rappels</h2>
          <span className="text-xs text-slate-400">{reminders.length} rappel{reminders.length > 1 ? "s" : ""}</span>
        </div>

        {reminders.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Aucun rappel programmable (l&apos;événement est peut-être trop proche). Ajoutez un rappel ci-dessous.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {reminders.map((r) => {
              const status = STATUS_LABELS[r.status];
              return (
                <div key={r.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-bold text-white">
                        {r.label}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{formatDate(r.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", status.cls)}>{status.label}</span>
                      <button
                        onClick={() => props.deleteReminder(r.id)}
                        className="flex size-7 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50"
                        aria-label="Supprimer le rappel"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="size-3.5" />
                      <input
                        type="time"
                        value={r.time}
                        onChange={(e) => props.updateReminder(r.id, { time: e.target.value })}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-violet-400 focus:outline-none"
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {REMINDER_CHANNELS.map((channel) => {
                        const active = r.channels.includes(channel);
                        return (
                          <button
                            key={channel}
                            type="button"
                            onClick={() => props.toggleReminderChannel(r.id, channel)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                              active
                                ? "border-violet-300 bg-violet-50 text-violet-700"
                                : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                            )}
                          >
                            {CHANNEL_LOGOS[channel]}
                            {CHANNEL_LABELS[channel]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ajouter un rappel libre */}
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">Ajouter un rappel</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="flex rounded-xl border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => props.setFreeMode("days")}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", props.freeMode === "days" ? "bg-violet-600 text-white" : "text-slate-500")}
              >
                Jours avant
              </button>
              <button
                type="button"
                onClick={() => props.setFreeMode("date")}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", props.freeMode === "date" ? "bg-violet-600 text-white" : "text-slate-500")}
              >
                Date exacte
              </button>
            </div>
            {props.freeMode === "days" ? (
              <input
                type="number"
                min={0}
                value={props.freeDays}
                onChange={(e) => props.setFreeDays(e.target.value)}
                placeholder="Ex : 7"
                className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            ) : (
              <input
                type="date"
                value={props.freeDate}
                min={todayISO()}
                max={campaign.eventDate}
                onChange={(e) => props.setFreeDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            )}
            <Button onClick={props.addFreeReminder} variant="outline" className="h-10 rounded-xl border-slate-200 px-4 text-sm">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Les rappels en heures ne sont pas autorisés. Heure par défaut&nbsp;: 10h00.</p>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button onClick={props.onSaveDraft} disabled={saving} variant="outline" className="h-11 rounded-2xl border-slate-200 px-5 text-sm">
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Enregistrer le brouillon
        </Button>
        <Button
          onClick={props.onValidate}
          disabled={saving || reminders.length === 0}
          className="h-11 rounded-2xl bg-violet-600 px-6 text-sm text-white hover:bg-violet-700"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Tout valider et ajouter à l&apos;Agenda IA
        </Button>
      </div>
    </>
  );
}

// ── Vue de succès ────────────────────────────────────────────────────────────
function SuccessView(props: {
  campaign: EventReminderCampaign;
  reminders: EventReminder[];
  triggering: boolean;
  triggerSuccess: boolean;
  canPublishNow: boolean;
  onPublishNow: () => void;
  onBackToOverview: () => void;
}) {
  const { campaign, reminders } = props;
  return (
    <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Campagne validée&nbsp;!</h2>
          <p className="mt-1 text-sm text-slate-600">
            {reminders.length} rappel{reminders.length > 1 ? "s" : ""} pour « {campaign.eventName} » {reminders.length > 1 ? "ont" : "a"} été ajouté
            {reminders.length > 1 ? "s" : ""} séparément à votre Agenda IA.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {reminders.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold text-white">{r.label}</span>
              <span className="font-medium text-slate-700">{formatDate(r.date)}</span>
              <span className="text-xs text-slate-400">{r.time}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              {r.channels.map((c) => (
                <span key={c} title={CHANNEL_LABELS[c]}>
                  {CHANNEL_LOGOS[c]}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>

      {props.triggerSuccess && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          Le prochain rappel a été déclenché.
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {props.canPublishNow && (
          <Button
            onClick={props.onPublishNow}
            disabled={props.triggering}
            className="h-11 rounded-2xl bg-emerald-600 px-5 text-sm text-white hover:bg-emerald-700"
          >
            {props.triggering ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Publier le prochain rappel maintenant
          </Button>
        )}
        <Link href="/dashboard/events" className="flex-1 sm:flex-none">
          <Button variant="outline" className="h-11 w-full rounded-2xl border-slate-200 px-5 text-sm sm:w-auto">
            <CalendarDays className="size-4" />
            Voir dans l&apos;Agenda IA
          </Button>
        </Link>
        <Button onClick={props.onBackToOverview} variant="ghost" className="h-11 rounded-2xl px-5 text-sm text-slate-500">
          <Zap className="size-4" />
          Nouvelle campagne
        </Button>
      </div>
    </section>
  );
}
