"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { BookOpen, CalendarDays, Check, ChevronDown, Crown, ExternalLink, Instagram, Pause, Pencil, ScrollText, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacebookIcon } from "@/components/layout/dashboard-nav";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
import { cn } from "@/lib/utils";

const DAYS = [
  { value: 0, label: "Dimanche", short: "Dim" },
  { value: 1, label: "Lundi", short: "Lun" },
  { value: 2, label: "Mardi", short: "Mar" },
  { value: 3, label: "Mercredi", short: "Mer" },
  { value: 4, label: "Jeudi", short: "Jeu" },
  { value: 5, label: "Vendredi", short: "Ven" },
] as const;

type Props = {
  communityName: string;
  communityLogoUrl: string | null;
  timezone: string;
  eligible: boolean;
  channels: Array<{ type: "FACEBOOK" | "INSTAGRAM"; connected: boolean; name: string | null }>;
  todayStudy: {
    dateLabel: string;
    hayomYom: string;
    hayomYomUrl: string;
    seferHamitsvot: string;
    seferHamitsvotUrl: string;
  } | null;
  initialAutomation: { id: string; active: boolean; days: number[]; channels: ("FACEBOOK" | "INSTAGRAM")[]; nextRunAt: string | null } | null;
};

function dayNames(days: number[]) {
  return DAYS.filter((day) => days.includes(day.value)).map((day) => day.label).join(", ");
}

function nextRunLabel(value: string | null, timezone: string) {
  if (!value) return "À programmer";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: timezone,
  }).format(new Date(value));
}

