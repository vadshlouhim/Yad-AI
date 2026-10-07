"use client";

import { useState } from "react";
import Link from "next/link";
import { Cake, Flame as Candle, Check, Copy, ExternalLink, Loader2, MessageCircle, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Birthday = { id: string; firstName: string; displayName: string; phone: string | null; hebrewDate: string; hebrewDay: number; gregorianDate: string };
type Yahrzeit = { id: string; memberId: string; firstName: string; displayName: string; phone: string | null; deceasedName: string; deceasedHebrewName: string | null; relationship: string | null; hebrewDate: string; hebrewDay: number; gregorianDate: string };
type Selected = ({ kind: "birthday" } & Birthday) | ({ kind: "yahrzeit" } & Yahrzeit);
type Language = "fr" | "he" | "bilingual";

export function JewishBirthdaysClient({ birthdays, yahrzeits, currentHebrewDay, currentMonth }: { birthdays: Birthday[]; yahrzeits: Yahrzeit[]; currentHebrewDay: number; currentMonth: string }) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [language, setLanguage] = useState<Language>("fr");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate(item: Selected, nextLanguage: Language = language) {
    setSelected(item); setLanguage(nextLanguage); setLoading(true); setMessage(""); setError(""); setCopied(false);
    try {
      const requestBody = item.kind === "birthday" ? { kind: item.kind, contactId: item.id, language: nextLanguage } : { kind: item.kind, yahrzeitId: item.id, language: nextLanguage };
      const response = await fetch("/api/jewish-birthdays/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
      const data = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Message indisponible.");
      setMessage(data.message);
    } catch (generationError) { setError(generationError instanceof Error ? generationError.message : "Message indisponible."); }
    finally { setLoading(false); }
  }

  async function copyMessage() { if (message) { await navigator.clipboard.writeText(message); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } }
  function openWhatsApp() { if (!selected?.phone || !message) return; window.open(`https://wa.me/${selected.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer"); }

  function DateCard({ item }: { item: Selected }) {
    const yahrzeit = item.kind === "yahrzeit";
    const isToday = item.hebrewDay === currentHebrewDay;
    const isPast = item.hebrewDay < currentHebrewDay;
    return <article className="rounded-3xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/60 p-4 shadow-sm"><div className="flex items-start gap-3"><span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md", yahrzeit ? "bg-amber-700" : "bg-[#d92d7c]")}>{yahrzeit ? <Candle className="size-5" /> : <Cake className="size-5" />}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-black text-slate-950">{yahrzeit ? item.deceasedName : item.displayName}</h3>{isToday && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Aujourd’hui</span>}</div>{yahrzeit && <p className="truncate text-xs text-slate-500">Pour {item.displayName}{item.relationship ? ` · ${item.relationship}` : ""}</p>}<p className="mt-1 text-sm font-bold text-rose-700">{item.hebrewDate}</p><p className="text-xs text-slate-500">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(`${item.gregorianDate}T12:00:00`))}{isPast ? " · passé" : ""}</p></div></div><Button onClick={() => void generate(item)} className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 font-black text-white"><MessageCircle className="size-4" />Proposer d’offrir le Kidouch</Button></article>;
  }

  const total = birthdays.length + yahrzeits.length;
  return <div className="container mx-auto max-w-6xl space-y-6 px-4 py-5 pb-16 sm:px-6 sm:py-7">
    <section className="relative overflow-hidden rounded-[1.8rem] border border-rose-800 bg-[#9d174d] p-6 text-white shadow-[0_22px_52px_rgba(157,23,77,0.24)] sm:p-8"><div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-white/10" /><div className="relative max-w-3xl"><span className="flex size-12 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-lg"><Candle className="size-6" /></span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Anniversaires & Yahrzeit</h1><p className="mt-3 font-semibold text-rose-50">Les dates du mois de {currentMonth}, avec proposition à J‑7 et rappel interne à J‑1.</p></div></section>
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">{currentMonth}</p><h2 className="mt-1 text-xl font-black">{total} date{total > 1 ? "s" : ""} ce mois-ci</h2></div><Button asChild variant="outline" className="rounded-2xl"><Link href="/dashboard/contacts"><Users className="size-4" />Gérer dans le CRM</Link></Button></div>
      {total === 0 ? <div className="mt-6 rounded-3xl border border-dashed border-rose-200 bg-rose-50/50 p-9 text-center"><Candle className="mx-auto size-9 text-rose-300" /><p className="mt-3 font-black">Aucune date renseignée pour ce mois</p></div> : <><div className="mt-6"><h3 className="mb-3 flex items-center gap-2 font-black"><Cake className="size-5 text-rose-600" />Anniversaires ({birthdays.length})</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{birthdays.map((item) => <DateCard key={item.id} item={{ ...item, kind: "birthday" }} />)}</div></div><div className="mt-7"><h3 className="mb-3 flex items-center gap-2 font-black"><Candle className="size-5 text-amber-700" />Yahrzeit ({yahrzeits.length})</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{yahrzeits.map((item) => <DateCard key={item.id} item={{ ...item, kind: "yahrzeit" }} />)}</div></div></>}
    </section>
    {selected && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-rose-700">Kidouch ou Parnass Hayom</p><h2 className="mt-1 text-xl font-black">Message pour {selected.firstName}</h2></div><button aria-label="Fermer" onClick={() => setSelected(null)} className="flex size-10 items-center justify-center rounded-full bg-slate-100"><X className="size-5" /></button></div><div className="mt-5 grid grid-cols-3 gap-2">{([{ value: "fr", label: "Français" }, { value: "he", label: "Hébreu" }, { value: "bilingual", label: "Bilingue" }] as const).map((option) => <button key={option.value} disabled={loading} onClick={() => void generate(selected, option.value)} className={cn("rounded-xl border px-2 py-2.5 text-xs font-black", language === option.value ? "border-rose-500 bg-rose-50 text-rose-800" : "border-slate-200 text-slate-500")}>{option.label}</button>)}</div>{loading ? <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><Loader2 className="size-7 animate-spin" /><p className="mt-3 text-sm font-bold">David prépare le message…</p></div> : <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={8} dir={language === "he" ? "rtl" : "auto"} className="mt-5 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm leading-7 outline-none" />}{error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}<p className="mt-2 text-xs text-slate-500">Modifiez le texte si besoin. Aucun message n’est envoyé automatiquement.</p><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" disabled={!message || loading} onClick={() => void copyMessage()} className="h-12 rounded-2xl">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copié" : "Copier"}</Button><Button disabled={!selected.phone || !message || loading} onClick={openWhatsApp} className="h-12 rounded-2xl bg-[#16a34a] font-black hover:bg-[#15803d]"><ExternalLink className="size-4" />Ouvrir WhatsApp</Button></div>{!selected.phone && <p className="mt-2 text-center text-xs text-slate-500">Ajoutez un numéro dans le CRM pour utiliser WhatsApp.</p>}</div></div>}
  </div>;
}
