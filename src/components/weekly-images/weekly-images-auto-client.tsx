"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DavidAutomationCard, DavidBannerAgent } from "@/components/automations/automation-design-kit";
import {
  CalendarClock,
  CheckCircle2,
  ImagePlus,
  Loader2,
  PlayCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_WEEKLY_PHOTOS,
  WEEKLY_DAY_LABELS,
  type WeeklyImagesChannel,
  type WeeklyImagesHistory,
  type WeeklyImagesSettings,
} from "@/lib/automation/weekly-images";

type SocialChannel = Extract<WeeklyImagesChannel, "INSTAGRAM" | "FACEBOOK">;

type MediaItem = {
  url: string;
  type: string;
  name: string;
};

type PublishLink = {
  channel: string;
  url: string | null;
  success: boolean;
  error?: string;
};

const SOCIAL_CHANNELS: SocialChannel[] = ["INSTAGRAM", "FACEBOOK"];

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
};

const CHANNEL_LOGOS: Record<SocialChannel, React.ReactNode> = {
  INSTAGRAM: (
    <svg className="size-6 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  FACEBOOK: (
    <svg className="size-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.894-4.788 4.66-4.788 1.325 0 2.464.099 2.796.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.112C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0Z" />
    </svg>
  ),
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

interface WeeklyImagesAutomation {
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
  automation: WeeklyImagesAutomation | null;
  settings: WeeklyImagesSettings;
  history: WeeklyImagesHistory;
}

function defaultCaption(community: Community) {
  if (community.city) return `Retour en images sur les moments forts de la semaine avec le Beth Habad de ${community.city}.`;
  return `Retour en images sur les moments forts de la semaine avec ${community.name}.`;
}

export function WeeklyImagesAutoClient({ community, automation, settings, history }: Props) {
  const [localSettings, setLocalSettings] = useState<WeeklyImagesSettings>({
    ...settings,
    channels: settings.channels.filter((channel): channel is SocialChannel => SOCIAL_CHANNELS.includes(channel as SocialChannel)),
  });
  const [isActive, setIsActive] = useState(automation?.status === "ACTIVE");
  const [nextRunAt, setNextRunAt] = useState(automation?.nextRunAt ?? null);
  const [showComposer, setShowComposer] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState(defaultCaption(community));
  const [selectedChannels, setSelectedChannels] = useState<SocialChannel[]>(["INSTAGRAM", "FACEBOOK"]);
  const [weeklyChoice, setWeeklyChoice] = useState<boolean | null>(isActive ? true : null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishLinks, setPublishLinks] = useState<PublishLink[] | null>(null);

  async function postConfig(payload: Record<string, unknown>) {
    const response = await fetch("/api/weekly-images-auto/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error((data as { error?: string }).error ?? "Erreur");
    return data as WeeklyImagesAutomation & { caption?: string; links?: PublishLink[] };
  }

  async function saveWeeklyPreference(next: boolean, partial?: Partial<WeeklyImagesSettings>) {
    const updated: WeeklyImagesSettings = {
      ...localSettings,
      ...partial,
      channels: ["INSTAGRAM", "FACEBOOK"],
      status: next ? "active" : "paused",
    };
    setLocalSettings(updated);
    setWeeklyChoice(next);
    setError("");
    setSaving(true);
    try {
      const data = await postConfig(next ? { mode: "activate", settings: updated } : { mode: "pause" });
      setIsActive(next);
      setNextRunAt(data.nextRunAt ?? null);
      setNotice(
        next
          ? `Notification hebdomadaire enregistrée : ${WEEKLY_DAY_LABELS[updated.notificationDay]} à ${updated.notificationTime}.`
          : "Notification hebdomadaire désactivée."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function updateNotification(partial: Partial<WeeklyImagesSettings>) {
    const updated = { ...localSettings, ...partial, channels: ["INSTAGRAM", "FACEBOOK"] as WeeklyImagesChannel[] };
    setLocalSettings(updated);
    if (weeklyChoice !== true) return;
    await saveWeeklyPreference(true, partial);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_WEEKLY_PHOTOS - mediaItems.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_WEEKLY_PHOTOS} photos ou vidéos.`);
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded: MediaItem[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/uploads/attachment", { method: "POST", body: form });
        const data = await response.json();
        if (response.ok && data.url) {
          uploaded.push({ url: data.url as string, type: String(data.type ?? file.type), name: String(data.name ?? file.name) });
        }
      }
      setMediaItems((prev) => [...prev, ...uploaded].slice(0, MAX_WEEKLY_PHOTOS));
      if (files.length > remaining) setError(`Maximum ${MAX_WEEKLY_PHOTOS} fichiers : seuls les premiers ont été ajoutés.`);
    } catch {
      setError("Erreur lors du téléversement des fichiers.");
    } finally {
      setUploading(false);
    }
  }

  async function rewriteCaption() {
    setRewriting(true);
    setError("");
    try {
      const data = await postConfig({ mode: "prepare-weekly-images", caption });
      setCaption(data.caption ?? caption);
    } catch {
      setError("Impossible de retravailler le texte pour le moment.");
    } finally {
      setRewriting(false);
    }
  }

  function toggleChannel(channel: SocialChannel) {
    setSelectedChannels((prev) => {
      const next = prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel];
      return next.length > 0 ? next : prev;
    });
  }

  async function publish() {
    if (mediaItems.length === 0) {
      setError("Ajoutez au moins une photo ou une vidéo.");
      return;
    }
    if (!caption.trim()) {
      setError("Écrivez un texte avant de publier.");
      return;
    }
    setPublishing(true);
    setError("");
    setPublishLinks(null);
    try {
      const data = await postConfig({
        mode: "publish-weekly-images",
        caption: caption.trim(),
        channels: selectedChannels,
        mediaUrls: mediaItems.map((item) => item.url),
      });
      setPublishLinks(data.links ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la publication.");
    } finally {
      setPublishing(false);
    }
  }

  function openComposer() {
    setError("");
    setNotice("");
    setPublishLinks(null);
    setShowComposer(true);
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="relative overflow-visible rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/20">
        <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
          <div className="rounded-full bg-white/[0.04] p-5">
            <ImagePlus className="size-28 text-white/[0.08]" strokeWidth={1.6} />
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="relative">
            <div className="mb-3 h-1.5 w-10 rounded-full bg-white/80" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cette semaine en images</h1>
            {isActive && nextRunAt && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white/90">
                <CalendarClock className="size-3.5" />
                {WEEKLY_DAY_LABELS[localSettings.notificationDay]} à {localSettings.notificationTime}
              </p>
            )}
          </div>
          <DavidBannerAgent
            className="sm:max-w-xl"
            text="Je suis David, votre assistant IA. Chaque semaine, je vous aide à transformer vos photos en publication prête à partager sur tous vos réseaux"
          />
        </div>
      </div>

      <DavidAutomationCard onCtaClick={openComposer} />

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}

      <section className="rounded-3xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-6 shadow-sm shadow-[#421388]/5">
        <h2 className="text-base font-bold text-slate-900">Comment ça fonctionne&nbsp;?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { n: 1, t: "Déposez vos médias", d: `Ajoutez jusqu’à ${MAX_WEEKLY_PHOTOS} photos ou vidéos de la semaine.`, tone: "border-fuchsia-300 text-fuchsia-700" },
            { n: 2, t: "David retravaille le texte", d: "Gardez votre idée, puis améliorez le message avec l’IA.", tone: "border-cyan-300 text-cyan-700" },
            { n: 3, t: "Publiez", d: "Choisissez Instagram, Facebook, ou les deux.", tone: "border-emerald-300 text-emerald-700" },
          ].map((step) => (
            <div key={step.n} className={cn("rounded-2xl border bg-white p-4 shadow-sm", step.tone)}>
              <span className={cn("flex size-8 items-center justify-center rounded-full border bg-white text-xs font-black", step.tone)}>
                {step.n}
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-900">{step.t}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Historique</h2>
          <div className="mt-4 space-y-2">
            {history.slice(0, 4).map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-900">{new Date(run.publishedAt).toLocaleDateString("fr-FR")}</p>
                <p className="text-xs text-slate-500">{run.photoCount} média{run.photoCount > 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showComposer && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 pt-3 backdrop-blur-sm sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
            <div className="relative shrink-0 overflow-hidden bg-[#421388] px-6 py-5 text-white">
              <div className="absolute right-8 top-4 rounded-full bg-white/10 p-5">
                <ImagePlus className="size-20 text-white/15" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-white/60">Cette semaine en images</p>
                  <h2 className="mt-2 text-2xl font-black">Préparez votre publication</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white/75">
                    Déposez vos photos ou vidéos, écrivez votre message, puis publiez sur Instagram et Facebook.
                  </p>
                </div>
                <button type="button" onClick={() => setShowComposer(false)} className="relative rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="grid flex-1 gap-6 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:grid-cols-[1.05fr_0.95fr] lg:p-7">
              <div className="space-y-5">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-950">Photos et vidéos</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                      {mediaItems.length} / {MAX_WEEKLY_PHOTOS}
                    </span>
                  </div>
                  <label className="mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-violet-300 bg-violet-50/50 px-4 py-8 text-center transition hover:bg-violet-50">
                    {uploading ? <Loader2 className="size-8 animate-spin text-violet-700" /> : <ImagePlus className="size-8 text-violet-700" />}
                    <span className="mt-3 text-sm font-black text-slate-900">Déposez vos fichiers ici</span>
                    <span className="mt-1 text-xs text-slate-500">Photos ou vidéos, maximum {MAX_WEEKLY_PHOTOS} fichiers.</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      disabled={uploading || mediaItems.length >= MAX_WEEKLY_PHOTOS}
                      onChange={(event) => void handleUpload(event.target.files)}
                      className="hidden"
                    />
                  </label>
                  {mediaItems.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {mediaItems.map((item) => (
                        <div key={item.url} className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          {item.type.startsWith("video/") ? (
                            <video src={item.url} className="h-full w-full object-cover" muted />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                          )}
                          {item.type.startsWith("video/") && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                              <PlayCircle className="size-7" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setMediaItems((prev) => prev.filter((media) => media.url !== item.url))}
                            className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-black text-slate-950">Texte de la publication</h3>
                    <Button type="button" variant="outline" onClick={() => void rewriteCaption()} disabled={rewriting} className="h-9 rounded-xl border-violet-200 text-xs font-bold text-violet-700">
                      {rewriting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      Retravailler avec l’IA
                    </Button>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    rows={6}
                    className="mt-4 w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                    placeholder="Écrivez le texte de votre publication..."
                  />
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-black text-slate-950">Voulez-vous que chaque semaine je vous prépare cette publication&nbsp;?</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void saveWeeklyPreference(true)} disabled={saving} className="h-10 rounded-xl bg-emerald-600 px-5 text-sm text-white hover:bg-emerald-700">
                      Oui
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void saveWeeklyPreference(false)} disabled={saving} className="h-10 rounded-xl border-slate-200 px-5 text-sm">
                      Non
                    </Button>
                  </div>
                  {weeklyChoice === true && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-bold text-slate-500">
                        Jour de notification
                        <select
                          value={localSettings.notificationDay}
                          onChange={(event) => void updateNotification({ notificationDay: Number(event.target.value) })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none"
                        >
                          {Object.entries(WEEKLY_DAY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-bold text-slate-500">
                        Heure de notification
                        <input
                          type="time"
                          value={localSettings.notificationTime}
                          onChange={(event) => void updateNotification({ notificationTime: event.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none"
                        />
                      </label>
                    </div>
                  )}
                </section>

                {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
                {notice && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</p>}

                <div className="grid gap-3 sm:grid-cols-2">
                  {SOCIAL_CHANNELS.map((channel) => {
                    const active = selectedChannels.includes(channel);
                    return (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleChannel(channel)}
                        className={cn(
                          "flex min-h-16 items-center justify-center gap-3 rounded-2xl border px-4 text-base font-black transition hover:-translate-y-0.5",
                          active
                            ? channel === "INSTAGRAM"
                              ? "border-pink-300 bg-pink-50 text-pink-700 shadow-lg shadow-pink-100"
                              : "border-blue-300 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100"
                            : "border-slate-200 bg-white text-slate-400"
                        )}
                      >
                        {CHANNEL_LOGOS[channel]}
                        {CHANNEL_LABELS[channel]}
                        {active && <CheckCircle2 className="size-5" />}
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={() => void publish()}
                  disabled={publishing || mediaItems.length === 0 || !caption.trim()}
                  className="h-12 w-full rounded-2xl bg-[#421388] text-sm font-black text-white hover:bg-[#35106f]"
                >
                  {publishing ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
                  Publier sur Instagram et Facebook
                </Button>
              </div>

              <aside className="flex flex-col items-center justify-start lg:sticky lg:top-0">
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
                            {mediaItems[0] ? (
                              mediaItems[0].type.startsWith("video/") ? (
                                <video src={mediaItems[0].url} className="h-full w-full object-cover" muted controls />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={mediaItems[0].url} alt={mediaItems[0].name} className="h-full w-full object-cover" />
                              )
                            ) : (
                              <div className="flex h-full items-center justify-center px-6 text-center">
                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-pink-500 shadow-sm">
                                  <ImagePlus className="size-8" />
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
                            <p className="whitespace-pre-wrap text-[13px] leading-[18px] text-gray-900">
                              <strong className="mr-1">{community.name}</strong>
                              {caption || "Votre texte apparaîtra ici."}
                            </p>
                          </div>
                        </div>

                        <div className="absolute bottom-2 flex w-full justify-center pb-1">
                          <div className="h-[5px] w-[130px] rounded-full bg-gray-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-xs font-semibold text-slate-400">Aperçu smartphone, aligné sur la page Instagram</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {publishLinks && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Votre publication a bien été publiée</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Vous pouvez maintenant la consulter sur vos pages Instagram et Facebook.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {publishLinks.map((link) => (
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
            <Button type="button" variant="outline" className="mt-5 h-10 w-full rounded-xl" onClick={() => setPublishLinks(null)}>
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
