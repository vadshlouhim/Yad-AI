"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Info, ImagePlus, Loader2, RotateCcw, Sparkles, Upload, WandSparkles, X } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/layout/dashboard-nav";
import { cn } from "@/lib/utils";

type NetworkType = "FACEBOOK" | "INSTAGRAM";
type Tone = "warm" | "festive" | "simple";
type Moment = "now" | "tonight" | "custom";
type Channel = { id: string; type: NetworkType; name: string | null; handle: string | null; isConnected: boolean; isActive: boolean };
type Draft = { idea: string; tone: Tone; versions: Record<NetworkType, string>; mediaUrls: string[]; selectedNetworks: NetworkType[]; moment: Moment; customDate: string; repeatWeekly: boolean };
type SuccessState = { scheduled: boolean; date: string | null; networks: NetworkType[] };

const NETWORKS: Array<{ type: NetworkType; icon: typeof FacebookIcon; limit: number }> = [
  { type: "FACEBOOK", icon: FacebookIcon, limit: 63_206 },
  { type: "INSTAGRAM", icon: InstagramIcon, limit: 2_200 },
];
const DRAFT_KEY = "easycom:social-composer:v2";

function nextSundayAtSeven() { const value = new Date(); const days = (7 - value.getDay()) % 7 || 7; value.setDate(value.getDate() + days); value.setHours(19, 0, 0, 0); return value; }
function tonightAtSeven() { const value = new Date(); value.setHours(19, 0, 0, 0); if (value.getTime() <= Date.now()) value.setDate(value.getDate() + 1); return value; }
function dateTimeLocal(date: Date) { const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16); }

