"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import {
  CalendarCheck2,
  CalendarRange,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAVID_AUTOMATION_IMAGE_URL } from "@/components/automations/automation-design-kit";
import { WeeklyPoster, POSTER_SIZE } from "@/components/weekly-images/weekly-templates";
import { WEEKLY_IMAGE_STYLES, isWeeklyImageStyleId, type WeeklyImageStyleId } from "@/lib/automation/weekly-images";
import type { EventRecapSettings, RecapHistory } from "@/lib/automation/event-recap";
import type { MonthlyHistory, MonthlySettings } from "@/lib/automation/monthly-program-recap";
import { cn } from "@/lib/utils";

type RecapScope = "event" | "monthly";
type SocialChannel = "FACEBOOK" | "INSTAGRAM";

interface Community {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  timezone: string;
  tone: string;
  plan: string;
}

interface RecapEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  coverImageUrl: string | null;
  status: string;
  location: string | null;
  mediaFiles: Array<{ url: string; type: string }> | null;
  inTargetMonth: boolean;
}

interface RecapAutomation {
  id: string;
  name: string;
  isActive: boolean;
  status: string;
  nextRunAt: string | null;
  triggerConfig: Record<string, unknown> | null;
  updatedAt: string;
}

interface Props {
  community: Community;
  events: RecapEvent[];
  targetMonth: string;
  focusScope: RecapScope | null;
  focusEventId: string | null;
  eventAutomation: RecapAutomation | null;
  monthlyAutomation: RecapAutomation | null;
  eventSettings: EventRecapSettings;
  monthlySettings: MonthlySettings;
  eventHistory: RecapHistory;
  monthlyHistory: MonthlyHistory;
  legacyProgramHistory: MonthlyHistory;
  connectedChannels: string[];
}

