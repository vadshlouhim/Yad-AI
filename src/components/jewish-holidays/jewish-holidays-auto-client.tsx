"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Edit3, ImageIcon, Loader2, MapPin, Sparkles } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CommunityLogoPicker } from "@/components/templates/community-logo-picker";
import { ScheduleHubNav } from "@/components/templates/schedule-hub-nav";
import { Button } from "@/components/ui/button";
import { OutputLocalePicker, PosterResultActions, SchedulePosterDialog, SchedulePosterPreview, ScheduleTemplateGallery, SocialPublishPanel, type ScheduleTemplate } from "@/components/religious-schedule/poster-workflow";
import type { HolidayItem } from "@/lib/automation/jewish-holidays";
import type { OutputLocale } from "@/lib/ai/output-locale";
import type { Json } from "@/types/database.types";

type Community = { id: string; name: string; logoUrl: string | null; city: string | null; country: string; timezone: string; plan: string };
type Channel = { type: string; isActive: boolean; isConnected: boolean; settings: Json };
type InitialAutomation = { id: string; isActive: boolean; status: string; triggerConfig: Json } | null;
type HolidayTimes = { entry: string | null; exit: string | null };

type Props = { community: Community; holidays: HolidayItem[]; nextHoliday: HolidayItem | null; allTemplates: ScheduleTemplate[]; initialAutomation: InitialAutomation; channels: Channel[]; interfaceLocale: OutputLocale };

function connectedChannel(channel: Channel) {
  if (channel.isActive && channel.isConnected) return true;
  return channel.type === "WHATSAPP" && Boolean(channel.settings && typeof channel.settings === "object" && !Array.isArray(channel.settings) && channel.settings.mode === "personal");
}

