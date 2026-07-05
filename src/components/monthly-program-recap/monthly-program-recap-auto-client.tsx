"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DavidAutomationCard, DavidBannerAgent } from "@/components/automations/automation-design-kit";
import { CalendarDays, CheckCircle2, ChevronDown, Clock, History, ImagePlus, Loader2, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "@/lib/utils";
import {
  MONTHLY_CHANNELS,
  MAX_PROGRAM_EVENTS,
  MAX_RECAP_PHOTOS,
  monthLabel as monthKeyLabel,
  type MonthlyChannel,
  type MonthlySettings,
  type MonthlyHistory,
} from "@/lib/automation/monthly-program-recap";
import { WEEKLY_IMAGE_STYLES, isWeeklyImageStyleId, type WeeklyImageStyleId } from "@/lib/automation/weekly-images";
import { WeeklyPoster, POSTER_SIZE } from "@/components/weekly-images/weekly-templates";
import { ProgramPoster, type ProgramEvent } from "./monthly-templates";

const CHANNEL_LOGOS: Record<MonthlyChannel, React.ReactNode> = {
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
const CHANNEL_LABELS: Record<MonthlyChannel, string> = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", WHATSAPP: "WhatsApp", EMAIL: "Email" };
const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23dfe6f0'/></svg>";
const PREVIEW_PHOTOS = [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER, PLACEHOLDER];

const TZ = "Europe/Paris";
const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

interface Community { id: string; name: string; logoUrl: string | null; city: string | null; timezone: string; tone: string; plan: string }
interface EventRow { id: string; title: string; startDate: string; endDate: string | null; coverImageUrl: string | null; status: string }
interface MonthlyAutomation { id: string; name: string; isActive: boolean; status: string; nextRunAt: string | null; triggerConfig: Record<string, unknown> | null; updatedAt: string }
interface Props {
  community: Community;
  upcomingEvents: EventRow[];
  automation: MonthlyAutomation | null;
  settings: MonthlySettings;
  programHistory: MonthlyHistory;
  recapHistory: MonthlyHistory;
  focusType: "program" | "recap" | null;
}

type View = "overview" | "models" | "customize" | "success";
type RunType = "program" | "recap";

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function eventDateISO(e: EventRow) { return e.startDate.slice(0, 10); }
function eventTime(e: EventRow) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(e.startDate));
}

