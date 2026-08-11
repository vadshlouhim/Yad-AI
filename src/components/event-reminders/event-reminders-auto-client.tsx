"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DAVID_AUTOMATION_IMAGE_URL } from "@/components/automations/automation-design-kit";
import { FacebookIcon, InstagramIcon } from "@/components/layout/dashboard-nav";
import {
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Loader2,
  MapPin,
  Pause,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  subtractDaysISO,
  todayISO,
  type EventReminderCampaign,
  type ReminderChannel,
  type ScheduleMode,
} from "@/lib/automation/event-reminders";

const REMINDER_CHOICES = [
  { offset: 10, label: "J-10" },
  { offset: 5, label: "J-5" },
  { offset: 3, label: "J-3" },
  { offset: 1, label: "Demain" },
  { offset: 0, label: "Jour J" },
] as const;

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

interface ChannelState {
  type: string;
  name: string | null;
  handle: string | null;
  isConnected: boolean;
  isActive: boolean;
}

interface Props {
  community: Community;
  upcomingEvents: UpcomingEvent[];
  campaigns: CampaignAutomation[];
  channels: ChannelState[];
}

type NewEventForm = {
  title: string;
  date: string;
  time: string;
  location: string;
  coverImageUrl: string;
};

function getCampaign(automation: CampaignAutomation): EventReminderCampaign | null {
  const value = automation.triggerConfig?.eventReminderCampaign;
  return value && typeof value === "object" ? (value as EventReminderCampaign) : null;
}

function dateInTimezone(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string, timezone: string, withTime = false) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function campaignOffsets(campaign: EventReminderCampaign) {
  return campaign.reminders
    .map((reminder) => reminder.offsetDays)
    .filter((value): value is number => value !== null);
}