export function JewishHolidaysAutoClient({ community, holidays, nextHoliday, allTemplates, initialAutomation, channels, interfaceLocale }: Props) {
  const locale = useLocale() as OutputLocale;
  const t = useTranslations("holidayTimes");
  const tx = useTranslations("shabbatTimesExtra");
  const format = useFormatter();
  const [outputLocale, setOutputLocale] = useState<OutputLocale>(interfaceLocale);
  const [selectedHolidayId, setSelectedHolidayId] = useState(nextHoliday?.id ?? holidays[0]?.id ?? "");
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [structureName, setStructureName] = useState(community.name);
  const [city, setCity] = useState(community.city ?? "");
  const [logoUrl, setLogoUrl] = useState(community.logoUrl ?? "");
  const [times, setTimes] = useState<HolidayTimes>({ entry: null, exit: null });
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const selectedHoliday = holidays.find((holiday) => holiday.id === selectedHolidayId) ?? nextHoliday ?? holidays[0] ?? null;
  const isPaid = community.plan !== "FREE_TRIAL";
  const connectedChannels = useMemo(() => new Set(channels.filter(connectedChannel).map((channel) => channel.type)), [channels]);
  const [publishChannels, setPublishChannels] = useState<string[]>(() => ["FACEBOOK", "INSTAGRAM"].filter((channel) => connectedChannels.has(channel)));

  const holidayName = useCallback((holiday: HolidayItem | null, targetLocale = outputLocale) => {
    if (!holiday) return "";
    return targetLocale === "he" ? holiday.nameHebrew || holiday.officialName : holiday.officialName;
  }, [outputLocale]);

  const gregorianDate = selectedHoliday ? format.dateTime(new Date(`${selectedHoliday.startDate}T12:00:00Z`), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—";
  const hebrewDate = selectedHoliday?.hebrewDate || "—";

  const refreshTimes = useCallback(async (holiday: HolidayItem | null, targetLocale: OutputLocale, targetCity = city) => {
    if (!holiday || !targetCity.trim()) return null;
    setLoadingTimes(true);
    setError("");
    try {
      const query = new URLSearchParams({ date: holiday.firstEveningDate || holiday.startDate, outputLocale: targetLocale, city: targetCity });
      const response = await fetch(`/api/jewish-holidays-auto/times?${query}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as HolidayTimes & { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("timesUnavailable"));
      setTimes({ entry: data.entry ?? null, exit: data.exit ?? null });
      return data;
    } catch (caught) {
      setTimes({ entry: null, exit: null });
      setError(caught instanceof Error ? caught.message : t("timesUnavailable"));
      return null;
    } finally { setLoadingTimes(false); }
  }, [city, t]);

  function openTemplate(template: ScheduleTemplate, index: number) {
    if (!isPaid && index > 0) { setPaywallOpen(true); return; }
    setSelectedTemplate(template);
    setResultImageUrl(null);
    setError("");
    setNotice("");
    void refreshTimes(selectedHoliday, outputLocale);
  }

  async function generatePoster() {
    if (!selectedTemplate || !selectedHoliday || generating) return;
    if (!structureName.trim() || !city.trim()) { setError(t("missingIdentity")); return; }
    if (!await refreshTimes(selectedHoliday, outputLocale)) return;
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/jewish-holidays-auto/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedTemplateId: selectedTemplate.id, outputLocale, holidayName: holidayName(selectedHoliday), holidayDate: selectedHoliday.startDate, timesDate: selectedHoliday.firstEveningDate || selectedHoliday.startDate, hebrewDate: selectedHoliday.hebrewDate, structureName: structureName.trim(), city: city.trim(), logoUrl: logoUrl || null }) });
      const data = await response.json().catch(() => ({})) as { imageUrl?: string; error?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.error ?? t("generationError"));
      setResultImageUrl(data.imageUrl);
      setNotice(t("ready"));
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("generationError")); }
    finally { setGenerating(false); }
  }

  async function downloadPoster() {
    if (!resultImageUrl) return;
    try {
      const response = await fetch(resultImageUrl);
      if (!response.ok) throw new Error("download");
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `horaires-fete-${selectedHoliday?.startDate ?? "affiche"}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setNotice(t("downloaded"));
    } catch { window.open(resultImageUrl, "_blank", "noopener,noreferrer"); setNotice(t("opened")); }
  }

  function buildCaption() {
    if (!selectedHoliday) return "";
    return outputLocale === "he"
      ? `${holidayName(selectedHoliday)}\n${hebrewDate}\n${city}\n${t("holidayEve")}: ${times.entry ?? "—"}\n${t("holidayExit")}: ${times.exit ?? "—"}`
      : `${holidayName(selectedHoliday)}\n${gregorianDate}\n${city}\n${t("holidayEve")} : ${times.entry ?? "—"}\n${t("holidayExit")} : ${times.exit ?? "—"}`;
  }

  async function publishPoster() {
    if (!resultImageUrl || publishing) return;
    if (publishChannels.length === 0) { setError(tx("selectNetwork")); return; }
    setPublishing(true);
    setError("");
    try {
      const response = await fetch("/api/jewish-holidays-auto/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: buildCaption(), imageUrl: resultImageUrl, channels: publishChannels, holidayName: holidayName(selectedHoliday) }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("publishError"));
      setNotice(t("published"));
    } catch (caught) { setError(caught instanceof Error ? caught.message : t("publishError")); }
    finally { setPublishing(false); }
  }

  return (
    <div dir={locale === "he" ? "rtl" : "ltr"} className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 text-start sm:px-6 sm:pt-7">
      <div className="mb-5"><ScheduleHubNav active="holidays" /></div>
      <header className="relative overflow-hidden rounded-[2rem] bg-[#421388] px-5 py-7 text-white shadow-[0_22px_55px_rgba(66,19,136,0.24)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -end-8 -top-10 size-44 rounded-full border border-white/10 bg-white/[0.04]" /><div className="pointer-events-none absolute -bottom-20 end-24 size-52 rounded-full border border-white/10" />
        <div className="relative max-w-3xl"><span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15"><Clock3 className="size-6" /></span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{t("create")}</h1><p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-violet-100 sm:text-base">{t("intro")}</p></div>
      </header>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">{t(initialAutomation ? "legacyAutomationNotice" : "manualNotice")}</div>
      <section className="mt-7">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-2xl font-black tracking-tight text-slate-950">{t("choosePoster")}</h2><p className="mt-1 text-sm text-slate-500">{t("galleryHelp")}</p></div><span className="hidden rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-[#421388] sm:inline-flex">{t("templateCount", { count: allTemplates.length })}</span></div>
        <ScheduleTemplateGallery templates={allTemplates} isPaid={isPaid} onSelect={openTemplate} emptyTitle={t("noPoster")} emptyHelp={t("noPosterHelp")} offeredLabel={tx("offered")} premiumLabel={t("premium")} />
      </section>

      <SchedulePosterDialog open={Boolean(selectedTemplate)} busy={generating || publishing} eyebrow={t("title")} title={resultImageUrl ? t("ready") : t("customize")} closeLabel={tx("close")} onClose={() => setSelectedTemplate(null)}>
        {selectedTemplate ? <>
          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <OutputLocalePicker value={outputLocale} onChange={(next) => { setOutputLocale(next); setResultImageUrl(null); void refreshTimes(selectedHoliday, next); }} label={t("outputLanguage")} help={t("outputHelp")} frLabel={t("fr")} heLabel={t("he")} />
              {!resultImageUrl ? <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-950">{t("posterInfo")}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{t("autoUpdate")}</p></div>{loadingTimes ? <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black text-[#421388]">{t("updating")}</span> : null}</div>
                <label className="mt-4 block text-sm font-bold text-slate-800"><span className="flex items-center gap-2"><Sparkles className="size-4 text-[#421388]" />{t("holiday")}</span><select value={selectedHolidayId} onChange={(event) => { const id = event.target.value; const holiday = holidays.find((item) => item.id === id) ?? null; setSelectedHolidayId(id); setResultImageUrl(null); void refreshTimes(holiday, outputLocale); }} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none focus:border-[#421388] focus:ring-4 focus:ring-violet-100">{holidays.map((holiday) => <option key={holiday.id} value={holiday.id}>{holidayName(holiday)}</option>)}</select></label>
                <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-800"><span className="flex items-center gap-2"><Edit3 className="size-4 text-[#421388]" />{tx("structureName")}</span><input value={structureName} onChange={(event) => setStructureName(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-semibold outline-none focus:border-[#421388] focus:ring-4 focus:ring-violet-100" /></label><label className="block text-sm font-bold text-slate-800"><span className="flex items-center gap-2"><MapPin className="size-4 text-[#421388]" />{tx("city")}</span><input value={city} onChange={(event) => { setCity(event.target.value); setTimes({ entry: null, exit: null }); }} onBlur={() => void refreshTimes(selectedHoliday, outputLocale)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 font-semibold outline-none focus:border-[#421388] focus:ring-4 focus:ring-violet-100" /></label></div>
                <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-3"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[0.12em] text-[#421388]">{t("prefilled")}</p>{loadingTimes ? <Loader2 className="size-4 animate-spin text-[#421388]" /> : <CheckCircle2 className="size-4 text-emerald-600" />}</div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[[t("date"), gregorianDate], [t("hebrewDate"), hebrewDate], [t("holidayEve"), times.entry ?? "—"], [t("holidayExit"), times.exit ?? "—"]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-white px-2.5 py-2 text-center shadow-sm ring-1 ring-violet-100"><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-black text-slate-900 sm:text-sm" dir={String(value).includes(":") ? "ltr" : undefined}>{value}</p></div>)}</div></div>
                <CommunityLogoPicker value={logoUrl || null} onChange={(url) => setLogoUrl(url)} onBusyChange={setUploadingLogo} onError={setError} />
                <Button type="button" size="xl" className="mt-5 w-full rounded-2xl bg-[#d92d7c] font-black shadow-lg shadow-pink-950/20 hover:bg-[#c5236e]" loading={generating} disabled={uploadingLogo || loadingTimes || generating} onClick={() => void generatePoster()}>{!generating ? <Sparkles className="size-5" /> : null}{generating ? t("generating") : t("generate")}</Button>
              </div> : <PosterResultActions onEdit={() => { setResultImageUrl(null); setNotice(""); }} onDownload={() => void downloadPoster()} editLabel={tx("edit")} downloadLabel={tx("download")} />}
              {error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
              {notice ? <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="size-5 shrink-0" />{notice}</p> : null}
            </div>
            <aside className="space-y-4">{resultImageUrl ? <SocialPublishPanel connected={connectedChannels} selected={publishChannels} onToggle={(id) => setPublishChannels((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onPublish={() => void publishPoster()} publishing={publishing} title={t("publishNow")} help={t("selectAccounts")} disconnectedLabel={t("notConnected")} publishLabel={t("publish")} /> : null}</aside>
          </div>
          <div className="border-t border-violet-100 bg-white/55 px-4 pb-7 pt-6 sm:px-6 sm:pb-8"><div className="mx-auto max-w-sm"><SchedulePosterPreview template={selectedTemplate} imageUrl={resultImageUrl} alt={t("previewAlt")} /></div></div>
        </> : null}
      </SchedulePosterDialog>
      {paywallOpen ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"><ImageIcon className="mx-auto size-10 text-[#421388]" /><h2 className="mt-4 text-xl font-black text-slate-950">{t("premium")}</h2><p className="mt-2 text-sm text-slate-600">{t("premiumHelp")}</p><Button type="button" className="mt-5" onClick={() => setPaywallOpen(false)}>{tx("close")}</Button></div></div> : null}
    </div>
  );
}