const CHANNEL_META: Record<SocialChannel, { label: string; color: string; logo: React.ReactNode }> = {
  FACEBOOK: {
    label: "Facebook",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    logo: (
      <svg className="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.378 14.192 5 15.115 5H18V0h-3.808C10.596 0 9 1.583 9 4.615V8Z" />
      </svg>
    ),
  },
  INSTAGRAM: {
    label: "Instagram",
    color: "border-pink-200 bg-pink-50 text-pink-700",
    logo: (
      <svg className="size-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-0" />
      </svg>
    ),
  },
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

function automationIsActive(automation: RecapAutomation | null) {
  return Boolean(automation?.isActive && automation.status === "ACTIVE");
}

function uniqueEventImages(events: RecapEvent[], selectedIds: Set<string>) {
  const urls: string[] = [];
  for (const event of events) {
    if (!selectedIds.has(event.id)) continue;
    if (event.coverImageUrl) urls.push(event.coverImageUrl);
    for (const media of event.mediaFiles ?? []) {
      if (media.type === "IMAGE" && media.url) urls.push(media.url);
    }
  }
  return Array.from(new Set(urls)).slice(0, 10);
}

export function RecapAutoClient({
  community,
  events,
  targetMonth,
  focusScope,
  focusEventId,
  eventAutomation,
  monthlyAutomation,
  eventSettings,
  monthlySettings,
  eventHistory,
  monthlyHistory,
  legacyProgramHistory,
  connectedChannels,
}: Props) {
  const router = useRouter();
  const monthlyEvents = useMemo(() => events.filter((event) => event.inTargetMonth), [events]);
  const initialScope: RecapScope = focusScope ?? (focusEventId ? "event" : "monthly");
  const initialEventId = focusEventId && events.some((event) => event.id === focusEventId) ? focusEventId : events[0]?.id;

  const [scope, setScope] = useState<RecapScope>(initialScope);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    () => new Set(initialScope === "event" ? (initialEventId ? [initialEventId] : []) : monthlyEvents.map((event) => event.id))
  );
  const [eventActive, setEventActive] = useState(automationIsActive(eventAutomation));
  const [monthlyActive, setMonthlyActive] = useState(automationIsActive(monthlyAutomation));
  const [savingAutomation, setSavingAutomation] = useState<RecapScope | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<SocialChannel[]>(
    () => (["FACEBOOK", "INSTAGRAM"] as SocialChannel[]).filter((channel) => connectedChannels.includes(channel))
  );
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [removedDefaultPhotos, setRemovedDefaultPhotos] = useState<Set<string>>(new Set());
  const [styleId, setStyleId] = useState<WeeklyImageStyleId>(
    isWeeklyImageStyleId(monthlySettings.selectedRecapBackgroundId) ? monthlySettings.selectedRecapBackgroundId : "grid"
  );
  const [caption, setCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const selectedEvents = events.filter((event) => selectedEventIds.has(event.id));
  const defaultPhotos = uniqueEventImages(events, selectedEventIds).filter((url) => !removedDefaultPhotos.has(url));
  const photos = Array.from(new Set([...defaultPhotos, ...uploadedPhotos])).slice(0, 10);
  const previewMonthLabel = formatMonth(targetMonth);

  function switchScope(nextScope: RecapScope) {
    setScope(nextScope);
    setSelectedEventIds(
      new Set(nextScope === "event" ? (events[0] ? [events[0].id] : []) : monthlyEvents.map((event) => event.id))
    );
    setUploadedPhotos([]);
    setRemovedDefaultPhotos(new Set());
    setCaption("");
    setError("");
    setNotice("");
  }

  function toggleEvent(eventId: string) {
    setSelectedEventIds((current) => {
      if (scope === "event") return new Set([eventId]);
      const next = new Set(current);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
    setCaption("");
  }

  async function toggleAutomation(target: RecapScope) {
    const isEvent = target === "event";
    const currentlyActive = isEvent ? eventActive : monthlyActive;
    setSavingAutomation(target);
    setError("");
    setNotice("");
    try {
      const endpoint = isEvent ? "/api/event-recap-auto/config" : "/api/monthly-program-recap-auto/config";
      const settings = isEvent
        ? { ...eventSettings, notificationTime: "10:00" }
        : { ...monthlySettings, recapNotificationDay: 0, recapNotificationTime: "10:00" };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: currentlyActive ? "pause" : "activate", settings }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "Mise à jour impossible.");
      if (isEvent) setEventActive(!currentlyActive);
      else setMonthlyActive(!currentlyActive);
      setNotice(currentlyActive ? "Automatisation mise en pause." : "Automatisation activée.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mise à jour impossible.");
    } finally {
      setSavingAutomation(null);
    }
  }

  async function generateCaption() {
    if (selectedEvents.length === 0) {
      setError("Sélectionnez au moins un événement.");
      return;
    }
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const endpoint = scope === "event" ? "/api/event-recap-auto/config" : "/api/monthly-program-recap-auto/config";
      const payload = scope === "event"
        ? { mode: "prepare-recap", eventId: selectedEvents[0].id }
        : { mode: "prepare-recap", eventIds: selectedEvents.map((event) => event.id), monthKey: targetMonth };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({})) as { caption?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "David n’a pas pu préparer le texte.");
      setCaption(data.caption ?? "");
      setNotice("Le texte a été préparé. Vous pouvez encore le modifier.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Génération impossible.");
    } finally {
      setGenerating(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    const remaining = 10 - photos.length;
    if (remaining <= 0) {
      setError("Vous pouvez ajouter jusqu’à 10 photos.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/attachment", { method: "POST", body: formData });
        const data = await response.json().catch(() => ({})) as { isImage?: boolean; url?: string };
        if (response.ok && data.isImage && data.url) urls.push(data.url);
      }
      setUploadedPhotos((current) => Array.from(new Set([...current, ...urls])).slice(0, 10));
    } catch {
      setError("Certaines photos n’ont pas pu être téléversées.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(url: string) {
    if (uploadedPhotos.includes(url)) setUploadedPhotos((current) => current.filter((photo) => photo !== url));
    else setRemovedDefaultPhotos((current) => new Set([...current, url]));
  }

  async function chooseStyle(nextStyleId: WeeklyImageStyleId) {
    setStyleId(nextStyleId);
    try {
      await fetch("/api/monthly-program-recap-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "save-selection", runType: "recap", templateId: nextStyleId }),
      });
    } catch {
      // Le style reste appliqué au récap courant si la préférence ne peut pas
      // être mémorisée immédiatement.
    }
  }

  async function buildVisualUrl() {
    if (photos.length === 1) return photos[0];
    const node = posterRef.current;
    if (!node) throw new Error("L’aperçu du récap est indisponible.");
    const dataUrl = await toPng(node, { width: POSTER_SIZE, height: POSTER_SIZE, pixelRatio: 1, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `recap-${Date.now()}.png`, { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/uploads/attachment", { method: "POST", body: formData });
    const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
    if (!response.ok || !data.url) throw new Error(data.error ?? "Le visuel n’a pas pu être enregistré.");
    return data.url;
  }

  async function publishRecap() {
    if (selectedEvents.length === 0) return setError("Sélectionnez au moins un événement.");
    if (photos.length === 0) return setError("Ajoutez au moins une photo.");
    if (!caption.trim()) return setError("Générez ou saisissez le texte du récap.");
    if (selectedChannels.length === 0) return setError("Sélectionnez au moins un réseau connecté.");
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const visualUrl = await buildVisualUrl();
      const endpoint = scope === "event" ? "/api/event-recap-auto/config" : "/api/monthly-program-recap-auto/config";
      const payload = scope === "event"
        ? {
            mode: "publish-recap",
            eventId: selectedEvents[0].id,
            caption: caption.trim(),
            channels: selectedChannels,
            photoUrls: [visualUrl],
          }
        : {
            mode: "publish-recap",
            monthKey: targetMonth,
            eventIds: selectedEvents.map((event) => event.id),
            caption: caption.trim(),
            channels: selectedChannels,
            visualUrls: [visualUrl],
          };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? "La publication a échoué.");
      setNotice("Votre récap a bien été publié.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La publication a échoué.");
    } finally {
      setPublishing(false);
    }
  }

  function shareOnWhatsApp() {
    if (!caption.trim()) return setError("Préparez d’abord le texte du récap.");
    window.open(`https://wa.me/?text=${encodeURIComponent(caption.trim())}`, "_blank", "noopener,noreferrer");
  }

  const historyRows = [
    ...Object.entries(eventHistory).map(([key, entry]) => ({
      key: `event-${key}`,
      label: events.find((event) => event.id === key)?.title ?? "Événement",
      type: "Événement",
      status: entry.status,
      date: entry.publishedAt ?? entry.notifiedOn ?? "",
    })),
    ...Object.entries(monthlyHistory).map(([key, entry]) => ({
      key: `month-${key}`,
      label: formatMonth(key),
      type: "Mois",
      status: entry.status,
      date: entry.publishedAt ?? entry.notifiedOn ?? "",
    })),
  ].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 10);
  const legacyProgramRows = Object.entries(legacyProgramHistory).sort(([left], [right]) => right.localeCompare(left)).slice(0, 6);

  return (
    <div className="container mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">
      <header className="relative overflow-hidden rounded-[2rem] border border-[#421388] bg-[#421388] px-5 py-6 text-white shadow-lg shadow-violet-950/15 sm:px-7">
        <div className="relative z-10 max-w-2xl pr-24 sm:pr-36">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-fuchsia-300" />
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Récap automatique</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-violet-100">Vos événements, vos photos, un récap prêt à publier.</p>
        </div>
        <div className="absolute -bottom-2 right-2 h-32 w-28 sm:right-8 sm:h-40 sm:w-36">
          <Image src={DAVID_AUTOMATION_IMAGE_URL} alt="David, assistant IA" fill unoptimized className="object-contain object-bottom" priority />
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <AutomationCard
          icon={<CalendarCheck2 className="size-5" />}
          title="Après chaque événement"
          description="Rappel le lendemain à 10 h, hors Chabbat et Yom Tov."
          active={eventActive}
          loading={savingAutomation === "event"}
          tone="fuchsia"
          onToggle={() => void toggleAutomation("event")}
        />
        <AutomationCard
          icon={<CalendarRange className="size-5" />}
          title="Récap du mois"
          description="Rappel le dernier jour du mois à 10 h."
          active={monthlyActive}
          loading={savingAutomation === "monthly"}
          tone="orange"
          onToggle={() => void toggleAutomation("monthly")}
        />
      </section>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="size-4" />{notice}
        </div>
      )}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Préparer un récap</h2>
            <p className="mt-1 text-sm text-slate-500">Tout se fait ici, puis vous validez la publication.</p>
          </div>
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <ScopeButton active={scope === "event"} onClick={() => switchScope("event")}>Un événement</ScopeButton>
            <ScopeButton active={scope === "monthly"} onClick={() => switchScope("monthly")}>Mois terminé</ScopeButton>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{scope === "event" ? "Choisissez l’événement" : `Événements de ${previewMonthLabel}`}</h3>
                  <p className="mt-1 text-xs text-slate-500">Seuls les événements terminés sont proposés.</p>
                </div>
                <span className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-xs font-black text-fuchsia-700">{selectedEvents.length} sélectionné{selectedEvents.length > 1 ? "s" : ""}</span>
              </div>
              {(scope === "event" ? events : monthlyEvents).length > 0 ? (
                <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {(scope === "event" ? events : monthlyEvents).map((event) => {
                    const selected = selectedEventIds.has(event.id);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => toggleEvent(event.id)}
                        className={cn(
                          "flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                          selected ? "border-fuchsia-300 bg-fuchsia-50" : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border", selected ? "border-fuchsia-600 bg-fuchsia-600 text-white" : "border-slate-300 text-transparent")}>
                          <Check className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-900">{event.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{formatEventDate(event.startDate)}{event.location ? ` · ${event.location}` : ""}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-center">
                  <p className="text-sm font-semibold text-slate-600">Aucun événement terminé pour cette période.</p>
                  <Link href="/dashboard/events" className="mt-2 inline-flex text-sm font-black text-[#421388]">Ouvrir l’Agenda IA</Link>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Photos du récap</h3>
                  <p className="mt-1 text-xs text-slate-500">Les images déjà liées aux événements sont ajoutées automatiquement.</p>
                </div>
                <span className="text-xs font-bold text-slate-400">{photos.length}/10</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void uploadPhotos(event.target.files)} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || photos.length >= 10}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-fuchsia-300 bg-fuchsia-50 text-sm font-black text-fuchsia-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                {uploading ? "Ajout en cours…" : "Ajouter des photos"}
              </button>
              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {photos.map((url, index) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removePhoto(url)} aria-label="Retirer la photo" className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-950/75 text-white">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {WEEKLY_IMAGE_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => void chooseStyle(style.id)}
                      className={cn("rounded-full border px-3 py-1.5 text-xs font-black", styleId === style.id ? "border-[#421388] bg-violet-50 text-[#421388]" : "border-slate-200 text-slate-500")}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Texte de la publication</h3>
                  <p className="mt-1 text-xs text-slate-500">David utilise uniquement les événements sélectionnés.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => void generateCaption()} disabled={generating} className="rounded-xl border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50">
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Générer avec l’IA
                </Button>
              </div>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Votre texte apparaîtra ici…"
                className="mt-3 min-h-32 w-full resize-y rounded-2xl border border-slate-200 p-3 text-sm leading-6 text-slate-800 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
              />
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500">Publier sur</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(Object.keys(CHANNEL_META) as SocialChannel[]).map((channel) => {
                    const meta = CHANNEL_META[channel];
                    const connected = connectedChannels.includes(channel);
                    const selected = selectedChannels.includes(channel);
                    return (
                      <button
                        key={channel}
                        type="button"
                        disabled={!connected}
                        onClick={() => setSelectedChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel])}
                        className={cn(
                          "flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black",
                          selected && connected ? meta.color : "border-slate-200 bg-white text-slate-400",
                          !connected && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <span className="flex size-8 items-center justify-center rounded-xl bg-white">{meta.logo}</span>
                        {meta.label}{!connected && <span className="text-[10px]">Non connecté</span>}
                      </button>
                    );
                  })}
                </div>
                {connectedChannels.length === 0 && <Link href="/dashboard/settings?tab=channels" className="mt-2 inline-flex text-xs font-black text-[#421388]">Connecter mes réseaux</Link>}
              </div>
            </section>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Button type="button" onClick={() => void publishRecap()} disabled={publishing} className="min-h-12 rounded-2xl bg-[#421388] text-sm font-black text-white hover:bg-[#35106f]">
                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Publier le récap
              </Button>
              <Button type="button" variant="outline" onClick={shareOnWhatsApp} className="min-h-12 rounded-2xl border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                Partager sur WhatsApp
              </Button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-5 lg:self-start">
            <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-400">Aperçu Instagram</p>
            <PhonePreview communityName={community.name} logoUrl={community.logoUrl} photos={photos} caption={caption} styleId={styleId} />
          </aside>
        </div>
      </section>

      {(historyRows.length > 0 || Object.keys(legacyProgramHistory).length > 0) && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">Historique des récaps</h2>
          <div className="mt-3 space-y-2">
            {historyRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{row.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{row.type}</p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">{row.status}</span>
              </div>
            ))}
            {legacyProgramRows.map(([monthKey, entry]) => (
              <div key={`legacy-${monthKey}`} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-black capitalize text-slate-700">{formatMonth(monthKey)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Ancien programme · lecture seule</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{entry.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div aria-hidden className="fixed left-[-99999px] top-0 opacity-0">
        <div ref={posterRef}>
          <WeeklyPoster styleId={styleId} photos={photos} logoUrl={community.logoUrl} subtitle={`Retour en images · ${previewMonthLabel}`} />
        </div>
      </div>
    </div>
  );
}

function AutomationCard({
  icon,
  title,
  description,
  active,
  loading,
  tone,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  loading: boolean;
  tone: "fuchsia" | "orange";
  onToggle: () => void;
}) {
  const color = tone === "fuchsia" ? "bg-fuchsia-100 text-fuchsia-700" : "bg-orange-100 text-orange-700";
  return (
    <article className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", color)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        aria-label={active ? `Mettre ${title} en pause` : `Activer ${title}`}
        aria-pressed={active}
        className={cn("relative h-8 w-14 shrink-0 rounded-full p-1 transition-colors", active ? "bg-emerald-500" : "bg-slate-300")}
      >
        <span className={cn("flex size-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform", active && "translate-x-6")}>
          {loading && <Loader2 className="size-3 animate-spin text-slate-500" />}
        </span>
      </button>
    </article>
  );
}

function ScopeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("min-h-10 rounded-xl px-3 text-xs font-black transition-colors", active ? "bg-white text-[#421388] shadow-sm" : "text-slate-500")}>
      {children}
    </button>
  );
}

