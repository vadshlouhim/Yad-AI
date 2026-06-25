"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EventRecapSettings,
  RecapChannel,
  RecapHistory,
} from "@/lib/automation/event-recap";

// ── Logos SVG officiels (pas d'emojis) ──────────────────────────────────────
const CHANNEL_LOGOS: Record<RecapChannel, React.ReactNode> = {
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
};

const CHANNEL_LABELS: Record<RecapChannel, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
};

const TZ = "Europe/Paris";

interface Community {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  timezone: string;
  tone: string;
  plan: string;
}

interface FinishedEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  coverImageUrl: string | null;
  status: string;
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
  finishedEvents: FinishedEvent[];
  automation: RecapAutomation | null;
  settings: EventRecapSettings;
  history: RecapHistory;
  focusEventId: string | null;
}

type View = "overview" | "customize" | "success";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short", day: "numeric", month: "long" }).format(
    new Date(iso)
  );
}
function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function statusBadge(status: string | undefined): { label: string; cls: string } {
  switch (status) {
    case "PUBLISHED":
      return { label: "Récap publié", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "IGNORED":
      return { label: "Ignoré pour cet événement", cls: "bg-slate-100 text-slate-400 border-slate-200" };
    case "POSTPONED":
      return { label: "Reporté", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    case "NOTIFIED":
      return { label: "Prêt pour le récap", cls: "bg-violet-50 text-violet-700 border-violet-200" };
    default:
      return { label: "Prêt pour le récap", cls: "bg-violet-50 text-violet-700 border-violet-200" };
  }
}

export function EventRecapAutoClient({ community, finishedEvents, automation, settings, history, focusEventId }: Props) {
  const [view, setView] = useState<View>("overview");
  const [localSettings, setLocalSettings] = useState<EventRecapSettings>(settings);
  const [localHistory, setLocalHistory] = useState<RecapHistory>(history);
  const [automationId, setAutomationId] = useState<string | null>(automation?.id ?? null);
  const [isActive, setIsActive] = useState<boolean>(automation?.status === "ACTIVE");
  const [nextRunAt, setNextRunAt] = useState<string | null>(automation?.nextRunAt ?? null);

  const [selectedEvent, setSelectedEvent] = useState<FinishedEvent | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [authorizationAck, setAuthorizationAck] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(automation === null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ouvre directement l'assistant si on arrive depuis une notification (?eventId=).
  useEffect(() => {
    if (!focusEventId) return;
    const ev = finishedEvents.find((e) => e.id === focusEventId);
    const h = history[focusEventId];
    if (ev && (!h || (h.status !== "PUBLISHED" && h.status !== "IGNORED"))) {
      openRecap(ev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusEventId]);

  async function postConfig(payload: Record<string, unknown>) {
    const res = await fetch("/api/event-recap-auto/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur");
    return data as RecapAutomation & { success?: boolean };
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

  async function saveDetail(partial: Partial<EventRecapSettings>) {
    const updated = { ...localSettings, ...partial };
    setLocalSettings(updated);
    setError("");
    try {
      const data = await postConfig({ mode: "update-notification-detail", settings: updated });
      setAutomationId(data.id ?? automationId);
      setNextRunAt(data.nextRunAt ?? nextRunAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function ignoreEvent(ev: FinishedEvent) {
    setError("");
    try {
      const data = await postConfig({ mode: "ignore-event", eventId: ev.id });
      setAutomationId(data.id ?? automationId);
      setLocalHistory((h) => ({ ...h, [ev.id]: { status: "IGNORED" } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function postponeEvent(ev: FinishedEvent) {
    setError("");
    try {
      const data = await postConfig({ mode: "postpone-event", eventId: ev.id });
      setAutomationId(data.id ?? automationId);
      setLocalHistory((h) => ({ ...h, [ev.id]: { status: "POSTPONED" } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  function openRecap(ev: FinishedEvent) {
    setSelectedEvent(ev);
    setPhotos([]);
    setCaption("");
    setAuthorizationAck(false);
    setError("");
    setView("customize");
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/uploads/attachment", { method: "POST", body: form });
        const data = await res.json();
        if (res.ok && data.isImage && data.url) urls.push(data.url as string);
      }
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      setError("Erreur lors du téléversement des photos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function generateCaption() {
    if (!selectedEvent) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/event-recap-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "prepare-recap", eventId: selectedEvent.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Erreur de génération.");
        return;
      }
      setCaption((data as { caption?: string }).caption ?? "");
    } catch {
      setError("Erreur réseau lors de la génération.");
    } finally {
      setGenerating(false);
    }
  }

  async function publishRecap() {
    if (!selectedEvent) return;
    if (photos.length === 0) {
      setError("Ajoutez au moins une photo.");
      return;
    }
    if (!caption.trim()) {
      setError("Préparez le texte de la publication.");
      return;
    }
    if (!authorizationAck) {
      setError("Confirmez les autorisations de publication des photos.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/event-recap-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "publish-recap",
          eventId: selectedEvent.id,
          caption: caption.trim(),
          channels: localSettings.channels,
          photoUrls: photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Échec de la publication.");
        return;
      }
      setLocalHistory((h) => ({ ...h, [selectedEvent.id]: { status: "PUBLISHED" } }));
      setView("success");
    } catch {
      setError("Erreur réseau lors de la publication.");
    } finally {
      setPublishing(false);
    }
  }

  const nextNotificationEvent = useMemo(
    () =>
      finishedEvents.find((ev) => {
        const h = localHistory[ev.id];
        return !h || (h.status !== "PUBLISHED" && h.status !== "IGNORED");
      }) ?? null,
    [finishedEvents, localHistory]
  );

  const header = (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 p-6 text-white shadow-lg shadow-violet-900/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 h-1.5 w-10 rounded-full bg-white/60" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Récap automatique après événement</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-50/90">
            Publiez facilement les photos et moments forts après vos événements.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Link href="/dashboard/events">
            <Button size="sm" variant="outline" className="h-9 rounded-xl border-white/30 bg-white/10 px-4 text-xs text-white hover:bg-white/20">
              <CalendarDays className="size-4" />
              Voir dans l&apos;Agenda IA
            </Button>
          </Link>
        </div>
      </div>

      {/* Activer / Désactiver — en bas à droite du bandeau */}
      <div className="mt-6 flex justify-end">
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            onClick={() => setStatusOpen((open) => !open)}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span className={cn("size-2.5 rounded-full", isActive ? "bg-emerald-400" : "bg-slate-300")} />
            )}
            {isActive ? "Active" : "Désactivée"}
            <ChevronDown className="size-4" />
          </Button>
          {statusOpen && (
            <div className="absolute bottom-full right-0 z-20 mb-2 w-48 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-lg">
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => void setActiveState(true)}>
                <span className="size-2.5 rounded-full bg-emerald-500" />Active
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => void setActiveState(false)}>
                <span className="size-2.5 rounded-full bg-slate-300" />Désactivée
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-6 px-4 sm:px-6">
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Sparkles className="size-7" />
              </div>
              <button type="button" onClick={() => setShowWelcome(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <h2 className="mt-5 text-2xl font-bold leading-tight text-slate-950">Récap automatique après événement</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Après chaque événement, EasyCom IA vous rappelle de publier vos photos et moments forts.
            </p>
            <div className="mt-6 space-y-4">
              {[
                { step: 1, title: "Recevez le rappel", desc: "Le lendemain à 10h, hors Chabbat et Yom Tov.", color: "bg-violet-100 text-violet-700" },
                { step: 2, title: "Ajoutez vos photos", desc: "Vous choisissez vous-même les photos à publier, sans retouche.", color: "bg-indigo-100 text-indigo-700" },
                { step: 3, title: "Validez et publiez", desc: "Publication sur Instagram, Facebook et WhatsApp après validation.", color: "bg-emerald-100 text-emerald-700" },
              ].map(({ step, title, desc, color }) => (
                <div key={step} className="flex items-start gap-4">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black", color)}>{step}</span>
                  <div>
                    <p className="font-bold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <Button type="button" size="xl" className="w-full bg-violet-700 hover:bg-violet-800" disabled={saving} onClick={() => void setActiveState(true)}>
                <Sparkles className="size-5" />
                Activer le récap automatique
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowWelcome(false)}>
                Découvrir d&apos;abord
              </Button>
            </div>
          </div>
        </div>
      )}

      {header}

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {view === "overview" && (
        <>
          {/* Comment ça fonctionne */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Comment ça fonctionne&nbsp;?</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                { n: 1, t: "Recevez le rappel", d: "Le lendemain à 10h, hors Chabbat et Yom Tov." },
                { n: 2, t: "Ajoutez vos photos", d: "Vous choisissez vous-même les photos à publier." },
                { n: 3, t: "Validez et publiez", d: "Publication sur Instagram, Facebook et WhatsApp après validation." },
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

          {/* Prochaine notification */}
          <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/50 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-violet-600" />
              <h2 className="text-base font-bold text-slate-900">Prochaine notification</h2>
            </div>
            {nextNotificationEvent ? (
              <div className="mt-3 flex flex-col gap-1">
                <p className="text-sm font-semibold text-slate-800">{nextNotificationEvent.title}</p>
                <p className="text-xs text-slate-500">
                  {isActive && nextRunAt ? `Notification prévue le ${formatDateTime(nextRunAt)}` : "Activez l'automatisation pour recevoir le rappel."}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Aucun événement récent en attente de récap.</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Heure de notification</label>
              <input
                type="time"
                value={localSettings.notificationTime}
                onChange={(e) => saveDetail({ notificationTime: e.target.value })}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-violet-400 focus:outline-none"
              />
            </div>
          </section>

          {/* Événements récents */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Événements récents</h2>
            {finishedEvents.length === 0 ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Aucun événement terminé dans l&apos;Agenda IA pour l&apos;instant.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {finishedEvents.map((ev) => {
                  const h = localHistory[ev.id];
                  const badge = statusBadge(h?.status);
                  const done = h?.status === "PUBLISHED" || h?.status === "IGNORED";
                  return (
                    <div
                      key={ev.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{ev.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDate(ev.startDate)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", badge.cls)}>{badge.label}</span>
                        {!done && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openRecap(ev)}
                              className="h-8 rounded-xl bg-violet-600 px-3 text-xs text-white hover:bg-violet-700"
                            >
                              Créer le récap
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => postponeEvent(ev)}
                              className="h-8 rounded-xl border-slate-200 px-3 text-xs"
                            >
                              Plus tard
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => ignoreEvent(ev)}
                              className="h-8 rounded-xl px-3 text-xs text-slate-500 hover:text-red-600"
                            >
                              Ignorer
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {view === "customize" && selectedEvent && (
        <>
          <div className="flex items-center justify-between">
            <button onClick={() => setView("overview")} className="text-sm font-medium text-slate-500 hover:text-slate-700">
              ← Retour
            </button>
            <span className="text-sm font-semibold text-slate-900">{selectedEvent.title}</span>
          </div>

          {/* Avertissements obligatoires */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-2">
              <AlertTriangle className="size-5 flex-shrink-0 text-amber-600" />
              <p className="text-sm leading-6 text-amber-800">
                Attention : certaines photos peuvent inclure des enfants. Assurez-vous d&apos;avoir les autorisations nécessaires avant
                publication.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
            <div className="flex gap-2">
              <Video className="size-5 flex-shrink-0 text-violet-600" />
              <p className="text-sm leading-6 text-violet-800">
                Bientôt, vous pourrez téléverser vos photos et l&apos;IA créera automatiquement un clip IA.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Colonne édition */}
            <div className="space-y-5">
              {/* Photos */}
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Vos photos</h2>
                  <span className="text-xs text-slate-400">{photos.length} photo{photos.length > 1 ? "s" : ""}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Vous choisissez les photos. Elles ne sont ni retouchées, ni recadrées, ni modifiées.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-6 text-sm font-medium text-slate-500 transition hover:border-violet-300 hover:text-violet-700 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                  {uploading ? "Téléversement…" : "Ajouter des photos"}
                </button>
                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {photos.map((url, i) => (
                      <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Texte */}
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Texte de la publication</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateCaption}
                    disabled={generating}
                    className="h-8 rounded-xl border-violet-200 px-3 text-xs text-violet-700"
                  >
                    {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    Générer avec l&apos;IA
                  </Button>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Le même message sera utilisé sur Instagram, Facebook et WhatsApp."
                  className="mt-3 min-h-32 w-full resize-y rounded-2xl border border-slate-200 p-3 text-sm leading-6 text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">Publié sur&nbsp;:</span>
                  {localSettings.channels.map((c) => (
                    <span key={c} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                      {CHANNEL_LOGOS[c]}
                      {CHANNEL_LABELS[c]}
                    </span>
                  ))}
                </div>
              </section>

              {/* Autorisation + publication */}
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={authorizationAck}
                    onChange={(e) => setAuthorizationAck(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span>
                    Je confirme disposer des autorisations nécessaires pour publier ces photos, y compris celles où figurent des enfants.
                  </span>
                </label>
                <Button
                  onClick={publishRecap}
                  disabled={publishing || photos.length === 0 || !caption.trim() || !authorizationAck}
                  className="mt-4 h-11 w-full rounded-2xl bg-violet-600 px-5 text-sm text-white hover:bg-violet-700"
                >
                  {publishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Valider et publier le récap
                </Button>
              </section>
            </div>

            {/* Colonne aperçu (cadre smartphone) */}
            <div>
              <div className="mx-auto w-full max-w-[300px] rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl">
                <div className="overflow-hidden rounded-[1.8rem] bg-white">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                    <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500" />
                    <span className="text-xs font-semibold text-slate-800">{community.name}</span>
                  </div>
                  {photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos[0]} alt="Aperçu" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-slate-50 text-xs text-slate-400">
                      Ajoutez une photo
                    </div>
                  )}
                  <div className="px-3 py-2">
                    <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">
                      {caption || "Votre texte apparaîtra ici."}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">Aperçu de la publication</p>
            </div>
          </div>
        </>
      )}

      {view === "success" && selectedEvent && (
        <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Récap publié&nbsp;!</h2>
              <p className="mt-1 text-sm text-slate-600">
                La publication récap de « {selectedEvent.title} » a été envoyée sur {localSettings.channels.map((c) => CHANNEL_LABELS[c]).join(", ")}.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href="/dashboard/events" className="flex-1 sm:flex-none">
              <Button variant="outline" className="h-11 w-full rounded-2xl border-slate-200 px-5 text-sm sm:w-auto">
                <CalendarDays className="size-4" />
                Voir dans l&apos;Agenda IA
              </Button>
            </Link>
            <Button
              onClick={() => {
                setView("overview");
                setSelectedEvent(null);
              }}
              variant="ghost"
              className="h-11 rounded-2xl px-5 text-sm text-slate-500"
            >
              Retour aux événements
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