export function HayomYomSeferHamitsvotClient({ communityName, timezone, eligible, channels: availableChannels, todayStudy, initialAutomation }: Props) {
  const [days, setDays] = useState<number[]>(initialAutomation?.days ?? [1]);
  const [channels, setChannels] = useState<("FACEBOOK" | "INSTAGRAM")[]>(initialAutomation?.channels ?? ["FACEBOOK"]);
  const [active, setActive] = useState(Boolean(initialAutomation?.active));
  const [editing, setEditing] = useState(!initialAutomation?.active);
  const [nextRunAt, setNextRunAt] = useState(initialAutomation?.nextRunAt ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [hayomYomOpen, setHayomYomOpen] = useState(false);
  const [seferHamitsvotOpen, setSeferHamitsvotOpen] = useState(false);
  const selectedDaysLabel = useMemo(() => dayNames(days), [days]);
  const facebook = availableChannels.find((channel) => channel.type === "FACEBOOK") ?? { connected: false, name: null };
  const instagram = availableChannels.find((channel) => channel.type === "INSTAGRAM") ?? { connected: false, name: null };
  const hasSelectedConnectedChannel = channels.some((type) => availableChannels.some((channel) => channel.type === type && channel.connected));

  function toggleChannel(channel: "FACEBOOK" | "INSTAGRAM") {
    if (!eligible) return setPaywallOpen(true);
    setChannels((current) => current.includes(channel) ? current.filter((value) => value !== channel) : [...current, channel]);
    setError("");
  }

  function toggleDay(day: number) {
    if (!eligible) {
      setPaywallOpen(true);
      return;
    }
    setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort());
    setError("");
  }

  async function save(mode: "activate" | "pause") {
    if (!eligible) {
      setPaywallOpen(true);
      return;
    }
    if (mode === "activate" && days.length === 0) {
      setError("Sélectionnez au moins un jour de publication.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/hayom-yom-sefer-hamitsvot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, days, channels }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; nextRunAt?: string | null };
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      const isActive = mode === "activate";
      setActive(isActive);
      setEditing(!isActive);
      setNextRunAt(data.nextRunAt ?? null);
      setNotice(isActive ? "La publication automatique est activée." : "L’automatisation est en pause.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-7">
      <section className="relative min-h-[11rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_72%_12%,#7028bd_0%,#421388_45%,#210763_100%)] px-5 py-5 text-white shadow-[0_24px_58px_rgba(49,13,108,0.26)] sm:min-h-[17rem] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-52 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="relative z-10 max-w-[72%] sm:max-w-3xl">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20 sm:size-12"><BookOpen className="size-6" /></span>
          <h1 className="mt-4 text-[clamp(1.75rem,8vw,2.6rem)] font-black leading-[1.03] tracking-[-0.04em] sm:mt-5 sm:text-4xl">Hayom Yom et Sefer Hamitsvot</h1>
          <p className="mt-3 hidden max-w-2xl text-sm font-semibold leading-6 text-white/78 sm:block sm:text-base">Les études quotidiennes publiées sur une carte à votre image, sans génération IA, sur Facebook et Instagram.</p>
        </div>
        <Image src={AGENT_IMAGE_URLS.david} alt="David, agent des automatisations" width={240} height={280} className="absolute -bottom-3 -right-5 z-10 h-[10.5rem] w-auto object-contain object-bottom drop-shadow-[0_18px_24px_rgba(12,2,35,0.34)] sm:-right-2 sm:h-[16rem]" priority />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffaf4] shadow-[0_18px_46px_rgba(66,19,136,0.09)]">
        <div className="relative overflow-hidden border-b border-violet-100 bg-white p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-40 rounded-full bg-fuchsia-300/20 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7130d8] to-[#d92d7c] text-white shadow-lg shadow-violet-200"><Sparkles className="size-5" /></span>
            <div>
              <p className="bg-gradient-to-r from-[#d92d7c] to-[#087c76] bg-clip-text text-xs font-black uppercase tracking-[0.16em] text-transparent">Les études d’aujourd’hui</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{todayStudy?.dateLabel ?? "Contenu en cours de récupération"}</h2>
            </div>
          </div>
        </div>
        {todayStudy ? (
          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
            <article className="overflow-hidden rounded-[1.6rem] border border-violet-400/30 bg-gradient-to-br from-[#7130d8] to-[#5420ad] p-4 text-white shadow-[0_13px_28px_rgba(84,32,173,0.2)] sm:p-5">
              <button type="button" onClick={() => setHayomYomOpen((open) => !open)} aria-expanded={hayomYomOpen} aria-controls="today-hayom-yom" className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-4">
                <span className="flex items-center gap-2 text-lg font-black text-white"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#6428bd]"><BookOpen className="size-5" /></span>Hayom Yom</span>
                <span className="flex items-center gap-1 text-xs font-black text-white/85"><span className="hidden sm:inline">{hayomYomOpen ? "Masquer" : "Afficher"}</span><ChevronDown className={cn("size-5 transition-transform duration-200", hayomYomOpen && "rotate-180")} /></span>
              </button>
              {hayomYomOpen ? (
                <div id="today-hayom-yom" className="mt-4 rounded-[1.25rem] bg-white p-4 text-slate-700 shadow-inner">
                  <p className="whitespace-pre-line text-sm font-medium leading-7 text-slate-700">{todayStudy.hayomYom}</p>
                  <a href={todayStudy.hayomYomUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-100"><ExternalLink className="size-4" />Lire sur Beth Loubavitch</a>
                </div>
              ) : null}
            </article>
            <article className="overflow-hidden rounded-[1.6rem] border border-teal-400/30 bg-gradient-to-br from-[#0faeb3] to-[#078e9b] p-4 text-white shadow-[0_13px_28px_rgba(7,142,155,0.2)] sm:p-5">
              <button type="button" onClick={() => setSeferHamitsvotOpen((open) => !open)} aria-expanded={seferHamitsvotOpen} aria-controls="today-sefer-hamitsvot" className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-4">
                <span className="flex items-center gap-2 text-lg font-black text-white"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#078e9b]"><ScrollText className="size-5" /></span>Sefer Hamitsvot</span>
                <span className="flex items-center gap-1 text-xs font-black text-white/85"><span className="hidden sm:inline">{seferHamitsvotOpen ? "Masquer" : "Afficher"}</span><ChevronDown className={cn("size-5 transition-transform duration-200", seferHamitsvotOpen && "rotate-180")} /></span>
              </button>
              {seferHamitsvotOpen ? (
                <div id="today-sefer-hamitsvot" className="mt-4 rounded-[1.25rem] bg-white p-4 text-slate-700 shadow-inner">
                  <p className="whitespace-pre-line text-sm font-medium leading-7 text-slate-700">{todayStudy.seferHamitsvot}</p>
                  <a href={todayStudy.seferHamitsvotUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 transition hover:bg-teal-100"><ExternalLink className="size-4" />Lire sur Beth Loubavitch</a>
                </div>
              ) : null}
            </article>
          </div>
        ) : <p className="p-6 text-sm font-semibold text-slate-500">Le contenu du jour est momentanément indisponible. Il sera recherché à nouveau lors de la prochaine ouverture.</p>}
      </section>

      {active && !editing ? (
        <section className="relative overflow-hidden rounded-[2rem] border border-emerald-100 bg-[#fffaf4] p-5 shadow-[0_18px_46px_rgba(16,185,129,0.1)] sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-emerald-300/20 blur-2xl" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16b86b] to-[#078e50] text-white shadow-lg shadow-emerald-200"><ShieldCheck className="size-6" /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Automatisation active</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{selectedDaysLabel} à 10:00</h2>
                <p className="mt-2 text-sm text-slate-600">Prochaine publication : <strong>{nextRunLabel(nextRunAt, timezone)}</strong></p>
                <p className="mt-1 text-sm text-slate-500">{channels.join(" · ")} · {communityName}</p>
              </div>
            </div>
            <div className="relative grid grid-cols-2 gap-3">
              <button type="button" onClick={() => eligible ? setEditing(true) : setPaywallOpen(true)} className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-blue-400 bg-gradient-to-br from-[#2878ef] to-[#175acb] px-4 font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:brightness-105"><Pencil className="size-5" />Modifier</button>
              <button type="button" disabled={saving} onClick={() => void save("pause")} className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-amber-400 bg-gradient-to-br from-[#ffbd17] to-[#ee9100] px-4 font-black text-white shadow-lg shadow-amber-200 transition hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-60"><Pause className="size-5" />Mettre en pause</button>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-5 shadow-[0_18px_46px_rgba(66,19,136,0.09)] sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-violet-300/15 blur-3xl" />
          <div className="flex items-start gap-3">
            <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7130d8] to-[#5420ad] text-white shadow-lg shadow-violet-200"><CalendarDays className="size-5" /></span>
            <div><h2 className="text-xl font-black text-slate-950">Publiez automatiquement</h2><p className="mt-1 text-sm leading-6 text-slate-500">Sélectionnez vos jours et vos réseaux : les textes seront publiés avec un visuel personnalisé.</p></div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {DAYS.map((day) => {
              const selected = days.includes(day.value);
              return <button key={day.value} type="button" aria-pressed={selected} onClick={() => toggleDay(day.value)} className={cn("relative min-h-20 rounded-2xl border px-2 py-3 text-sm font-black transition hover:-translate-y-0.5", selected ? "border-[#421388] bg-gradient-to-br from-[#7130d8] to-[#421388] text-white shadow-lg shadow-violet-200" : "border-violet-100 bg-[#fffaf4] text-slate-600 hover:border-violet-300 hover:bg-violet-50")}>
                {selected && <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white text-[#5c24ad]"><Check className="size-3" /></span>}
                <span className="sm:hidden">{day.short}</span><span className="hidden sm:inline">{day.label}</span>
              </button>;
            })}
          </div>

          <div className="mt-5">
            <div className={cn("relative flex min-h-24 items-center gap-4 overflow-hidden rounded-[1.5rem] border p-4 transition", facebook.connected ? "border-blue-400 bg-gradient-to-br from-[#2878ef] to-[#175acb] text-white shadow-lg shadow-blue-200" : "border-rose-200 bg-[#fff7f3] text-slate-900")}>
              {facebook.connected ? <span className="pointer-events-none absolute -right-8 -top-12 size-32 rounded-full bg-white/15" /> : null}
              <span className={cn("relative flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-md", facebook.connected ? "border-white text-[#2364d2] shadow-blue-950/15" : "border-rose-100 text-[#1877f2] shadow-rose-100")}><FacebookIcon className="size-6" /></span>
              <div className="relative min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={cn("text-xs font-black uppercase tracking-[0.14em]", facebook.connected ? "text-white/85" : "text-blue-600")}>Facebook</p>
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", facebook.connected ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700")}>{facebook.connected ? "Connecté" : "Connexion requise"}</span>
                </div>
                <p className={cn("mt-1 truncate font-black", facebook.connected ? "text-white" : "text-slate-950")}>{facebook.connected ? facebook.name ?? "Page connectée" : "Non connecté"}</p>
                <p className={cn("mt-0.5 text-xs font-semibold", facebook.connected ? "text-white/75" : "text-slate-500")}>Publication textuelle automatique à 10:00</p>
              </div>
            </div>
            <button type="button" onClick={() => toggleChannel("INSTAGRAM")} aria-pressed={channels.includes("INSTAGRAM")} className={cn("mt-3 relative flex min-h-24 w-full items-center gap-4 overflow-hidden rounded-[1.5rem] border p-4 text-left transition", channels.includes("INSTAGRAM") ? "border-fuchsia-400 bg-gradient-to-br from-[#d92d7c] to-[#7130d8] text-white shadow-lg shadow-fuchsia-200" : "border-violet-100 bg-[#fffaf4] text-slate-700") }>
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md", channels.includes("INSTAGRAM") ? "text-[#d92d7c]" : "text-slate-500")}><Instagram className="size-6" /></span>
              <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-[0.14em]">Instagram</span><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase", instagram.connected ? "bg-white/20" : "bg-rose-100 text-rose-700")}>{instagram.connected ? "Connecté" : "Non connecté"}</span></span><span className="mt-1 block truncate font-black">{instagram.name ?? "Compte Instagram"}</span><span className="mt-0.5 block text-xs font-semibold opacity-75">Carte visuelle + texte intégral en légende</span></span>
              {channels.includes("INSTAGRAM") && <Check className="size-5 shrink-0" />}
            </button>
          </div>

          {!hasSelectedConnectedChannel && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">Connectez au moins un réseau sélectionné dans les paramètres des canaux.</p>}
          {error && <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
          {notice && <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p>}
          <Button type="button" size="xl" loading={saving} disabled={eligible && (!hasSelectedConnectedChannel || channels.length === 0 || days.length === 0)} onClick={() => void save("activate")} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#7130d8] via-[#5c24ad] to-[#d92d7c] font-black shadow-lg shadow-violet-200 transition hover:brightness-105">
            {!saving && <Sparkles className="size-5" />}Activer les publications automatiques
          </Button>
          <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-500"><ScrollText className="size-4" />Carte avec votre logo et votre nom, créée sans IA ni coût de génération.</div>
        </section>
      )}

      {notice && active && !editing && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p>}

      {paywallOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setPaywallOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="hayom-premium-title" className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffaf4] p-6 text-center shadow-[0_28px_80px_rgba(33,7,99,0.35)]" onClick={(event) => event.stopPropagation()}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-[#7130d8] via-[#d92d7c] to-[#ffbd17]" />
            <button type="button" aria-label="Fermer" onClick={() => setPaywallOpen(false)} className="relative ml-auto flex size-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-violet-100 transition hover:text-[#421388]"><X className="size-5" /></button>
            <span className="relative mx-auto mt-2 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#ffca37] to-[#f59e0b] text-white shadow-lg shadow-amber-200"><Crown className="size-8" /></span>
            <h2 id="hayom-premium-title" className="mt-5 text-2xl font-black text-slate-950">Activez cette automatisation</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">La lecture du contenu est gratuite. La publication automatique est incluse avec l’abonnement EasyCom IA.</p>
            <Button asChild size="xl" className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#7130d8] to-[#d92d7c] font-black shadow-lg shadow-violet-200 hover:brightness-105"><a href="/dashboard/settings/billing">Découvrir l’abonnement</a></Button>
          </div>
        </div>
      )}
    </div>
  );
}
