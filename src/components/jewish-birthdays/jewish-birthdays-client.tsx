"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cake, Check, Copy, ExternalLink, Loader2, MessageCircle, Sparkles, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BirthdayContact = {
  id: string;
  firstName: string;
  displayName: string;
  phone: string | null;
  hebrewDate: string;
  hebrewDay: number;
  gregorianDate: string;
};

type Language = "fr" | "he" | "bilingual";

export function JewishBirthdaysClient({ birthdays, currentHebrewDay, currentMonth, databaseReady }: {
  birthdays: BirthdayContact[];
  currentHebrewDay: number;
  currentMonth: string;
  databaseReady: boolean;
}) {
  const [selected, setSelected] = useState<BirthdayContact | null>(null);
  const [language, setLanguage] = useState<Language>("fr");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate(contact: BirthdayContact, nextLanguage: Language = language) {
    setSelected(contact);
    setLanguage(nextLanguage);
    setLoading(true);
    setMessage("");
    setError("");
    setCopied(false);
    try {
      const response = await fetch("/api/jewish-birthdays/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id, language: nextLanguage }),
      });
      const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Message indisponible.");
      setMessage(data.message);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Message indisponible.");
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  function openWhatsApp() {
    if (!selected?.phone || !message) return;
    const phone = selected.phone.replace(/[^\d]/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-5 pb-16 sm:px-6 sm:py-7">
      <section className="relative overflow-hidden rounded-[1.8rem] border border-rose-800 bg-[#9d174d] p-6 text-white shadow-[0_22px_52px_rgba(157,23,77,0.24)] sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-28 size-64 rounded-full bg-amber-300/10" />
        <div className="relative max-w-3xl"><span className="flex size-12 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-lg"><Cake className="size-6" /></span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Anniversaires juifs</h1><p className="mt-3 text-sm font-semibold leading-6 text-rose-50 sm:text-base">Les anniversaires du mois de {currentMonth}, selon le calendrier hébraïque.</p></div>
      </section>

      {!databaseReady && <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm font-bold text-amber-900">La mise à jour Supabase des anniversaires hébraïques doit être appliquée avant d’utiliser cette page.</section>}

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">{currentMonth}</p><h2 className="mt-1 text-xl font-black text-slate-950">{birthdays.length} anniversaire{birthdays.length > 1 ? "s" : ""} ce mois-ci</h2></div><Button asChild variant="outline" className="rounded-2xl border-rose-200 text-rose-800 hover:bg-rose-50"><Link href="/dashboard/contacts"><Users className="size-4" />Gérer les dates dans le CRM</Link></Button></div>

        {birthdays.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-rose-200 bg-rose-50/50 p-9 text-center"><Cake className="mx-auto size-9 text-rose-300" /><p className="mt-3 font-black text-slate-900">Aucun anniversaire renseigné pour ce mois</p><p className="mt-1 text-sm text-slate-500">Ajoutez les dates hébraïques directement dans vos contacts.</p><Button asChild className="mt-5 rounded-2xl bg-[#d92d7c] hover:bg-[#c5236e]"><Link href="/dashboard/contacts">Ouvrir le CRM</Link></Button></div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {birthdays.map((contact) => {
              const isToday = contact.hebrewDay === currentHebrewDay;
              const isPast = contact.hebrewDay < currentHebrewDay;
              return <button key={contact.id} type="button" onClick={() => void generate(contact)} className="group rounded-3xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/60 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"><div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#d92d7c] text-lg font-black text-white shadow-md shadow-rose-100">{contact.firstName.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-black text-slate-950">{contact.displayName}</h3>{isToday && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Aujourd’hui</span>}</div><p className="mt-1 text-sm font-bold text-rose-700">{contact.hebrewDate}</p><p className="mt-0.5 text-xs text-slate-500">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(`${contact.gregorianDate}T12:00:00`))}{isPast ? " · passé" : ""}</p></div><Sparkles className="size-5 text-rose-400 transition group-hover:rotate-12" /></div><span className="mt-4 flex items-center gap-2 text-xs font-black text-[#d92d7c]"><MessageCircle className="size-4" />Créer un message de Mazal Tov</span></button>;
            })}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="birthday-message-title" className="w-full max-w-lg rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-rose-700">Mazal Tov</p><h2 id="birthday-message-title" className="mt-1 text-xl font-black text-slate-950">Message pour {selected.firstName}</h2></div><button type="button" aria-label="Fermer" onClick={() => setSelected(null)} className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X className="size-5" /></button></div>
            <div className="mt-5 grid grid-cols-3 gap-2">{([{ value: "fr", label: "Français" }, { value: "he", label: "Hébreu" }, { value: "bilingual", label: "Bilingue" }] as const).map((option) => <button key={option.value} type="button" disabled={loading} onClick={() => void generate(selected, option.value)} className={cn("rounded-xl border px-2 py-2.5 text-xs font-black", language === option.value ? "border-rose-500 bg-rose-50 text-rose-800" : "border-slate-200 text-slate-500")}>{option.label}</button>)}</div>
            {loading ? <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><Loader2 className="size-7 animate-spin" /><p className="mt-3 text-sm font-bold">David prépare le message…</p></div> : <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} dir={language === "he" ? "rtl" : "auto"} className="mt-5 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm leading-7 text-slate-800 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100" />}
            {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={!message || loading} onClick={() => void copyMessage()} className="h-12 rounded-2xl border-rose-200 text-rose-800 hover:bg-rose-50">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copié" : "Copier"}</Button><Button type="button" disabled={!selected.phone || !message || loading} onClick={openWhatsApp} className="h-12 rounded-2xl bg-[#16a34a] font-black hover:bg-[#15803d]"><ExternalLink className="size-4" />WhatsApp</Button></div>
            {!selected.phone && <p className="mt-2 text-center text-xs text-slate-500">Ajoutez un numéro dans le CRM pour utiliser WhatsApp.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
