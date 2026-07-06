"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DavidAutomationCard, DavidBannerAgent } from "@/components/automations/automation-design-kit";
import { CalendarDays, CheckCircle2, ImagePlus, Loader2, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "@/lib/utils";
import {
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
const PUBLISH_CHANNELS: MonthlyChannel[] = ["INSTAGRAM", "FACEBOOK"];
const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23dfe6f0'/></svg>";
const PREVIEW_PHOTOS = [PLACEHOLDER, PLACEHOLDER, PLACEHOLDER, PLACEHOLDER];

const TZ = "Europe/Paris";

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
type PublishLink = { channel: string; url: string | null; success: boolean; error?: string };

function eventDateISO(e: EventRow) { return e.startDate.slice(0, 10); }
function eventTime(e: EventRow) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(e.startDate));
}

export function MonthlyProgramRecapAutoClient({ community, upcomingEvents, automation, settings, programHistory, recapHistory, focusType }: Props) {
  const [view, setView] = useState<View>("overview");
  const [runType, setRunType] = useState<RunType>("program");
  const [localSettings, setLocalSettings] = useState<MonthlySettings>(settings);
  const [automationId, setAutomationId] = useState<string | null>(automation?.id ?? null);

  const [showWelcome, setShowWelcome] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [publishLinks, setPublishLinks] = useState<PublishLink[] | null>(null);

  // Programme
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [manualEvents, setManualEvents] = useState<ProgramEvent[]>([]);
  const [manualDraft, setManualDraft] = useState<ProgramEvent>({ name: "", date: "", time: "", location: "" });
  // Récap
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
    return data as MonthlyAutomation & { success?: boolean; caption?: string; links?: PublishLink[] };
  }

  async function beginConfiguration() {
    setShowWelcome(false);
    openFlow("program");
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
      /* texte ?ditable */
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
      setError("Erreur lors du téléversement.");
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
    if (!node) throw new Error("Aperçu indisponible.");
    const dataUrl = await toPng(node, { width: POSTER_SIZE, height: POSTER_SIZE, pixelRatio: 1, cacheBust: true });
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `${runType}-${Date.now()}.png`, { type: "image/png" });
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads/attachment", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error("Échec du téléversement de l'affiche.");
    return data.url as string;
  }

  async function publish() {
    if (!caption.trim()) {
      setError("Préparez le texte de la publication.");
      return;
    }
    if (runType === "program" && programEvents.length === 0) {
      setError("Sélectionnez ou ajoutez au moins un événement.");
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
        channels: localSettings.channels.filter((channel) => PUBLISH_CHANNELS.includes(channel)),
        visualUrls,
      });
      if (!data.success) {
        setError("Échec de la publication.");
        return;
      }
      setPublishLinks(data.links ?? null);
      setView("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau lors de la publication.");
    } finally {
      setPublishing(false);
    }
  }

  const header = (
    <div className="relative overflow-visible rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/20">
      <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
        <div className="rounded-full bg-white/[0.04] p-5">
          <CalendarDays className="size-28 text-white/[0.08]" strokeWidth={1.6} />
        </div>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="relative">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-white/80" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Programme du mois</h1>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <DavidBannerAgent
            className="sm:max-w-xl"
            text="Je suis David, votre assistant IA. Chaque début de mois, je prépare pour vous une image avec les événements à venir, prête à être publiée sur vos réseaux en un clic. Voulez-vous activer cette fonction ?"
          />
        </div>
      </div>
    </div>
  );

  const channelSelector = (
    <div className="mt-3">
      <span className="text-xs text-slate-400">Publier sur&nbsp;:</span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {PUBLISH_CHANNELS.map((c) => {
          const active = localSettings.channels.includes(c);
          return (
            <button key={c} type="button" onClick={() => toggleChannel(c)} aria-pressed={active}
              className={cn(
                "flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-black transition hover:-translate-y-0.5",
                active
                  ? c === "INSTAGRAM"
                    ? "border-pink-300 bg-pink-50 text-pink-700 shadow-lg shadow-pink-100"
                    : "border-blue-300 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100"
                  : "border-slate-200 bg-white text-slate-400"
              )}>
              {CHANNEL_LOGOS[c]}{CHANNEL_LABELS[c]}{active && <CheckCircle2 className="size-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Nœud de capture hors écran (programme ou récap selon le flux).
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

  // ?? MODELS ????????????????????????????????????????????????????????????????
  if (view === "models") {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="relative overflow-visible rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/20">
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
          <h2 className="text-base font-bold text-slate-900">Fond — Récap du mois</h2>
          <p className="mt-1 text-sm text-slate-500">Mise en page utilisée pour le récap en images.</p>
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
          <h2 className="text-base font-bold text-slate-900">Fond — Programme du mois</h2>
          <p className="mt-1 text-sm text-slate-500">Mise en page utilisée pour la liste des événements à venir.</p>
          <div className="mt-4 flex aspect-square w-full max-w-xs items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-2">
            <div style={{ width: 288, height: 288, overflow: "hidden", borderRadius: 14, boxShadow: "0 6px 20px rgba(15,23,42,0.12)" }}>
              <div style={{ width: POSTER_SIZE, height: POSTER_SIZE, transform: `scale(${288 / POSTER_SIZE})`, transformOrigin: "top left" }}>
                <ProgramPoster events={[{ name: "Cours de Torah", date: "2026-06-03", time: "20:30" }, { name: "Soir?e communautaire", date: "2026-06-12", time: "19:00" }]} logoUrl={community.logoUrl} monthLabel="ce mois-ci" />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ?? CUSTOMIZE ???????????????????????????????????????????????????????????????
  if (view === "customize") {
    const isProgram = runType === "program";
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/20">
          <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
            <div className="rounded-full bg-white/[0.04] p-5">
              <CalendarDays className="size-24 text-white/[0.08]" strokeWidth={1.6} />
            </div>
          </div>
          <button onClick={() => setView("overview")} className="relative mb-4 text-sm font-medium text-white/75 hover:text-white">← Retour</button>
          <div className="relative max-w-3xl">
            <div className="mb-3 h-1.5 w-10 rounded-full bg-white/80" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{isProgram ? "Programme du mois" : "Récap du mois"}</h1>
            <p className="mt-2 text-sm leading-6 text-white/78">
              Préparez l’image, ajustez le texte, puis publiez sur Instagram et Facebook.
            </p>
          </div>
        </div>
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            {isProgram ? (
              <>
                <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
                  <h2 className="text-sm font-bold text-slate-900">événements à venir (Agenda IA)</h2>
                  {upcomingEvents.length === 0 ? (
                    <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Aucun événement à venir. Ajoutez-en ci-dessous.</p>
                  ) : (
                    <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                      {upcomingEvents.map((e) => {
                        const checked = selectedEventIds.has(e.id);
                        return (
                          <button key={e.id} type="button" onClick={() => setSelectedEventIds((prev) => { const n = new Set(prev); if (n.has(e.id)) n.delete(e.id); else if (n.size < MAX_PROGRAM_EVENTS) n.add(e.id); return n; })}
                            className={cn("flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition", checked ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300")}>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-800">{e.title}</span>
                              <span className="block text-xs text-slate-400">{new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "long" }).format(new Date(e.startDate))} · {eventTime(e)}</span>
                            </span>
                            <span className={cn("flex size-5 flex-shrink-0 items-center justify-center rounded-md border", checked ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300 bg-white")}>{checked && <CheckCircle2 className="size-3.5" />}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
                  <h2 className="text-sm font-bold text-slate-900">Ajouter un événement</h2>
                  <div className="mt-3 space-y-2">
                    <input value={manualDraft.name ?? ""} onChange={(e) => setManualDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Nom de l'événement" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none" />
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
                          <span className="truncate text-slate-700">{m.name} {m.date ? `· ${m.date}` : ""}</span>
                          <button onClick={() => setManualEvents((arr) => arr.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="size-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">{programEvents.length} / {MAX_PROGRAM_EVENTS} événements</p>
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
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}{uploading ? "Téléversement…" : `Ajouter des photos (max ${MAX_RECAP_PHOTOS})`}
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

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-bold text-slate-900">Texte de la publication</h2>
                <Button type="button" variant="outline" onClick={() => void prepareCaption(runType)} className="h-9 rounded-xl border-violet-200 text-xs font-bold text-violet-700">
                  <Sparkles className="size-4" />
                  Retravailler avec l’IA
                </Button>
              </div>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Texte de la publication?" className="mt-3 min-h-28 w-full resize-y rounded-2xl border border-slate-200 p-3 text-sm leading-6 text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200" />
              {channelSelector}
            </section>

            <Button onClick={publish} disabled={publishing} className="h-12 w-full rounded-2xl bg-[#421388] px-5 text-sm font-black text-white hover:bg-[#35106f]">
              {publishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Publier sur Instagram et Facebook
            </Button>
          </div>

          <div className="flex flex-col items-center justify-start lg:sticky lg:top-6">
            <div className="w-full max-w-[380px] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Aperçu Instagram</h3>
                <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-bold text-pink-700">Live</span>
              </div>
              <div className="mx-auto flex w-full justify-center">
                <div className="relative aspect-[12/25] w-full max-w-[320px] rounded-[3.5rem] border-[1.5px] border-[#b0853e] bg-[#f2935a] p-[4px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <div className="absolute -left-[5px] top-[110px] h-[30px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
                  <div className="absolute -left-[5px] top-[160px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
                  <div className="absolute -left-[5px] top-[230px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
                  <div className="absolute -right-[5px] top-[180px] h-[85px] w-[5px] rounded-r-md border-y border-r border-[#b0853e] bg-[#f2935a]" />
                  <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[3.2rem] bg-white">
                    <div className="flex h-12 w-full shrink-0 items-center justify-between px-6 pt-2">
                      <div className="w-1/3 pl-1 text-[15px] font-semibold text-black">9:41</div>
                      <div className="mt-1 h-[30px] w-[120px] rounded-full bg-black" />
                      <div className="flex w-1/3 justify-end pr-1 text-xs font-semibold text-black">LTE</div>
                    </div>
                    <div className="mt-2 flex flex-1 flex-col overflow-hidden bg-white">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500">
                            {community.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="truncate text-[13px] font-semibold tracking-tight text-gray-900">{community.name}</span>
                        </div>
                        <span className="shrink-0 text-lg leading-none text-slate-700">...</span>
                      </div>
                      <div className="aspect-square w-full bg-gradient-to-br from-pink-50 via-white to-orange-50">
                        {isProgram ? (
                          <div className="h-full w-full overflow-hidden bg-white">
                            <div style={{ width: POSTER_SIZE, height: POSTER_SIZE, transform: "scale(0.2963)", transformOrigin: "top left" }}>
                              <ProgramPoster events={programEvents} logoUrl={community.logoUrl} monthLabel={new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: TZ }).format(new Date())} />
                            </div>
                          </div>
                        ) : photos.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">Ajoutez des photos</div>
                        ) : photos.length === 1 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photos[0]} alt="Aperçu" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full overflow-hidden bg-white">
                            <div style={{ width: POSTER_SIZE, height: POSTER_SIZE, transform: "scale(0.2963)", transformOrigin: "top left" }}>
                              <WeeklyPoster styleId={recapStyleId} photos={photos} logoUrl={community.logoUrl} subtitle="Retour en images sur le mois" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-3">
                        <div className="mb-3 flex items-center gap-4 text-slate-900">
                          <span className="text-xl">♡</span>
                          <span className="text-xl">◯</span>
                          <span className="text-xl">➤</span>
                        </div>
                        <p className="whitespace-pre-wrap text-[13px] leading-[18px] text-gray-900"><strong className="mr-1">{community.name}</strong>{caption || "Votre texte apparaîtra ici."}</p>
                      </div>
                    </div>
                    <div className="absolute bottom-2 flex w-full justify-center pb-1"><div className="h-[5px] w-[130px] rounded-full bg-gray-300" /></div>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs font-semibold text-slate-400">Aperçu smartphone, aligné sur la page Instagram</p>
            </div>
          </div>
        </div>
        {captureNode}
      </div>
    );
  }

  // ?? SUCCESS ?????????????????????????????????????????????????????????????????
  if (view === "success") {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500 text-white"><CheckCircle2 className="size-6" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Votre publication a bien été publiée&nbsp;!</h2>
              <p className="mt-1 text-sm text-slate-600">Vous pouvez maintenant la consulter sur vos pages Instagram et Facebook.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(publishLinks?.length ? publishLinks : PUBLISH_CHANNELS.map((channel) => ({ channel: CHANNEL_LABELS[channel], url: null, success: true }))).map((link) => (
              <Link
                key={link.channel}
                href={link.url ?? "/dashboard/publications"}
                target={link.url ? "_blank" : undefined}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-center text-sm font-bold",
                  link.success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                )}
              >
                Voir sur {link.channel}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setView("overview")} variant="ghost" className="h-11 rounded-2xl px-5 text-sm text-slate-500">Retour</Button>
          </div>
        </section>
      </div>
    );
  }

  // ?? OVERVIEW ????????????????????????????????????????????????????????????????
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
            <h2 className="mt-5 text-2xl font-bold leading-tight text-slate-950">Programme du mois</h2>
            <div className="mt-6 space-y-4">
              {[
                { step: 1, title: "Préparez le programme", desc: "L'IA reprend les événements à venir du mois depuis l'Agenda IA.", color: "bg-violet-100 text-violet-700" },
                { step: 2, title: "David prépare le visuel", desc: "Une image claire et prête pour vos réseaux.", color: "bg-indigo-100 text-indigo-700" },
                { step: 3, title: "Validez et publiez", desc: "Publiez sur Instagram et Facebook en un clic.", color: "bg-emerald-100 text-emerald-700" },
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
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowWelcome(false)}>Découvrir d&apos;abord</Button>
            </div>
          </div>
        </div>
      )}

      {header}
      <DavidAutomationCard onCtaClick={() => void beginConfiguration()} />
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-6 shadow-sm shadow-[#421388]/5">
        <h2 className="text-base font-bold text-slate-900">Comment ça fonctionne&nbsp;?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, t: "Choisissez les événements", d: "David reprend les événements à venir depuis l'Agenda IA.", tone: "border-fuchsia-300 text-fuchsia-700" },
            { n: 2, t: "Préparez le visuel", d: "Une image du programme du mois est générée pour vos réseaux.", tone: "border-cyan-300 text-cyan-700" },
            { n: 3, t: "Publiez", d: "Validez puis publiez sur Instagram et Facebook.", tone: "border-emerald-300 text-emerald-700" },
          ].map((s) => (
            <div key={s.n} className={cn("rounded-2xl border bg-white p-4 shadow-sm", s.tone)}>
              <span className={cn("flex size-8 items-center justify-center rounded-full border bg-white text-xs font-black", s.tone)}>{s.n}</span>
              <p className="mt-3 text-sm font-semibold text-slate-900">{s.t}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
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
                  {programHistory[key]?.status === "PUBLISHED" && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Programme publié</span>}
                  {recapHistory[key]?.status === "PUBLISHED" && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Récap publié</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}