export function MonthlyProgramRecapAutoClient({ community, upcomingEvents, automation, settings, programHistory, recapHistory, focusType }: Props) {
  const [view, setView] = useState<View>("overview");
  const [runType, setRunType] = useState<RunType>("program");
  const [localSettings, setLocalSettings] = useState<MonthlySettings>(settings);
  const [automationId, setAutomationId] = useState<string | null>(automation?.id ?? null);
  const [isActive, setIsActive] = useState<boolean>(automation?.status === "ACTIVE");
  const [nextRunAt, setNextRunAt] = useState<string | null>(automation?.nextRunAt ?? null);

  const [statusOpen, setStatusOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(automation === null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  // Programme
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [manualEvents, setManualEvents] = useState<ProgramEvent[]>([]);
  const [manualDraft, setManualDraft] = useState<ProgramEvent>({ name: "", date: "", time: "", location: "" });
  // RÃ©cap
  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const recapStyleId: WeeklyImageStyleId = isWeeklyImageStyleId(localSettings.selectedRecapBackgroundId)
    ? localSettings.selectedRecapBackgroundId
    : "grid";

  useEffect(() => {
    if (focusType) openFlow(focusType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusType]);

  async function postConfig(payload: Record<string, unknown>) {
    const res = await fetch("/api/monthly-program-recap-auto/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur");
    return data as MonthlyAutomation & { success?: boolean; caption?: string };
  }

  async function setActiveState(next: boolean) {
    setStatusOpen(false);
    setShowWelcome(false);
    if (next === isActive) return;
    setError("");
    setSaving(true);
    try {
      const data = await postConfig(next ? { mode: "activate", settings: localSettings } : { mode: "pause" });
      setAutomationId(data.id ?? automationId);
      setIsActive(next);
      setNextRunAt(data.nextRunAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function beginConfiguration() {
    await setActiveState(true);
    setView("models");
  }

  async function saveDetail(partial: Partial<MonthlySettings>) {
    const updated = { ...localSettings, ...partial };
    setLocalSettings(updated);
    try {
      const data = await postConfig({ mode: "update-notification-detail", settings: updated });
      setAutomationId(data.id ?? automationId);
      setNextRunAt(data.nextRunAt ?? nextRunAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  function toggleChannel(channel: MonthlyChannel) {
    setLocalSettings((s) => {
      const has = s.channels.includes(channel);
      const next = has ? s.channels.filter((c) => c !== channel) : [...s.channels, channel];
      if (next.length === 0) return s;
      const updated = { ...s, channels: next };
      void postConfig({ mode: "update-notification-detail", settings: updated }).catch(() => {});
      return updated;
    });
  }

  async function chooseRecapStyle(styleId: WeeklyImageStyleId) {
    setError("");
    setSaving(true);
    try {
      const data = await postConfig({ mode: "save-selection", runType: "recap", templateId: styleId });
      setAutomationId(data.id ?? automationId);
      setLocalSettings((s) => ({ ...s, selectedRecapBackgroundId: styleId, selectedProgramBackgroundId: s.selectedProgramBackgroundId ?? "program-default" }));
      setView("overview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  function openFlow(type: RunType) {
    setRunType(type);
    setSelectedEventIds(new Set(type === "program" ? upcomingEvents.map((e) => e.id) : []));
    setManualEvents([]);
    setManualDraft({ name: "", date: "", time: "", location: "" });
    setPhotos([]);
    setCaption("");
    setError("");
    setShowWelcome(false);
    setView("customize");
    void prepareCaption(type);
  }

  async function prepareCaption(type: RunType) {
    try {
      const data = await postConfig({ mode: type === "program" ? "prepare-program" : "prepare-recap" });
      if (data.caption) setCaption(data.caption);
    } catch {
      /* texte Ã©ditable */
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_RECAP_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_RECAP_PHOTOS} photos.`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/uploads/attachment", { method: "POST", body: form });
        const data = await res.json();
        if (res.ok && data.isImage && data.url) urls.push(data.url as string);
      }
      setPhotos((prev) => [...prev, ...urls].slice(0, MAX_RECAP_PHOTOS));
    } catch {
      setError("Erreur lors du tÃ©lÃ©versement.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const programEvents: ProgramEvent[] = [
    ...upcomingEvents.filter((e) => selectedEventIds.has(e.id)).map((e) => ({ name: e.title, date: eventDateISO(e), time: eventTime(e), location: null })),
    ...manualEvents,
  ];

  async function capturePosterUrl(): Promise<string> {
    const node = posterRef.current;
    if (!node) throw new Error("AperÃ§u indisponible.");
    const dataUrl = await toPng(node, { width: POSTER_SIZE, height: POSTER_SIZE, pixelRatio: 1, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `${runType}-${Date.now()}.png`, { type: "image/png" });
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads/attachment", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error("Ã‰chec du tÃ©lÃ©versement de l'affiche.");
    return data.url as string;
  }

  async function publish() {
    if (!caption.trim()) {
      setError("PrÃ©parez le texte de la publication.");
      return;
    }
    if (runType === "program" && programEvents.length === 0) {
      setError("SÃ©lectionnez ou ajoutez au moins un Ã©vÃ©nement.");
      return;
    }
    if (runType === "recap" && photos.length === 0) {
      setError("Ajoutez au moins une photo.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      let visualUrls: string[];
      if (runType === "recap" && photos.length === 1) {
        visualUrls = [photos[0]];
      } else {
        visualUrls = [await capturePosterUrl()];
      }
      const data = await postConfig({
        mode: runType === "program" ? "publish-program" : "publish-recap",
        caption: caption.trim(),
        channels: localSettings.channels,
        visualUrls,
      });
      if (!data.success) {
        setError("Ã‰chec de la publication.");
        return;
      }
      setView("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur rÃ©seau lors de la publication.");
    } finally {
      setPublishing(false);
    }
  }

  const header = (
    <div className="relative overflow-hidden rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/20">
      <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
        <div className="rounded-full bg-white/[0.04] p-5">
          <CalendarDays className="size-28 text-white/[0.08]" strokeWidth={1.6} />
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="relative">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-white/80" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Programme &amp; récap du mois</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/82">
            Préparez le programme du mois et partagez le récap sur Instagram, Facebook, WhatsApp et Email en un clic.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Link href="/dashboard/events">
            <Button size="sm" variant="outline" className="h-9 rounded-xl border-white/25 bg-white/12 px-4 text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:text-white">
              <CalendarDays className="size-4" />
              Voir dans l&apos;Agenda IA
            </Button>
          </Link>
          <DavidBannerAgent
            className="sm:max-w-xl"
            text="Je suis David votre assistant IA, je vous aide à préparer le programme du mois et le récap au bon moment"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <div className="relative">
          <Button type="button" variant="outline" disabled={saving} className="border-white/20 bg-white/12 text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/18 hover:text-white" onClick={() => setStatusOpen((o) => !o)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <span className={cn("size-2.5 rounded-full", isActive ? "bg-emerald-400" : "bg-slate-300")} />}
            {isActive ? "Active" : "Désactivée"}
            <ChevronDown className="size-4" />
          </Button>
          {statusOpen && (
            <div className="absolute bottom-full right-0 z-20 mb-2 w-48 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-lg">
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => void setActiveState(true)}><span className="size-2.5 rounded-full bg-emerald-500" />Active</button>
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => void setActiveState(false)}><span className="size-2.5 rounded-full bg-slate-300" />Désactivée</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const channelSelector = (
    <div className="mt-3">
      <span className="text-xs text-slate-400">Publier sur&nbsp;:</span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {MONTHLY_CHANNELS.map((c) => {
          const active = localSettings.channels.includes(c);
          return (
            <button key={c} type="button" onClick={() => toggleChannel(c)} aria-pressed={active}
              className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition", active ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-400 hover:border-slate-300")}>
              {CHANNEL_LOGOS[c]}{CHANNEL_LABELS[c]}{active && <CheckCircle2 className="size-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  // NÅ“ud de capture hors Ã©cran (programme ou rÃ©cap selon le flux).
  const captureNode = (
    <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none", opacity: 0 }}>
      <div ref={posterRef}>
        {runType === "program" ? (
          <ProgramPoster events={programEvents} logoUrl={community.logoUrl} monthLabel={new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: TZ }).format(new Date())} />
        ) : (
          <WeeklyPoster styleId={recapStyleId} photos={photos} logoUrl={community.logoUrl} subtitle="Retour en images sur le mois" />
        )}
      </div>
    </div>
  );

  // â”€â”€ MODELS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "models") {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button onClick={() => setView("overview")} className="mb-4 text-sm font-medium text-white/75 hover:text-white">← Retour</button>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Choisissez vos fonds</h1>
            </div>
            <DavidBannerAgent
              className="sm:max-w-xl"
              text="Je suis David votre assistant IA, je vous aide à choisir les bons fonds pour le programme et le récap du mois"
            />
          </div>
        </div>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-6 shadow-sm shadow-[#421388]/5">
          <h2 className="text-base font-bold text-slate-900">Fond â€” RÃ©cap du mois</h2>
          <p className="mt-1 text-sm text-slate-500">Mise en page utilisÃ©e pour le rÃ©cap en images.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WEEKLY_IMAGE_STYLES.map((style) => {
              const active = localSettings.selectedRecapBackgroundId === style.id;
              return (
                <button key={style.id} type="button" disabled={saving} onClick={() => void chooseRecapStyle(style.id)}
                  className={cn("group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60", active ? "border-violet-500 ring-2 ring-violet-200" : "border-slate-200")}>
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-100 p-2">
                    <div style={{ width: 288, height: 288, overflow: "hidden", borderRadius: 14, boxShadow: "0 6px 20px rgba(15,23,42,0.12)" }}>
                      <div style={{ width: POSTER_SIZE, height: POSTER_SIZE, transform: `scale(${288 / POSTER_SIZE})`, transformOrigin: "top left" }}>
                        <WeeklyPoster styleId={style.id} photos={PREVIEW_PHOTOS} logoUrl={community.logoUrl} subtitle={style.subtitle} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="truncate text-sm font-semibold text-slate-800">{style.name}</span>
                    {active && <CheckCircle2 className="size-4 text-violet-600" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-6 shadow-sm shadow-[#421388]/5">
          <h2 className="text-base font-bold text-slate-900">Fond â€” Programme du mois</h2>
          <p className="mt-1 text-sm text-slate-500">Mise en page utilisÃ©e pour la liste des Ã©vÃ©nements Ã  venir.</p>
          <div className="mt-4 flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-2">
            <div style={{ width: 288, height: 288, overflow: "hidden", borderRadius: 14, boxShadow: "0 6px 20px rgba(15,23,42,0.12)" }}>
              <div style={{ width: POSTER_SIZE, height: POSTER_SIZE, transform: `scale(${288 / POSTER_SIZE})`, transformOrigin: "top left" }}>
                <ProgramPoster events={[{ name: "Cours de Torah", date: "2026-06-03", time: "20:30" }, { name: "SoirÃ©e communautaire", date: "2026-06-12", time: "19:00" }]} logoUrl={community.logoUrl} monthLabel="ce mois-ci" />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // â”€â”€ CUSTOMIZE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "customize") {
    const isProgram = runType === "program";
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setView("overview")} className="text-sm font-medium text-slate-500 hover:text-slate-700">â† Retour</button>
          <span className="text-sm font-semibold text-slate-900">{isProgram ? "Programme du mois" : "RÃ©cap du mois"}</span>
        </div>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-sm leading-6 text-violet-800">
          {isProgram
            ? "Les Ã©vÃ©nements proviennent de votre Agenda IA. Aucun Ã©vÃ©nement n'est inventÃ©."
            : "Les photos sont conservÃ©es telles quelles. Aucune retouche n'est appliquÃ©e."}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            {isProgram ? (
              <>
                <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
                  <h2 className="text-sm font-bold text-slate-900">Ã‰vÃ©nements Ã  venir (Agenda IA)</h2>
                  {upcomingEvents.length === 0 ? (
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Aucun Ã©vÃ©nement Ã  venir. Ajoutez-en ci-dessous.</p>
                  ) : (
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                      {upcomingEvents.map((e) => {
                        const checked = selectedEventIds.has(e.id);
                        return (
                          <button key={e.id} type="button" onClick={() => setSelectedEventIds((prev) => { const n = new Set(prev); if (n.has(e.id)) n.delete(e.id); else if (n.size < MAX_PROGRAM_EVENTS) n.add(e.id); return n; })}
                            className={cn("flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition", checked ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300")}>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-800">{e.title}</span>
                              <span className="block text-xs text-slate-400">{new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "long" }).format(new Date(e.startDate))} Â· {eventTime(e)}</span>
                            </span>
                            <span className={cn("flex size-5 flex-shrink-0 items-center justify-center rounded-md border", checked ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300 bg-white")}>{checked && <CheckCircle2 className="size-3.5" />}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
                  <h2 className="text-sm font-bold text-slate-900">Ajouter un Ã©vÃ©nement</h2>
                  <div className="mt-3 space-y-2">
                    <input value={manualDraft.name ?? ""} onChange={(e) => setManualDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Nom de l'Ã©vÃ©nement" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="date" value={manualDraft.date ?? ""} onChange={(e) => setManualDraft((d) => ({ ...d, date: e.target.value }))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                      <input type="time" value={manualDraft.time ?? ""} onChange={(e) => setManualDraft((d) => ({ ...d, time: e.target.value }))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                      <input value={manualDraft.location ?? ""} onChange={(e) => setManualDraft((d) => ({ ...d, location: e.target.value }))} placeholder="Lieu" className="rounded-xl border border-slate-200 px-2 py-2 text-sm focus:border-violet-400 focus:outline-none" />
                    </div>
                    <Button size="sm" variant="outline" disabled={!manualDraft.name?.trim() || programEvents.length >= MAX_PROGRAM_EVENTS} onClick={() => { setManualEvents((m) => [...m, manualDraft]); setManualDraft({ name: "", date: "", time: "", location: "" }); }} className="h-9 rounded-xl border-slate-200 px-3 text-sm">
                      <Plus className="size-4" />Ajouter
                    </Button>
                  </div>
                  {manualEvents.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {manualEvents.map((m, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                          <span className="truncate text-slate-700">{m.name} {m.date ? `Â· ${m.date}` : ""}</span>
                          <button onClick={() => setManualEvents((arr) => arr.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="size-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">{programEvents.length} / {MAX_PROGRAM_EVENTS} Ã©vÃ©nements</p>
                </section>
              </>
            ) : (
              <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Vos photos</h2>
                  <span className="text-xs text-slate-400">{photos.length} / {MAX_RECAP_PHOTOS}</span>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading || photos.length >= MAX_RECAP_PHOTOS}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-6 text-sm font-medium text-slate-500 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-60">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}{uploading ? "TÃ©lÃ©versementâ€¦" : `Ajouter des photos (max ${MAX_RECAP_PHOTOS})`}
                </button>
                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((url, i) => (
                      <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                        <button onClick={() => setPhotos((p) => p.filter((u) => u !== url))} className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><X className="size-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
              <h2 className="text-sm font-bold text-slate-900">Texte de la publication</h2>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Texte de la publicationâ€¦" className="mt-3 min-h-28 w-full resize-y rounded-2xl border border-slate-200 p-3 text-sm leading-6 text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200" />
              {channelSelector}
            </section>

            <Button onClick={publish} disabled={publishing} className="h-12 w-full rounded-2xl bg-violet-700 px-5 text-sm text-white hover:bg-violet-800">
              {publishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Valider et publier sur tous mes rÃ©seaux
            </Button>
          </div>

          {/* AperÃ§u iPhone */}
          <div>
            <div className="mx-auto w-full max-w-[300px] rounded-[3rem] border-[12px] border-slate-900 bg-slate-900 shadow-2xl">
              <div className="overflow-hidden rounded-[2.2rem] bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                  <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500" />
                  <span className="text-xs font-semibold text-slate-800">{community.name}</span>
                </div>
                {isProgram ? (
                  <div className="aspect-square w-full overflow-hidden bg-white">
                    <div style={{ width: POSTER_SIZE, height: POSTER_SIZE, transform: "scale(0.2546)", transformOrigin: "top left" }}>
                      <ProgramPoster events={programEvents} logoUrl={community.logoUrl} monthLabel={new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: TZ }).format(new Date())} />
                    </div>
                  </div>
                ) : photos.length === 0 ? (
                  <div className="flex aspect-square w-full items-center justify-center bg-slate-50 text-xs text-slate-400">Ajoutez des photos</div>
                ) : photos.length === 1 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photos[0]} alt="AperÃ§u" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="aspect-square w-full overflow-hidden bg-white">
                    <div style={{ width: POSTER_SIZE, height: POSTER_SIZE, transform: "scale(0.2546)", transformOrigin: "top left" }}>
                      <WeeklyPoster styleId={recapStyleId} photos={photos} logoUrl={community.logoUrl} subtitle="Retour en images sur le mois" />
                    </div>
                  </div>
                )}
                <div className="px-3 py-2"><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{caption || "Votre texte apparaÃ®tra ici."}</p></div>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">AperÃ§u de la publication</p>
          </div>
        </div>
        {captureNode}
      </div>
    );
  }

  // â”€â”€ SUCCESS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (view === "success") {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500 text-white"><CheckCircle2 className="size-6" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Publication envoyÃ©e&nbsp;!</h2>
              <p className="mt-1 text-sm text-slate-600">{runType === "program" ? "Le programme du mois" : "Le rÃ©cap du mois"} a Ã©tÃ© publiÃ© sur {localSettings.channels.map((c) => CHANNEL_LABELS[c]).join(", ")}.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard/publications" className="flex-1 sm:flex-none"><Button variant="outline" className="h-11 w-full rounded-2xl border-slate-200 px-5 text-sm sm:w-auto"><History className="size-4" />Voir l&apos;historique</Button></Link>
            <Button onClick={() => setView("overview")} variant="ghost" className="h-11 rounded-2xl px-5 text-sm text-slate-500">Retour</Button>
          </div>
        </section>
      </div>
    );
  }

  // â”€â”€ OVERVIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const publishedMonths = Array.from(new Set([...Object.keys(programHistory), ...Object.keys(recapHistory)])).sort().reverse();

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Sparkles className="size-7" /></div>
              <button type="button" onClick={() => setShowWelcome(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="size-5" /></button>
            </div>
            <h2 className="mt-5 text-2xl font-bold leading-tight text-slate-950">Programme &amp; récap du mois</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Une affiche en début de mois, un récap en images en fin de mois.</p>
            <div className="mt-6 space-y-4">
              {[
                { step: 1, title: "Préparez le programme", desc: "L'IA reprend les événements à venir du mois depuis l'Agenda IA.", color: "bg-violet-100 text-violet-700" },
                { step: 2, title: "Partagez le récap", desc: "En fin de mois, l'IA prépare un récap avec vos photos et un texte.", color: "bg-indigo-100 text-indigo-700" },
                { step: 3, title: "Validez et publiez", desc: "Sur Instagram, Facebook, WhatsApp et Email en un clic.", color: "bg-emerald-100 text-emerald-700" },
              ].map(({ step, title, desc, color }) => (
                <div key={step} className="flex items-start gap-4">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black", color)}>{step}</span>
                  <div><p className="font-bold text-slate-900">{title}</p><p className="mt-0.5 text-sm text-slate-500">{desc}</p></div>
                </div>
              ))}
            </div>
            <DavidAutomationCard
              className="mt-6"
              onCtaClick={() => void beginConfiguration()}
            />
            <div className="mt-8 flex flex-col gap-3">
              <Button type="button" size="xl" className="w-full bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]" onClick={() => void beginConfiguration()}><Sparkles className="size-5" />Commencer la configuration →</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowWelcome(false)}>DÃ©couvrir d&apos;abord</Button>
            </div>
          </div>
        </div>
      )}

      {header}
      <DavidAutomationCard onCtaClick={() => void beginConfiguration()} />
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-6 shadow-sm shadow-[#421388]/5">
        <h2 className="text-base font-bold text-slate-900">Comment Ã§a fonctionne&nbsp;?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, t: "Préparez le programme", d: "L'IA reprend les événements à venir du mois depuis l'Agenda IA." },
            { n: 2, t: "Partagez le récap", d: "À la fin du mois, l'IA prépare un récap avec les photos et les textes." },
            { n: 3, t: "Validez et publiez", d: "Validez puis publiez sur vos réseaux en un clic." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{s.n}</span>
              <p className="mt-3 text-sm font-semibold text-slate-900">{s.t}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prochaines notifications */}
      <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-6 shadow-sm shadow-[#421388]/5">
        <div className="flex items-center gap-2"><Clock className="size-4 text-violet-600" /><h2 className="text-base font-bold text-slate-900">Prochaines notifications</h2></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">Programme du mois</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              Le
              <select value={localSettings.programNotificationDay} onChange={(e) => saveDetail({ programNotificationDay: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-2 py-1">
                {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              Ã 
              <input type="time" value={localSettings.programNotificationTime} onChange={(e) => saveDetail({ programNotificationTime: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-900">RÃ©cap du mois</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <select value={localSettings.recapNotificationDay} onChange={(e) => saveDetail({ recapNotificationDay: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-2 py-1">
                <option value={0}>Dernier jour</option>
                {DAY_OPTIONS.map((d) => <option key={d} value={d}>Le {d}</option>)}
              </select>
              Ã 
              <input type="time" value={localSettings.recapNotificationTime} onChange={(e) => saveDetail({ recapNotificationTime: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1" />
            </div>
          </div>
        </div>
        {isActive && nextRunAt && <p className="mt-3 text-xs text-slate-400">Prochaine notification&nbsp;: {formatDateTime(nextRunAt)}</p>}
      </section>

      {/* PrÃ©parer maintenant */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/50 p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Programme du mois</p>
          <p className="mt-1 text-sm text-slate-500">PrÃ©sentez les Ã©vÃ©nements Ã  venir.</p>
          <Button onClick={() => openFlow("program")} className="mt-4 h-10 rounded-xl bg-violet-600 px-4 text-sm text-white hover:bg-violet-700"><CalendarDays className="size-4" />PrÃ©parer le programme</Button>
        </div>
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/50 p-6 shadow-sm">
          <p className="text-sm font-bold text-slate-900">RÃ©cap du mois</p>
          <p className="mt-1 text-sm text-slate-500">Partagez les photos du mois Ã©coulÃ©.</p>
          <Button onClick={() => openFlow("recap")} className="mt-4 h-10 rounded-xl bg-violet-600 px-4 text-sm text-white hover:bg-violet-700"><ImagePlus className="size-4" />PrÃ©parer le rÃ©cap</Button>
        </div>
      </section>

      {/* Fonds + bouton modifier */}
      <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-6 shadow-sm shadow-[#421388]/5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Fonds sÃ©lectionnÃ©s</h2>
          <Button size="sm" variant="outline" onClick={() => setView("models")} className="h-8 rounded-xl border-slate-200 px-3 text-xs">Modifier les fonds</Button>
        </div>
        <p className="mt-2 text-sm text-slate-500">RÃ©cap&nbsp;: {WEEKLY_IMAGE_STYLES.find((s) => s.id === recapStyleId)?.name} Â· Programme&nbsp;: Liste d&apos;Ã©vÃ©nements</p>
      </section>

      {/* Historique */}
      {publishedMonths.length > 0 && (
        <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-6 shadow-sm shadow-[#421388]/5">
          <h2 className="text-base font-bold text-slate-900">Historique</h2>
          <div className="mt-4 space-y-2">
            {publishedMonths.map((key) => (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold capitalize text-slate-900">{monthKeyLabel(key)}</p>
                <div className="flex items-center gap-2">
                  {programHistory[key]?.status === "PUBLISHED" && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Programme publiÃ©</span>}
                  {recapHistory[key]?.status === "PUBLISHED" && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">RÃ©cap publiÃ©</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}