function PhonePreview({
  communityName,
  logoUrl,
  photos,
  caption,
  styleId,
}: {
  communityName: string;
  logoUrl: string | null;
  photos: string[];
  caption: string;
  styleId: WeeklyImageStyleId;
}) {
  return (
    <div className="mx-auto aspect-[12/25] w-full max-w-[320px] rounded-[3.4rem] border-[5px] border-slate-900 bg-slate-900 p-1 shadow-2xl shadow-slate-950/35">
      <div className="relative flex h-full flex-col overflow-hidden rounded-[2.9rem] bg-white">
        <div className="flex h-11 shrink-0 items-end justify-center pb-1">
          <div className="h-6 w-24 rounded-full bg-slate-950" />
        </div>
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-[10px] font-black text-[#421388]">
            {logoUrl ? <Image src={logoUrl} alt="" width={32} height={32} className="h-full w-full object-contain" unoptimized /> : communityName.slice(0, 2).toUpperCase()}
          </span>
          <span className="truncate text-xs font-black text-slate-900">{communityName}</span>
        </div>
        <div className="aspect-square w-full shrink-0 overflow-hidden bg-slate-50">
          {photos.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <Camera className="size-8" />
              <span className="text-xs font-bold">Ajoutez vos photos</span>
            </div>
          ) : photos.length === 1 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0]} alt="Aperçu du récap" className="h-full w-full object-contain" />
          ) : (
            <div style={{ width: POSTER_SIZE, height: POSTER_SIZE, transform: "scale(0.287)", transformOrigin: "top left" }}>
              <WeeklyPoster styleId={styleId} photos={photos} logoUrl={logoUrl} subtitle="Retour en images" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 px-3 py-2 text-slate-800">
          <span className="text-xl">♡</span><span className="text-xl">○</span><span className="text-lg">➤</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8">
          <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700"><strong className="mr-1 text-slate-950">{communityName}</strong>{caption || "Votre texte apparaîtra ici."}</p>
        </div>
        <div className="absolute bottom-2 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-slate-300" />
      </div>
    </div>
  );
}