export function EventRemindersAutoClient({ community, upcomingEvents, campaigns, channels }: Props) {
  const timezone = community.timezone || "Europe/Paris";
  const facebookConnected = channels.some((channel) => channel.type === "FACEBOOK" && channel.isConnected && channel.isActive);
  const instagramConnected = channels.some((channel) => channel.type === "INSTAGRAM" && channel.isConnected && channel.isActive);
  const [campaignRows, setCampaignRows] = useState(campaigns);
  const [showForm, setShowForm] = useState(campaigns.length === 0);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>([10, 5, 3, 1, 0]);
  const [selectedChannels, setSelectedChannels] = useState<ReminderChannel[]>(
    [facebookConnected ? "FACEBOOK" : null, instagramConnected ? "INSTAGRAM" : null].filter(Boolean) as ReminderChannel[]
  );
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("notification");
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventForm>({ title: "", date: "", time: "", location: "", coverImageUrl: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedEvent = upcomingEvents.find((event) => event.id === selectedEventId) ?? null;
  const eventDate = selectedEvent ? dateInTimezone(selectedEvent.startDate, timezone) : selectedEventId === "new" ? newEvent.date : "";
  const hasPoster = Boolean(selectedEvent?.coverImageUrl || (selectedEventId === "new" && newEvent.coverImageUrl));
  const availableOffsets = useMemo<number[]>(() => {
    if (!eventDate) return REMINDER_CHOICES.map((choice) => Number(choice.offset));
    const today = todayISO(new Date(), timezone);
    return REMINDER_CHOICES.filter((choice) => subtractDaysISO(eventDate, choice.offset) >= today).map((choice) => Number(choice.offset));
  }, [eventDate, timezone]);

  function resetForm() {
    setSelectedEventId("");
    setSelectedOffsets([10, 5, 3, 1, 0]);
    setSelectedChannels([facebookConnected ? "FACEBOOK" : null, instagramConnected ? "INSTAGRAM" : null].filter(Boolean) as ReminderChannel[]);
    setScheduleMode("notification");
    setNewEvent({ title: "", date: "", time: "", location: "", coverImageUrl: "" });
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function chooseEvent(id: string) {
    const event = upcomingEvents.find((item) => item.id === id);
    if (!event) return;
    const date = dateInTimezone(event.startDate, timezone);
    const today = todayISO(new Date(), timezone);
    setSelectedEventId(id);
    setSelectedOffsets(REMINDER_CHOICES.filter((choice) => subtractDaysISO(date, choice.offset) >= today).map((choice) => choice.offset));
    setError("");
  }

  function toggleOffset(offset: number) {
    if (!availableOffsets.includes(offset)) return;
    setSelectedOffsets((current) => current.includes(offset) ? current.filter((value) => value !== offset) : [...current, offset]);
    setError("");
  }

  function toggleChannel(channel: ReminderChannel, connected: boolean) {
    if (!connected) return;
    setSelectedChannels((current) => current.includes(channel) ? current.filter((value) => value !== channel) : [...current, channel]);
    setError("");
  }

  async function uploadPoster(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads/attachment", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.url || !data.isImage) throw new Error(data.error ?? "Téléversement impossible.");
      setNewEvent((current) => ({ ...current, coverImageUrl: data.url as string }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Téléversement impossible.");
    } finally {
      setUploading(false);
    }
  }

  function confirmNewEvent() {
    if (!newEvent.title.trim() || !newEvent.date) {
      setError("Renseignez le nom et la date de l’événement.");
      return;
    }
    const today = todayISO(new Date(), timezone);
    setSelectedEventId("new");
    setSelectedOffsets(REMINDER_CHOICES.filter((choice) => subtractDaysISO(newEvent.date, choice.offset) >= today).map((choice) => choice.offset));
    setNewEventOpen(false);
    setError("");
  }

  async function configureCampaign() {
    if (!selectedEventId) return setError("Choisissez un événement.");
    const offsets = selectedOffsets.filter((offset) => availableOffsets.includes(offset));
    if (offsets.length === 0) return setError("Sélectionnez au moins un rappel encore disponible.");
    if (selectedChannels.length === 0) return setError("Sélectionnez au moins un réseau connecté.");
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const eventPayload = selectedEvent
        ? { id: selectedEvent.id }
        : {
            title: newEvent.title.trim(),
            date: newEvent.date,
            time: newEvent.time || "10:00",
            location: newEvent.location.trim(),
            coverImageUrl: newEvent.coverImageUrl,
          };
      const response = await fetch("/api/event-reminders-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "configure",
          event: eventPayload,
          offsets,
          channels: selectedChannels,
          scheduleMode,
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; instagramSkipped?: boolean; automation?: CampaignAutomation };
      if (!response.ok || !data.automation) throw new Error(data.error ?? "Activation impossible.");
      setCampaignRows((current) => [data.automation!, ...current.filter((row) => row.id !== data.automation!.id)]);
      setShowForm(false);
      setNotice(data.instagramSkipped
        ? "Rappels activés. Sans affiche, ils seront publiés uniquement sur Facebook."
        : "Les rappels sont activés.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Activation impossible.");
    } finally {
      setSaving(false);
    }
  }

  function editCampaign(automation: CampaignAutomation) {
    const campaign = getCampaign(automation);
    if (!campaign) return;
    const eventExists = upcomingEvents.some((event) => event.id === campaign.eventId);
    if (eventExists && campaign.eventId) {
      setSelectedEventId(campaign.eventId);
    } else {
      setNewEvent({
        title: campaign.eventName,
        date: campaign.eventDate,
        time: campaign.eventTime ?? "",
        location: campaign.eventLocation ?? "",
        coverImageUrl: campaign.mainVisualUrl ?? "",
      });
      setSelectedEventId("new");
    }
    setSelectedOffsets(campaignOffsets(campaign));
    setSelectedChannels(campaign.channels.filter((channel) => channel === "FACEBOOK" || channel === "INSTAGRAM"));
    setScheduleMode(campaign.scheduleMode === "automatic" ? "automatic" : "notification");
    setShowForm(true);
    setError("");
    setNotice("");
  }

  async function pauseCampaign(automation: CampaignAutomation) {
    const campaign = getCampaign(automation);
    if (!campaign) return;
    setBusyId(automation.id);
    setError("");
    try {
      const response = await fetch("/api/event-reminders-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pause", eventId: campaign.eventId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Mise en pause impossible.");
      }
      setCampaignRows((current) => current.map((row) => row.id === automation.id ? { ...row, isActive: false, status: "PAUSED" } : row));
      setNotice("La campagne est en pause.");
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : "Mise en pause impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function publishNext(automation: CampaignAutomation) {
    setBusyId(automation.id);
    setError("");
    try {
      const response = await fetch(`/api/automations/${automation.id}/trigger`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Déclenchement impossible.");
      }
      setNotice("Le prochain rappel a été déclenché.");
    } catch (triggerError) {
      setError(triggerError instanceof Error ? triggerError.message : "Déclenchement impossible.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-5 pb-16 sm:px-6 sm:py-7">
      <section className="relative min-h-52 overflow-hidden rounded-[1.8rem] border border-[#421388]/30 bg-[#421388] px-6 py-7 text-white shadow-[0_22px_52px_rgba(66,19,136,0.24)] sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full bg-white/10" />
        <div className="relative z-10 max-w-xl pr-28 sm:pr-44">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15"><CalendarClock className="size-6" /></span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Automatisation J-10 / J-5</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-violet-100 sm:text-base">Choisissez l’événement, David programme vos rappels.</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DAVID_AUTOMATION_IMAGE_URL} alt="David, agent intelligent" className="pointer-events-none absolute -bottom-2 right-0 z-10 h-48 w-36 object-contain object-bottom drop-shadow-2xl sm:right-8 sm:h-60 sm:w-48" />
      </section>

      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
      {notice && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p>}

      {showForm ? (
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Programmez vos rappels</h2>
              <p className="mt-1 text-sm text-slate-500">Une seule configuration, tout est prêt.</p>
            </div>
            {campaignRows.length > 0 && <button type="button" onClick={() => setShowForm(false)} className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-label="Fermer"><X className="size-5" /></button>}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-900">1. Votre événement</p>
              <Button type="button" variant="outline" size="sm" onClick={() => setNewEventOpen(true)} className="rounded-xl"><Plus className="size-4" />Ajouter</Button>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event) => {
                  const selected = selectedEventId === event.id;
                  return (
                    <button key={event.id} type="button" onClick={() => chooseEvent(event.id)} className={cn("flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition", selected ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 bg-slate-50 hover:border-violet-300")}>
                      {event.coverImageUrl ? <Image src={event.coverImageUrl} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-xl object-cover" /> : <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600"><CalendarDays className="size-5" /></span>}
                      <span className="min-w-0"><span className="block truncate text-sm font-black text-slate-950">{event.title}</span><span className="mt-1 block text-xs text-slate-500">{formatDate(event.startDate, timezone, true)}</span></span>
                      {selected && <span className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white"><Check className="size-4" /></span>}
                    </button>
                  );
                })}
              </div>
            ) : <button type="button" onClick={() => setNewEventOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300 bg-violet-50 p-5 text-sm font-black text-violet-700"><Plus className="size-5" />Ajouter votre premier événement</button>}
            {selectedEventId === "new" && <div className="mt-3 flex items-center gap-3 rounded-2xl border border-violet-300 bg-violet-50 p-4"><span className="flex size-11 items-center justify-center rounded-xl bg-white text-violet-700"><CalendarDays className="size-5" /></span><div className="min-w-0"><p className="truncate font-black text-slate-950">{newEvent.title}</p><p className="text-xs text-slate-500">{newEvent.date} {newEvent.time && `· ${newEvent.time}`}</p></div><button type="button" onClick={() => setNewEventOpen(true)} className="ml-auto text-sm font-bold text-violet-700">Modifier</button></div>}
          </div>

          <div className="mt-7">
            <p className="text-sm font-black text-slate-900">2. Vos rappels</p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {REMINDER_CHOICES.map((choice) => {
                const unavailable = Boolean(eventDate) && !availableOffsets.includes(choice.offset);
                const selected = selectedOffsets.includes(choice.offset) && !unavailable;
                return <button key={choice.offset} type="button" disabled={unavailable} aria-pressed={selected} onClick={() => toggleOffset(choice.offset)} className={cn("relative min-h-16 rounded-2xl border px-2 py-3 text-sm font-black transition", selected ? "border-violet-600 bg-[#421388] text-white shadow-md shadow-violet-100" : "border-slate-200 bg-slate-50 text-slate-600", unavailable && "cursor-not-allowed opacity-35")}>
                  {selected && <Check className="absolute right-2 top-2 size-3.5" />}{choice.label}
                </button>;
              })}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Clock3 className="size-3.5" />Publication à 10:00 · les rappels passés sont retirés automatiquement.</p>
          </div>

          <div className="mt-7">
            <p className="text-sm font-black text-slate-900">3. Où publier ?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button type="button" disabled={!facebookConnected} onClick={() => toggleChannel("FACEBOOK", facebookConnected)} className={cn("flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left transition", selectedChannels.includes("FACEBOOK") ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white", !facebookConnected && "opacity-55")}><span className="flex size-11 items-center justify-center rounded-xl bg-white text-[#1877f2] shadow-sm"><FacebookIcon className="size-5" /></span><span><span className="block font-black text-slate-950">Facebook</span><span className="text-xs text-slate-500">{facebookConnected ? "Connecté" : "À connecter"}</span></span>{selectedChannels.includes("FACEBOOK") && <CheckCircle2 className="ml-auto size-5 text-blue-600" />}</button>
              <button type="button" disabled={!instagramConnected} onClick={() => toggleChannel("INSTAGRAM", instagramConnected)} className={cn("flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-left transition", selectedChannels.includes("INSTAGRAM") ? "border-pink-400 bg-pink-50 ring-2 ring-pink-100" : "border-slate-200 bg-white", !instagramConnected && "opacity-55")}><span className="flex size-11 items-center justify-center rounded-xl bg-white text-pink-600 shadow-sm"><InstagramIcon className="size-5" /></span><span><span className="block font-black text-slate-950">Instagram</span><span className="text-xs text-slate-500">{instagramConnected ? "Connecté" : "À connecter"}</span></span>{selectedChannels.includes("INSTAGRAM") && <CheckCircle2 className="ml-auto size-5 text-pink-600" />}</button>
            </div>
            {selectedChannels.includes("INSTAGRAM") && !hasPoster && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Sans affiche, les rappels seront publiés uniquement sur Facebook.</p>}
            {(!facebookConnected || !instagramConnected) && <Link href="/dashboard/settings/channels" className="mt-2 inline-flex text-xs font-bold text-violet-700 hover:underline">Configurer mes réseaux</Link>}
          </div>

          <div className="mt-7">
            <p className="text-sm font-black text-slate-900">4. Mode de publication</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setScheduleMode("notification")} className={cn("rounded-2xl border p-4 text-left transition", scheduleMode === "notification" ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100" : "border-slate-200")}><ShieldCheck className="size-5 text-emerald-700" /><span className="mt-3 block font-black text-slate-950">Validation avant publication</span><span className="mt-1 block text-xs leading-5 text-slate-500">David vous prévient lorsque le contenu est prêt.</span></button>
              <button type="button" onClick={() => setScheduleMode("automatic")} className={cn("rounded-2xl border p-4 text-left transition", scheduleMode === "automatic" ? "border-fuchsia-400 bg-fuchsia-50 ring-2 ring-fuchsia-100" : "border-slate-200")}><Zap className="size-5 text-fuchsia-700" /><span className="mt-3 block font-black text-slate-950">Publication automatique</span><span className="mt-1 block text-xs leading-5 text-slate-500">David publie directement au moment prévu.</span></button>
            </div>
          </div>

          <Button type="button" size="xl" loading={saving} disabled={saving || uploading} onClick={() => void configureCampaign()} className="mt-7 w-full rounded-2xl bg-[#d92d7c] font-black shadow-lg shadow-pink-100 hover:bg-[#c5236e]"><Sparkles className="size-5" />Activer les rappels</Button>
        </section>
      ) : (
        <div className="flex justify-end"><Button type="button" onClick={resetForm} className="rounded-2xl bg-[#421388] hover:bg-[#35106f]"><Plus className="size-4" />Nouvelle campagne</Button></div>
      )}

      {campaignRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950">Vos rappels programmés</h2>
          {campaignRows.map((automation) => {
            const campaign = getCampaign(automation);
            if (!campaign) return null;
            const active = automation.isActive && automation.status === "ACTIVE";
            return (
              <article key={automation.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}><CalendarClock className="size-6" /></span>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-black text-slate-950">{campaign.eventName}</h3><span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{active ? "Active" : "En pause"}</span></div><p className="mt-1 text-sm text-slate-500">{campaign.reminders.map((reminder) => reminder.label).join(" · ")} · 10:00</p><p className="mt-1 text-xs font-semibold text-slate-500">{campaign.channels.map((channel) => channel === "FACEBOOK" ? "Facebook" : "Instagram").join(" + ")} · {campaign.scheduleMode === "automatic" ? "Automatique" : "Avec validation"}</p>{automation.nextRunAt && active && <p className="mt-2 text-xs font-bold text-violet-700">Prochain rappel : {formatDate(automation.nextRunAt, timezone, true)}</p>}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button type="button" variant="outline" disabled={busyId === automation.id} onClick={() => editCampaign(automation)} className="h-12 rounded-xl px-3"><Pencil className="size-4" /><span className="hidden sm:inline">Modifier</span></Button>
                    <Button type="button" disabled={!active || busyId === automation.id} onClick={() => void pauseCampaign(automation)} className="h-12 rounded-xl bg-amber-500 px-3 hover:bg-amber-600"><Pause className="size-4" /><span className="hidden sm:inline">Pause</span></Button>
                    <Button type="button" disabled={!active || busyId === automation.id} onClick={() => void publishNext(automation)} className="h-12 rounded-xl bg-emerald-600 px-3 hover:bg-emerald-700">{busyId === automation.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}<span className="hidden sm:inline">Publier</span></Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {newEventOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setNewEventOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="new-event-title" className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><div><h2 id="new-event-title" className="text-xl font-black text-slate-950">Ajouter un événement</h2><p className="mt-1 text-sm text-slate-500">Les informations essentielles uniquement.</p></div><button type="button" onClick={() => setNewEventOpen(false)} className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X className="size-5" /></button></div>
            <div className="mt-5 space-y-3">
              <input value={newEvent.title} onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))} placeholder="Nom de l’événement" className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
              <div className="grid grid-cols-2 gap-3"><input type="date" min={todayISO(new Date(), timezone)} value={newEvent.date} onChange={(event) => setNewEvent((current) => ({ ...current, date: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none" /><input type="time" value={newEvent.time} onChange={(event) => setNewEvent((current) => ({ ...current, time: event.target.value }))} className="h-12 rounded-2xl border border-slate-200 px-3 text-sm focus:border-violet-400 focus:outline-none" /></div>
              <div className="relative"><MapPin className="pointer-events-none absolute left-4 top-3.5 size-5 text-slate-400" /><input value={newEvent.location} onChange={(event) => setNewEvent((current) => ({ ...current, location: event.target.value }))} placeholder="Lieu (optionnel)" className="h-12 w-full rounded-2xl border border-slate-200 pl-11 pr-4 text-sm focus:border-violet-400 focus:outline-none" /></div>
              <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-violet-300 bg-violet-50 p-4"><span className="flex size-11 items-center justify-center rounded-xl bg-white text-violet-700"><ImagePlus className="size-5" /></span><span><span className="block text-sm font-black text-slate-950">Ajouter une affiche</span><span className="text-xs text-slate-500">Facultatif · utile pour Instagram</span></span><input type="file" accept="image/*" disabled={uploading} onChange={(event) => void uploadPoster(event.target.files)} className="sr-only" />{uploading && <Loader2 className="ml-auto size-5 animate-spin text-violet-700" />}{newEvent.coverImageUrl && !uploading && <CheckCircle2 className="ml-auto size-5 text-emerald-600" />}</label>
            </div>
            <Button type="button" size="xl" disabled={uploading} onClick={confirmNewEvent} className="mt-5 w-full rounded-2xl bg-[#421388] hover:bg-[#35106f]"><Check className="size-5" />Utiliser cet événement</Button>
          </div>
        </div>
      )}
    </div>
  );
}
