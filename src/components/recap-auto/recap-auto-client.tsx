"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import {
  CalendarCheck2,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
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
type PublishLink = {
  channel: "Facebook" | "Instagram";
  url: string | null;
  success: boolean;
  error?: string | null;
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
    color: "border-blue-400 bg-gradient-to-br from-[#2878ef] to-[#175acb] text-white shadow-lg shadow-blue-200",
    logo: (
      <svg className="size-5 fill-current text-[#1877f2]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.378 14.192 5 15.115 5H18V0h-3.808C10.596 0 9 1.583 9 4.615V8Z" />
      </svg>
    ),
  },
  INSTAGRAM: {
    label: "Instagram",
    color: "border-pink-400 bg-gradient-to-br from-[#f64c89] to-[#d92d7c] text-white shadow-lg shadow-pink-200",
    logo: (
      <svg className="size-5 fill-none stroke-current stroke-2 text-[#d92d7c]" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-0" />
      </svg>
    ),
  },
};

function RecapPublishSuccessDialog({
  links,
  onClose,
}: {
  links: PublishLink[];
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="recap-publish-success-title"
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/80 bg-white text-center shadow-[0_30px_100px_rgba(15,23,42,0.4)]"
      >
        <div className="h-2 bg-gradient-to-r from-[#315ecb] via-[#7130d8] to-[#d92d7c]" />
        <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-4 top-5 flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#421388]">
          <X className="size-5" />
        </button>

        <div className="p-6 sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm shadow-emerald-200">
            <CheckCircle2 className="size-9" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Publication réussie</p>
          <h2 id="recap-publish-success-title" className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
            Votre récap a été publié
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            Retrouvez-le maintenant sur {links.length === 1 ? "le réseau sélectionné" : "les réseaux sélectionnés"}.
          </p>

          <div className="mt-6 grid gap-3">
            {links.map((link) => {
              const channelKey: SocialChannel = link.channel === "Instagram" ? "INSTAGRAM" : "FACEBOOK";
              const fallbackUrl = channelKey === "INSTAGRAM" ? "https://www.instagram.com/" : "https://www.facebook.com/";
              return (
                <a
                  key={link.channel}
                  href={link.url ?? fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl px-4 text-sm font-black text-white shadow-md transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4",
                    channelKey === "FACEBOOK"
                      ? "bg-[#315ecb] shadow-blue-200 focus-visible:ring-blue-200"
                      : "bg-gradient-to-r from-[#d92d7c] to-[#f06b45] shadow-rose-200 focus-visible:ring-rose-200"
                  )}
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white shadow-sm">
                    {CHANNEL_META[channelKey].logo}
                  </span>
                  Voir sur {link.channel}
                  <ExternalLink className="size-4 opacity-80" />
                </a>
              );
            })}
          </div>

          <Button type="button" variant="outline" onClick={onClose} className="mt-4 h-11 w-full rounded-2xl border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50">
            Fermer
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
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

  const scope: RecapScope = initialScope;
  const [selectedEventIds] = useState<Set<string>>(
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
  const [publishSuccessLinks, setPublishSuccessLinks] = useState<PublishLink[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const selectedEvents = events.filter((event) => selectedEventIds.has(event.id));
  const defaultPhotos = uniqueEventImages(events, selectedEventIds).filter((url) => !removedDefaultPhotos.has(url));
  const photos = Array.from(new Set([...defaultPhotos, ...uploadedPhotos])).slice(0, 10);
  const previewMonthLabel = formatMonth(targetMonth);

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
      const data = await response.json().catch(() => ({})) as {
        success?: boolean;
        links?: PublishLink[];
        error?: string;
      };
      if (!response.ok || !data.success) throw new Error(data.error ?? "La publication a échoué.");
      const successfulLinks = (data.links ?? []).filter((link) => link.success);
      if (successfulLinks.length === 0) {
        const details = (data.links ?? []).map((link) => link.error).filter(Boolean).join(" ");
        throw new Error(details || "La publication n’a pas été confirmée sur les réseaux sélectionnés.");
      }
      setNotice("Votre récap a bien été publié.");
      setPublishSuccessLinks(successfulLinks);
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
    <div className="container mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
      <header className="relative order-1 min-h-[11rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_72%_12%,#7028bd_0%,#421388_45%,#210763_100%)] px-5 py-5 text-white shadow-[0_24px_58px_rgba(49,13,108,0.26)] sm:min-h-[17rem] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-52 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="relative z-10 max-w-[72%] sm:max-w-3xl">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20 sm:size-12"><CalendarCheck2 className="size-6" /></span>
          <h1 className="mt-4 text-[clamp(1.9rem,8.5vw,2.75rem)] font-black uppercase leading-[1.03] tracking-[-0.04em] sm:mt-5 sm:text-4xl">Récap automatique</h1>
          <p className="mt-3 hidden text-sm font-semibold leading-6 text-white/80 sm:block sm:text-base">Vos événements, vos photos, un récap prêt à publier.</p>
        </div>
        <Image src={DAVID_AUTOMATION_IMAGE_URL} alt="David, assistant IA" width={240} height={280} unoptimized className="pointer-events-none absolute -bottom-3 -right-5 z-10 h-[10.5rem] w-auto object-contain object-bottom drop-shadow-[0_18px_24px_rgba(12,2,35,0.34)] sm:-right-2 sm:h-[16rem]" priority />
      </header>

      <section className="order-3 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0faeb3] to-[#078e9b] text-white shadow-lg shadow-teal-200"><Sparkles className="size-5" /></span>
          <div><h2 className="text-xl font-black uppercase leading-tight text-slate-950">Automatisez vos récaps</h2><p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Activez séparément les rappels après événement et le récap mensuel.</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
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
        </div>
      </section>

      {notice && (
        <div className="order-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="size-4" />{notice}
        </div>
      )}
      {error && <div className="order-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <section className="relative order-2 overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-4 shadow-[0_18px_46px_rgba(66,19,136,0.09)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-violet-300/15 blur-3xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7130d8] to-[#d92d7c] text-white shadow-lg shadow-violet-200"><Sparkles className="size-5" /></span>
            <div>
            <h2 className="text-xl font-black uppercase leading-tight text-slate-950">Préparer un récap</h2>
            <p className="mt-1 text-base font-medium leading-6 text-slate-600">Tout se fait ici, puis vous validez la publication.</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="space-y-4">
            <section className="rounded-[1.6rem] border border-fuchsia-100 bg-[#fffaf4] p-4 shadow-[0_12px_30px_rgba(217,45,124,0.07)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black uppercase leading-tight text-slate-900">Photos du récap</h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-600">Les images déjà liées aux événements sont ajoutées automatiquement.</p>
                </div>
                <span className="text-sm font-bold text-slate-500">{photos.length}/10</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void uploadPhotos(event.target.files)} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || photos.length >= 10}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-fuchsia-300 bg-gradient-to-r from-fuchsia-50 to-violet-50 text-base font-black text-fuchsia-700 transition hover:border-fuchsia-500 hover:shadow-md disabled:opacity-50"
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
                      className={cn("rounded-full border px-3 py-2 text-sm font-black transition", styleId === style.id ? "border-[#421388] bg-gradient-to-r from-[#7130d8] to-[#421388] text-white shadow-md shadow-violet-200" : "border-violet-100 bg-white text-slate-600 hover:border-violet-300")}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[1.6rem] border border-violet-100 bg-[#fffaf4] p-4 shadow-[0_12px_30px_rgba(66,19,136,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black uppercase leading-tight text-slate-900">Texte de la publication</h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-600">David utilise uniquement les événements sélectionnés.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => void generateCaption()} disabled={generating} className="rounded-xl border-fuchsia-300 bg-gradient-to-r from-fuchsia-50 to-violet-50 font-black text-fuchsia-700 shadow-sm hover:bg-fuchsia-100">
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Générer avec l’IA
                </Button>
              </div>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Votre texte apparaîtra ici…"
                className="mt-3 min-h-36 w-full resize-y rounded-2xl border border-violet-100 bg-white p-4 text-base font-medium leading-7 text-slate-800 shadow-inner outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
              />
              <div className="mt-4">
                <p className="text-sm font-black uppercase tracking-wide text-slate-600">Publier sur</p>
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
                          "flex min-h-13 items-center justify-center gap-2 rounded-2xl border px-3 text-base font-black transition hover:-translate-y-0.5",
                          selected && connected ? meta.color : "border-slate-200 bg-white text-slate-400",
                          !connected && "cursor-not-allowed opacity-60 hover:translate-y-0"
                        )}
                      >
                        <span className="flex size-8 items-center justify-center rounded-xl bg-white">{meta.logo}</span>
                        {meta.label}{!connected && <span className="text-[10px]">Non connecté</span>}
                      </button>
                    );
                  })}
                </div>
                {connectedChannels.length === 0 && <Link href="/dashboard/settings?tab=channels" className="mt-2 inline-flex text-sm font-black text-[#421388]">Connecter mes réseaux</Link>}
              </div>
            </section>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Button type="button" onClick={() => void publishRecap()} disabled={publishing} className="min-h-13 rounded-2xl bg-gradient-to-r from-[#7130d8] via-[#5c24ad] to-[#d92d7c] text-base font-black text-white shadow-lg shadow-violet-200 hover:brightness-105">
                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Publier le récap
              </Button>
              <Button type="button" variant="outline" onClick={shareOnWhatsApp} className="min-h-12 rounded-2xl border-emerald-300 bg-emerald-50 font-black text-emerald-700 shadow-sm hover:bg-emerald-100">
                Partager sur WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </section>

      {(historyRows.length > 0 || Object.keys(legacyProgramHistory).length > 0) && (
        <section className="order-5 overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffaf4] shadow-[0_14px_36px_rgba(66,19,136,0.08)]">
          <button type="button" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen} aria-controls="recap-history-content" className="flex min-h-20 w-full items-center justify-between gap-4 px-5 text-left transition hover:bg-violet-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500">
            <span className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffbd17] to-[#ee9100] text-white shadow-lg shadow-amber-200"><CalendarRange className="size-5" /></span>
              <span><span className="block text-lg font-black uppercase text-slate-900">Historique des récaps</span><span className="mt-1 block text-sm font-semibold text-slate-600">{historyRows.length + legacyProgramRows.length} élément{historyRows.length + legacyProgramRows.length > 1 ? "s" : ""}</span></span>
            </span>
            <ChevronDown className={cn("size-5 shrink-0 text-violet-700 transition-transform duration-200", historyOpen && "rotate-180")} />
          </button>
          {historyOpen && <div id="recap-history-content" className="space-y-2 border-t border-violet-100 bg-white p-4 sm:p-5">
            {historyRows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-[#fffaf4] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-slate-900">{row.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{row.type}</p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">{row.status}</span>
              </div>
            ))}
            {legacyProgramRows.map(([monthKey, entry]) => (
              <div key={`legacy-${monthKey}`} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3">
                <div>
                  <p className="text-base font-black capitalize text-slate-800">{formatMonth(monthKey)}</p>
                  <p className="mt-1 text-sm text-slate-500">Ancien programme · lecture seule</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{entry.status}</span>
              </div>
            ))}
          </div>}
        </section>
      )}

      <div aria-hidden className="fixed left-[-99999px] top-0 opacity-0">
        <div ref={posterRef}>
          <WeeklyPoster styleId={styleId} photos={photos} logoUrl={community.logoUrl} subtitle={`Retour en images · ${previewMonthLabel}`} />
        </div>
      </div>

      {publishSuccessLinks ? (
        <RecapPublishSuccessDialog
          links={publishSuccessLinks}
          onClose={() => setPublishSuccessLinks(null)}
        />
      ) : null}
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
  const color = tone === "fuchsia"
    ? "bg-gradient-to-br from-[#f64c89] to-[#d92d7c] text-white shadow-pink-200"
    : "bg-gradient-to-br from-[#ff9f1c] to-[#f36b16] text-white shadow-orange-200";
  return (
    <article className="flex items-center gap-3 rounded-[1.6rem] border border-violet-100 bg-[#fffaf4] p-4 shadow-[0_14px_34px_rgba(66,19,136,0.08)]">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-lg", color)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-black uppercase leading-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{description}</p>
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