function StepCard({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="rounded-[20px] border border-[#eee9f7] bg-white p-4 shadow-[0_8px_28px_rgba(54,31,92,0.05)] sm:p-5"><div className="mb-4 flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700">{number}</span><h2 className="text-[15px] font-black text-slate-900">{title}</h2></div>{children}</section>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={cn("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-violet-600" : "bg-slate-200")}><span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", checked ? "start-6" : "start-1")} /></button>;
}

export function SocialNetworksClient() {
  const t = useTranslations("socialComposer");
  const locale = useLocale();
  const rtl = locale === "he";
  const fileRef = useRef<HTMLInputElement>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState<Tone>("warm");
  const [versions, setVersions] = useState<Record<NetworkType, string>>({ FACEBOOK: "", INSTAGRAM: "" });
  const [activeTextNetwork, setActiveTextNetwork] = useState<NetworkType>("FACEBOOK");
  const [activePreviewNetwork, setActivePreviewNetwork] = useState<NetworkType>("FACEBOOK");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedNetworks, setSelectedNetworks] = useState<NetworkType[]>([]);
  const [moment, setMoment] = useState<Moment>("now");
  const [customDate, setCustomDate] = useState(dateTimeLocal(nextSundayAtSeven()));
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [shabbatMode, setShabbatMode] = useState(true);
  const [scheduleAdjustment, setScheduleAdjustment] = useState<{ publishAt: string; reason: string | null } | null>(null);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const loadChannels = useCallback(async () => {
    try {
      const response = await fetch("/api/social-networks", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { channels?: Channel[] };
      const visible = (data.channels ?? []).filter((channel) => NETWORKS.some((item) => item.type === channel.type));
      setChannels(visible);
      setSelectedNetworks(visible.filter((channel) => channel.isConnected && channel.isActive).map((channel) => channel.type));
    } catch { setError(t("errors.load")); }
  }, [t]);

  useEffect(() => { void loadChannels(); }, [loadChannels]);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("idea");
    if (fromUrl) setIdea(fromUrl.slice(0, 4_000));
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return;
    try { const draft = JSON.parse(stored) as Draft; if (draft.idea || draft.versions?.FACEBOOK || draft.mediaUrls?.length) setDraftAvailable(true); }
    catch { localStorage.removeItem(DRAFT_KEY); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft: Draft = { idea, tone, versions, mediaUrls, selectedNetworks, moment, customDate, repeatWeekly };
      if (idea || versions.FACEBOOK || versions.INSTAGRAM || mediaUrls.length) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [idea, tone, versions, mediaUrls, selectedNetworks, moment, customDate, repeatWeekly]);

  const requestedDate = useMemo(() => {
    if (moment === "now") return null;
    if (moment === "tonight") return tonightAtSeven();
    const value = new Date(customDate);
    return Number.isNaN(value.getTime()) ? null : value;
  }, [moment, customDate]);

  useEffect(() => {
    if (!shabbatMode || !requestedDate) { setScheduleAdjustment(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/social-networks/schedule-check?at=${encodeURIComponent(requestedDate.toISOString())}`, { signal: controller.signal });
        if (!response.ok) return;
        const value = await response.json() as { adjusted: boolean; publishAt: string; reason: string | null };
        setScheduleAdjustment(value.adjusted ? { publishAt: value.publishAt, reason: value.reason } : null);
      } catch { /* Server-side guard remains authoritative. */ }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [requestedDate, shabbatMode]);

  const restoreDraft = () => {
    const stored = localStorage.getItem(DRAFT_KEY); if (!stored) return;
    try { const draft = JSON.parse(stored) as Draft; setIdea(draft.idea ?? ""); setTone(draft.tone ?? "warm"); setVersions(draft.versions ?? { FACEBOOK: "", INSTAGRAM: "" }); setMediaUrls(draft.mediaUrls ?? []); setSelectedNetworks(draft.selectedNetworks ?? []); setMoment(draft.moment ?? "now"); setCustomDate(draft.customDate ?? dateTimeLocal(nextSundayAtSeven())); setRepeatWeekly(Boolean(draft.repeatWeekly)); }
    finally { setDraftAvailable(false); }
  };

  const generate = async () => {
    if (!idea.trim()) { setError(t("errors.ideaRequired")); return; }
    setGenerating(true); setError(null);
    try {
      const response = await fetch("/api/publishing/social-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: idea, tone, locale }) });
      if (!response.ok) throw new Error();
      const value = await response.json() as { versions: Record<NetworkType, string> };
      setVersions(value.versions);
    } catch { setError(t("errors.ai")); } finally { setGenerating(false); }
  };

  const uploadImage = async (file: File) => {
    setUploading(true); setError(null);
    try { const form = new FormData(); form.append("file", file); const response = await fetch("/api/uploads/attachment", { method: "POST", body: form }); if (!response.ok) throw new Error(); const value = await response.json() as { url?: string; publicUrl?: string }; const url = value.url ?? value.publicUrl; if (!url) throw new Error(); setMediaUrls([url]); }
    catch { setError(t("errors.upload")); } finally { setUploading(false); }
  };

  const toggleNetwork = (type: NetworkType) => { const channel = channels.find((item) => item.type === type); if (!channel?.isConnected) return; setSelectedNetworks((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]); };

  const submit = async () => {
    setError(null);
    if (selectedNetworks.length === 0) { setError(t("errors.networkRequired")); return; }
    if (selectedNetworks.some((network) => !versions[network].trim())) { setError(t("errors.textRequired")); return; }
    if (selectedNetworks.includes("INSTAGRAM") && mediaUrls.length === 0) { setError(t("errors.instagramImage")); return; }
    if (moment === "now" && !window.confirm(t("actions.confirmNow"))) return;
    if (requestedDate && requestedDate.getTime() <= Date.now()) { setError(t("errors.future")); return; }
    setSubmitting(true);
    try {
      const safeDate = scheduleAdjustment ? new Date(scheduleAdjustment.publishAt) : requestedDate;
      const scheduledDates = safeDate ? Array.from({ length: repeatWeekly ? 8 : 1 }, (_, index) => new Date(safeDate.getTime() + index * 7 * 86_400_000).toISOString()) : undefined;
      const response = await fetch("/api/social-networks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: versions.FACEBOOK || versions.INSTAGRAM, texts: versions, mediaUrls, channelTypes: selectedNetworks, scheduledAt: null, scheduledDates, repeatWeekly }) });
      if (!response.ok) throw new Error();
      localStorage.removeItem(DRAFT_KEY); setSuccess({ scheduled: Boolean(safeDate), date: safeDate?.toISOString() ?? null, networks: selectedNetworks });
    } catch { setError(t("errors.publish")); } finally { setSubmitting(false); }
  };

  const reset = () => { setIdea(""); setVersions({ FACEBOOK: "", INSTAGRAM: "" }); setMediaUrls([]); setMoment("now"); setRepeatWeekly(false); setSuccess(null); localStorage.removeItem(DRAFT_KEY); };
  const activeText = versions[activeTextNetwork];
  const previewText = versions[activePreviewNetwork];
  const chosenCount = selectedNetworks.length;
  const formattedSuggestion = new Intl.DateTimeFormat(locale, { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(nextSundayAtSeven());
  const effectiveDate = scheduleAdjustment ? new Date(scheduleAdjustment.publishAt) : requestedDate;

  return <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f4fb] pb-36 text-slate-900">
    <div className="mx-auto w-full max-w-[720px] space-y-4 px-3 py-4 sm:px-5 sm:py-6">
      <header className="flex min-h-12 items-center justify-between gap-3"><Link href="/dashboard" aria-label={t("header.back")} className="flex size-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-[#eee9f7]"><ArrowLeft className={cn("size-5", rtl && "rotate-180")} /></Link><h1 className="text-lg font-black">{t("header.title")}</h1><Link href="/dashboard/settings" aria-label={t("header.profile")} className="flex size-11 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700 ring-1 ring-violet-200">EC</Link></header>
      <div className="flex justify-end"><Link href="/dashboard/social-networks/planning" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-violet-700 ring-1 ring-[#e8e0f5]"><CalendarDays className="size-4" />{t("header.week")}</Link></div>
      {draftAvailable ? <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm"><span className="font-bold text-violet-950">{t("draft.resume")}</span><div className="flex gap-2"><button type="button" onClick={restoreDraft} className="min-h-11 rounded-xl bg-violet-600 px-3 font-bold text-white">{t("draft.restore")}</button><button type="button" onClick={() => { localStorage.removeItem(DRAFT_KEY); setDraftAvailable(false); }} aria-label={t("draft.dismiss")} className="flex size-11 items-center justify-center rounded-xl text-violet-700"><X className="size-4" /></button></div></div> : null}

      <section className="overflow-hidden rounded-[20px] bg-gradient-to-br from-[#6d28d9] via-[#9333ea] to-[#ec4899] p-5 text-white shadow-[0_18px_40px_rgba(109,40,217,0.2)]"><p className="text-xl font-black tracking-tight">{t("hero.title")}</p><p className="mt-1 text-sm text-white/80">{t("hero.subtitle")}</p><div className="mt-4 flex flex-wrap gap-2">{NETWORKS.map(({ type, icon: Icon }) => { const channel = channels.find((item) => item.type === type); return channel?.isConnected ? <span key={type} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white/95 px-3 text-xs font-bold text-slate-800"><Icon className="size-4" /><span className="max-w-36 truncate">{channel.name || channel.handle || t(`networks.${type}`)}</span><Check className="size-4 text-emerald-600" /></span> : <Link key={type} href={`/api/auth/oauth/${type.toLowerCase()}?returnTo=/dashboard/social-networks`} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white/20 px-3 text-xs font-bold ring-1 ring-white/30"><Icon className="size-4" />{t("hero.connect")}</Link>; })}</div></section>

      <StepCard number="1" title={t("message.title")}>
        <textarea value={idea} onChange={(event) => setIdea(event.target.value)} dir="auto" rows={4} placeholder={t("message.placeholder")} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
        <div className="mt-3 flex flex-wrap gap-2">{(["warm", "festive", "simple"] as Tone[]).map((value) => <button key={value} type="button" onClick={() => setTone(value)} className={cn("min-h-11 rounded-full border px-4 text-sm font-bold", tone === value ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600")}>{t(`message.tones.${value}`)}</button>)}</div>
        <div className={cn("mt-3 flex gap-2 overflow-x-auto pb-1", rtl && "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}>{(["torah", "kiddush", "holiday", "shabbat", "event"] as const).map((key) => <button key={key} type="button" onClick={() => setIdea(t(`message.templates.${key}.text`))} className="min-h-10 shrink-0 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-700">{t(`message.templates.${key}.label`)}</button>)}</div>
        <button type="button" onClick={generate} disabled={generating} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-pink-500 px-5 text-sm font-black text-white shadow-lg shadow-violet-200 disabled:opacity-60">{generating ? <><Loader2 className="size-4 animate-spin" />{t("message.generating")}</> : <><Sparkles className="size-4" />{t("message.generate")}</>}</button>
        {(versions.FACEBOOK || versions.INSTAGRAM) ? <div className="mt-5"><div className="flex rounded-xl bg-slate-100 p-1">{NETWORKS.map(({ type, icon: Icon }) => <button key={type} type="button" onClick={() => setActiveTextNetwork(type)} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold transition", activeTextNetwork === type ? "bg-white text-violet-800 shadow-sm" : "text-slate-500")}><Icon className="size-4" />{t(`networks.${type}`)}</button>)}</div><textarea value={activeText} onChange={(event) => setVersions((current) => ({ ...current, [activeTextNetwork]: event.target.value }))} dir="auto" rows={7} className="mt-3 w-full resize-y rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-violet-400" /><div className="mt-2 flex items-center justify-between gap-3 text-xs"><button type="button" onClick={generate} disabled={generating} className="inline-flex min-h-10 items-center gap-2 font-bold text-violet-700"><RotateCcw className="size-3.5" />{t("message.another")}</button><span className={cn("font-bold", activeText.length > (NETWORKS.find((item) => item.type === activeTextNetwork)?.limit ?? 0) ? "text-red-600" : "text-slate-400")}>{activeText.length.toLocaleString(locale)} / {(NETWORKS.find((item) => item.type === activeTextNetwork)?.limit ?? 0).toLocaleString(locale)}</span></div></div> : null}
      </StepCard>

      <StepCard number="2" title={t("image.title")}>
        {mediaUrls[0] ? <div><div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100"><img src={mediaUrls[0]} alt={t("image.alt")} className="h-full w-full object-cover" /></div><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-700">{t("image.replace")}</button><button type="button" onClick={() => setMediaUrls([])} className="min-h-11 rounded-xl border border-red-100 text-sm font-bold text-red-600">{t("image.remove")}</button></div></div> : <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 text-violet-700"><ImagePlus className="size-7" /><span className="text-sm font-bold">{t("image.empty")}</span></button>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.currentTarget.value = ""; }} />
        <div className="mt-3 grid grid-cols-3 gap-2"><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 px-1 text-[11px] font-bold text-slate-700">{uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}{t("image.upload")}</button><Link href="/dashboard/media-library?returnTo=/dashboard/social-networks" className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 px-1 text-center text-[11px] font-bold text-slate-700"><ImagePlus className="size-4" />{t("image.library")}</Link><Link href="/dashboard/templates?create=ai&returnTo=/dashboard/social-networks" className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 px-1 text-center text-[11px] font-bold text-slate-700"><WandSparkles className="size-4" />{t("image.ai")}</Link></div>
      </StepCard>

      <StepCard number="3" title={t("preview.title")}><div className="mb-3 flex rounded-xl bg-slate-100 p-1">{NETWORKS.map(({ type, icon: Icon }) => <button key={type} type="button" onClick={() => setActivePreviewNetwork(type)} className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold", activePreviewNetwork === type ? "bg-white text-violet-800 shadow-sm" : "text-slate-500")}><Icon className="size-4" />{t(`networks.${type}`)}</button>)}</div><article className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center gap-3 p-3"><div className="flex size-10 items-center justify-center rounded-full bg-violet-100 font-black text-violet-700">EC</div><div><p className="text-sm font-black">{channels.find((item) => item.type === activePreviewNetwork)?.name || t("preview.pageName")}</p><p className="text-xs text-slate-400">{t("preview.time")}</p></div></div><p dir="auto" className="whitespace-pre-wrap px-3 pb-3 text-sm leading-5 text-slate-700">{previewText ? `${previewText.slice(0, 280)}${previewText.length > 280 ? `… ${t("preview.more")}` : ""}` : t("preview.empty")}</p>{mediaUrls[0] ? <div className={cn("overflow-hidden bg-slate-100", activePreviewNetwork === "INSTAGRAM" ? "aspect-square" : "aspect-[1.91/1]")}><img src={mediaUrls[0]} alt={t("image.alt")} className="h-full w-full object-cover" /></div> : null}</article></StepCard>

      <StepCard number="4" title={t("channels.title")}><div className="divide-y divide-slate-100">{NETWORKS.map(({ type, icon: Icon }) => { const channel = channels.find((item) => item.type === type); const connected = Boolean(channel?.isConnected); return <div key={type} className="flex min-h-16 items-center gap-3 py-2"><span className="flex size-11 items-center justify-center rounded-xl bg-slate-100"><Icon className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-black">{t(`networks.${type}`)}</p>{connected && rtl ? <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800"><Check className="size-3.5 shrink-0" />{t("channels.connected")} · {channel?.name || channel?.handle || t(`networks.${type}`)}</p> : connected ? <p className="truncate text-xs font-bold text-emerald-600">● {t("channels.connected")} · {channel?.name || channel?.handle || t(`networks.${type}`)}</p> : <p className={cn("text-xs", rtl ? "font-medium text-slate-600" : "text-slate-400")}>{t("channels.disconnected")}</p>}</div>{connected && rtl ? <button type="button" onClick={() => toggleNetwork(type)} aria-pressed={selectedNetworks.includes(type)} aria-label={t("channels.toggle", { network: t(`networks.${type}`) })} className={cn("flex size-11 items-center justify-center rounded-xl border transition", selectedNetworks.includes(type) ? "border-emerald-300 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-white text-slate-400")}><Check className="size-5" /></button> : connected ? <Toggle checked={selectedNetworks.includes(type)} onChange={() => toggleNetwork(type)} label={t("channels.toggle", { network: t(`networks.${type}`) })} /> : <Link href={`/api/auth/oauth/${type.toLowerCase()}?returnTo=/dashboard/social-networks`} className="inline-flex min-h-11 items-center rounded-xl border border-violet-200 px-3 text-xs font-black text-violet-700">{t("channels.connect")}</Link>}</div>; })}</div>{chosenCount === 0 ? <p className={cn("mt-3 p-3 text-sm font-bold", rtl ? "flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 text-violet-900" : "rounded-xl bg-red-50 text-red-700")}>{rtl ? <Info className="size-5 shrink-0" /> : null}{t("errors.networkRequired")}</p> : null}</StepCard>

      <StepCard number="5" title={t("schedule.title")}><div className="grid grid-cols-3 gap-2">{(["now", "tonight", "custom"] as Moment[]).map((value) => <button key={value} type="button" onClick={() => setMoment(value)} className={cn("min-h-11 rounded-full border px-2 text-xs font-black", moment === value ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600")}>{t(`schedule.moments.${value}`)}</button>)}</div>{moment === "custom" ? <input type="datetime-local" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 px-3 text-sm" /> : null}<button type="button" onClick={() => { setMoment("custom"); setCustomDate(dateTimeLocal(nextSundayAtSeven())); }} className="mt-4 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-start text-sm font-bold text-amber-950"><span className="text-xl">⭐</span><span>{t("schedule.suggestion", { time: formattedSuggestion })}</span></button><div className="mt-3 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-3"><span className="text-xl">🕯️</span><p className="flex-1 text-sm font-bold text-sky-950">{t("schedule.shabbat")}</p><Toggle checked={shabbatMode} onChange={() => setShabbatMode((value) => !value)} label={t("schedule.shabbatToggle")} /></div>{scheduleAdjustment ? <p className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-900">{t("schedule.adjusted", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(scheduleAdjustment.publishAt)) })}</p> : null}{moment !== "now" ? <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-bold"><input type="checkbox" checked={repeatWeekly} onChange={(event) => setRepeatWeekly(event.target.checked)} className="size-5 accent-violet-600" />{t("schedule.repeat")}</label> : null}</StepCard>
      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}
    </div>

    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 border-t border-[#eee9f7] bg-white/95 p-3 shadow-[0_-10px_30px_rgba(54,31,92,0.08)] backdrop-blur md:bottom-0"><div className="mx-auto flex max-w-[720px] gap-2"><button type="button" onClick={() => void submit()} disabled={submitting || chosenCount === 0} className={cn("inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white shadow-lg shadow-violet-200 disabled:cursor-not-allowed", rtl ? "bg-violet-700 transition hover:bg-violet-800 disabled:bg-violet-700/45 disabled:text-white" : "bg-gradient-to-r from-violet-700 to-pink-500 disabled:opacity-45")}>{submitting ? <Loader2 className="size-4 animate-spin" /> : moment === "now" ? t("actions.publish", { count: chosenCount }) : t("actions.schedule", { count: chosenCount })}</button><button type="button" onClick={() => { localStorage.setItem(DRAFT_KEY, JSON.stringify({ idea, tone, versions, mediaUrls, selectedNetworks, moment, customDate, repeatWeekly })); setDraftAvailable(false); }} className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">{t("actions.draft")}</button></div></div>

    {success ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="publish-success-title" className="w-full max-w-sm rounded-[24px] bg-white p-6 text-center shadow-2xl"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="size-9" /></span><h2 id="publish-success-title" className="mt-4 text-2xl font-black">{t(success.scheduled ? "success.scheduled" : "success.published")}</h2>{effectiveDate ? <p className="mt-2 text-sm text-slate-500">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(effectiveDate)}</p> : null}<div className="mt-4 flex justify-center gap-2">{success.networks.map((network) => { const Icon = NETWORKS.find((candidate) => candidate.type === network)!.icon; return <span key={network} className="flex size-10 items-center justify-center rounded-full bg-slate-100"><Icon className="size-5" /></span>; })}</div><div className="mt-6 grid gap-2"><Link href="/dashboard/social-networks/planning" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-violet-600 font-black text-white">{t("success.week")}</Link><button type="button" onClick={reset} className="min-h-12 rounded-2xl border border-slate-200 font-black text-slate-700">{t("success.new")}</button></div></section></div> : null}
  </div>;
}
