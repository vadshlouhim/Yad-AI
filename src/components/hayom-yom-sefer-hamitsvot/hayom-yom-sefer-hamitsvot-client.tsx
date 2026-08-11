"use client";

import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, Check, Crown, ExternalLink, Pause, Pencil, ScrollText, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacebookIcon } from "@/components/layout/dashboard-nav";
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
  timezone: string;
  eligible: boolean;
  facebook: { connected: boolean; name: string | null };
  todayStudy: {
    dateLabel: string;
    hayomYom: string;
    hayomYomUrl: string;
    seferHamitsvot: string;
    seferHamitsvotUrl: string;
  } | null;
  initialAutomation: { id: string; active: boolean; days: number[]; nextRunAt: string | null } | null;
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

export function HayomYomSeferHamitsvotClient({ communityName, timezone, eligible, facebook, todayStudy, initialAutomation }: Props) {
  const [days, setDays] = useState<number[]>(initialAutomation?.days ?? [1]);
  const [active, setActive] = useState(Boolean(initialAutomation?.active));
  const [editing, setEditing] = useState(!initialAutomation?.active);
  const [nextRunAt, setNextRunAt] = useState(initialAutomation?.nextRunAt ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const selectedDaysLabel = useMemo(() => dayNames(days), [days]);

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
        body: JSON.stringify({ mode, days }),
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
      <section className="relative overflow-hidden rounded-[1.8rem] border border-teal-800 bg-[#075c58] p-6 text-white shadow-[0_22px_52px_rgba(7,92,88,0.22)] sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-12 size-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-24 size-52 rounded-full bg-cyan-300/10" />
        <div className="relative max-w-3xl">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#075c58] shadow-lg"><BookOpen className="size-6" /></span>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Hayom Yom et Sefer Hamitsvot</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-teal-50 sm:text-base">Les études quotidiennes publiées automatiquement et fidèlement sur votre page Facebook.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-teal-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm"><Sparkles className="size-5" /></span>
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Les études d’aujourd’hui</p><h2 className="mt-1 text-xl font-black text-slate-950">{todayStudy?.dateLabel ?? "Contenu en cours de récupération"}</h2></div>
          </div>
          <span className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-black text-teal-700">Source Beth Loubavitch</span>
        </div>
        {todayStudy ? (
          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
            <article className="rounded-[1.5rem] border border-violet-200 bg-violet-50/70 p-5">
              <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-black text-violet-950"><BookOpen className="size-5 text-violet-700" />Hayom Yom</h3><a href={todayStudy.hayomYomUrl} target="_blank" rel="noreferrer" aria-label="Lire le Hayom Yom sur Beth Loubavitch" className="flex size-9 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm"><ExternalLink className="size-4" /></a></div>
              <p className="mt-4 whitespace-pre-line text-sm font-medium leading-7 text-slate-700">{todayStudy.hayomYom}</p>
            </article>
            <article className="rounded-[1.5rem] border border-teal-200 bg-teal-50/70 p-5">
              <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-black text-teal-950"><ScrollText className="size-5 text-teal-700" />Sefer Hamitsvot</h3><a href={todayStudy.seferHamitsvotUrl} target="_blank" rel="noreferrer" aria-label="Lire le Sefer Hamitsvot sur Beth Loubavitch" className="flex size-9 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm"><ExternalLink className="size-4" /></a></div>
              <p className="mt-4 whitespace-pre-line text-sm font-medium leading-7 text-slate-700">{todayStudy.seferHamitsvot}</p>
            </article>
          </div>
        ) : <p className="p-6 text-sm font-semibold text-slate-500">Le contenu du jour est momentanément indisponible. Il sera recherché à nouveau lors de la prochaine ouverture.</p>}
      </section>

      {active && !editing ? (
        <section className="rounded-[1.8rem] border border-emerald-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck className="size-6" /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Automatisation active</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{selectedDaysLabel} à 10:00</h2>
                <p className="mt-2 text-sm text-slate-600">Prochaine publication : <strong>{nextRunLabel(nextRunAt, timezone)}</strong></p>
                <p className="mt-1 text-sm text-slate-500">Facebook · {facebook.name ?? communityName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => eligible ? setEditing(true) : setPaywallOpen(true)} className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-blue-300 bg-[#315ecb] px-5 font-black text-white shadow-md shadow-blue-100"><Pencil className="size-5" />Modifier</button>
              <button type="button" disabled={saving} onClick={() => void save("pause")} className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-[#f59e0b] px-5 font-black text-white shadow-md shadow-amber-100 disabled:opacity-60"><Pause className="size-5" />Mettre en pause</button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-[#087c76]"><CalendarDays className="size-5" /></span>
            <div><h2 className="text-xl font-black text-slate-950">Publiez automatiquement sur Facebook</h2><p className="mt-1 text-sm leading-6 text-slate-500">Sélectionnez un ou plusieurs jours, le Hayom Yom et le Sefer Hamitsvot seront automatiquement publiés !</p></div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {DAYS.map((day) => {
              const selected = days.includes(day.value);
              return <button key={day.value} type="button" aria-pressed={selected} onClick={() => toggleDay(day.value)} className={cn("relative min-h-20 rounded-2xl border px-2 py-3 text-sm font-black transition", selected ? "border-teal-500 bg-[#087c76] text-white shadow-md shadow-teal-100" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300 hover:bg-teal-50")}>
                {selected && <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white text-[#087c76]"><Check className="size-3" /></span>}
                <span className="sm:hidden">{day.short}</span><span className="hidden sm:inline">{day.label}</span>
              </button>;
            })}
          </div>

          <div className="mt-5">
            <div className={cn("flex min-h-24 items-center gap-4 rounded-2xl border p-4", facebook.connected ? "border-blue-200 bg-blue-50" : "border-rose-200 bg-rose-50")}>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1877f2] shadow-sm"><FacebookIcon className="size-6" /></span>
              <div><p className="text-xs font-black uppercase tracking-wide text-blue-600">Facebook</p><p className="mt-1 font-black text-slate-950">{facebook.connected ? facebook.name ?? "Page connectée" : "Non connecté"}</p><p className="text-xs text-slate-500">Publication textuelle automatique à 10:00</p></div>
            </div>
          </div>

          {!facebook.connected && <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">Connectez d’abord votre page Facebook dans les paramètres des canaux.</p>}
          {error && <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
          {notice && <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p>}
          <Button type="button" size="xl" loading={saving} disabled={eligible && (!facebook.connected || days.length === 0)} onClick={() => void save("activate")} className="mt-5 w-full rounded-2xl bg-[#d92d7c] font-black shadow-lg shadow-pink-100 hover:bg-[#c5236e]">
            {!saving && <Sparkles className="size-5" />}Activer les publications automatiques
          </Button>
          <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-500"><ScrollText className="size-4" />Textes intégraux, sans reformulation et sans génération d’image.</div>
        </section>
      )}

      {notice && active && !editing && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</p>}

      {paywallOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => setPaywallOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="hayom-premium-title" className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Fermer" onClick={() => setPaywallOpen(false)} className="ml-auto flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X className="size-5" /></button>
            <span className="mx-auto mt-2 flex size-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700"><Crown className="size-8" /></span>
            <h2 id="hayom-premium-title" className="mt-5 text-2xl font-black text-slate-950">Activez cette automatisation</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">La lecture du contenu est gratuite. La publication automatique est incluse avec l’offre Pro à 29,99 € et l’offre Business.</p>
            <Button asChild size="xl" className="mt-6 w-full rounded-2xl bg-[#d92d7c] font-black hover:bg-[#c5236e]"><a href="/dashboard/settings/billing">Découvrir l’abonnement</a></Button>
          </div>
        </div>
      )}
    </div>
  );
}
