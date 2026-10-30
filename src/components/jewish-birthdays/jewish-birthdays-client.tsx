"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Cake, Flame as Candle, Check, Copy, ExternalLink, Loader2, MessageCircle, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Birthday = { id: string; firstName: string; displayName: string; phone: string | null; hebrewDate: string; hebrewDay: number; gregorianDate: string };
type Yahrzeit = { id: string; memberId: string; firstName: string; displayName: string; phone: string | null; deceasedName: string; deceasedHebrewName: string | null; relationship: string | null; hebrewDate: string; hebrewDay: number; gregorianDate: string };
type Selected = ({ kind: "birthday" } & Birthday) | ({ kind: "yahrzeit" } & Yahrzeit);
type Language = "fr" | "he" | "bilingual";

export function JewishBirthdaysClient({ birthdays, yahrzeits, currentHebrewDay, currentMonth }: { birthdays: Birthday[]; yahrzeits: Yahrzeit[]; currentHebrewDay: number; currentMonth: string }) {
  const locale = useLocale();
  const t = useTranslations("jewishBirthdays");
  const rtl = locale === "he";
  const [selected, setSelected] = useState<Selected | null>(null);
  const [language, setLanguage] = useState<Language>(rtl ? "he" : "fr");
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
      if (!response.ok || !data.message) throw new Error(rtl ? t("dialog.unavailable") : data.error ?? t("dialog.unavailable"));
      setMessage(data.message);
    } catch (generationError) { setError(generationError instanceof Error ? generationError.message : t("dialog.unavailable")); }
    finally { setLoading(false); }
  }

  async function copyMessage() { if (message) { await navigator.clipboard.writeText(message); setCopied(true); window.setTimeout(() => setCopied(false), 2500); } }
  function openWhatsApp() { if (!selected?.phone || !message) return; window.open(`https://wa.me/${selected.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer"); }
  const civilDate = (value: string) => new Intl.DateTimeFormat(rtl ? "he-IL" : "fr-FR", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));

  function DateCard({ item }: { item: Selected }) {
    const yahrzeit = item.kind === "yahrzeit";
    const isToday = item.hebrewDay === currentHebrewDay;
    const isPast = item.hebrewDay < currentHebrewDay;
    return <article className="rounded-3xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/60 p-4 shadow-[0_8px_24px_rgba(60,20,120,.08)]">
      <div className="flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl text-white", yahrzeit ? "bg-amber-700" : "bg-[#d92d7c]")}>{yahrzeit ? <Candle className="size-5" /> : <Cake className="size-5" />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h3 className="truncate font-black text-slate-950">{yahrzeit ? item.deceasedName : item.displayName}</h3>{isToday ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">{t("card.today")}</span> : null}</div>
          {yahrzeit ? <p className="truncate text-xs text-slate-600">{t("card.for", { name: item.displayName })}{!rtl && item.relationship ? ` · ${item.relationship}` : ""}</p> : null}
          <p className="mt-1 text-sm font-bold text-rose-700">{item.hebrewDate}</p>
          <p className="text-xs text-slate-600">{civilDate(item.gregorianDate)}{isPast ? ` · ${t("card.past")}` : ""}</p>
        </div>
      </div>
      <Button onClick={() => void generate(item)} className="mt-4 w-full rounded-full bg-gradient-to-r from-amber-600 to-rose-600 font-black text-white"><MessageCircle className="size-4" />{t("card.offerKiddush")}</Button>
    </article>;
  }

  const total = birthdays.length + yahrzeits.length;
  return <div dir={rtl ? "rtl" : "ltr"} className="container mx-auto max-w-6xl space-y-6 px-4 py-5 pb-16 sm:px-6 sm:py-7">
    <section className="relative overflow-hidden rounded-3xl border border-rose-800 bg-[#9d174d] p-6 text-white shadow-[0_8px_24px_rgba(60,20,120,.08)] sm:p-8"><div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-white/10" /><div className="relative max-w-3xl"><span className="flex size-12 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-lg"><Candle className="size-6" /></span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1><p className="mt-3 font-medium text-rose-50">{t("subtitle", { month: currentMonth })}</p></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(60,20,120,.08)] sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-rose-700">{currentMonth}</p><h2 className="mt-1 text-xl font-black">{t("summary.count", { count: total })}</h2></div><Button asChild variant="outline" className="rounded-full"><Link href="/dashboard/contacts"><Users className="size-4" />{t("summary.manageCrm")}</Link></Button></div>
      <div className="mt-6"><h3 className="mb-3 flex items-center gap-2 font-black"><Cake className="size-5 text-rose-600" />{t("sections.birthdays", { count: birthdays.length })}</h3>{birthdays.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{birthdays.map((item) => <DateCard key={item.id} item={{ ...item, kind: "birthday" }} />)}</div> : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm font-medium text-slate-500">{t("sections.noBirthdays")}</p>}</div>
      <div className="mt-7"><h3 className="mb-3 flex items-center gap-2 font-black"><Candle className="size-5 text-amber-700" />{t("sections.yahrzeits", { count: yahrzeits.length })}</h3>{yahrzeits.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{yahrzeits.map((item) => <DateCard key={item.id} item={{ ...item, kind: "yahrzeit" }} />)}</div> : <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm font-medium text-slate-500">{t("sections.noYahrzeits")}</p>}</div>
    </section>
    {selected ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelected(null)}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-rose-700">{t("dialog.eyebrow")}</p><h2 className="mt-1 text-xl font-black">{t("dialog.title", { name: selected.firstName })}</h2></div><button aria-label={t("dialog.close")} onClick={() => setSelected(null)} className="flex size-10 items-center justify-center rounded-full bg-slate-100"><X className="size-5" /></button></div><div className="mt-5 grid grid-cols-3 gap-2">{(["fr", "he", "bilingual"] as const).map((value) => <button key={value} disabled={loading} onClick={() => void generate(selected, value)} className={cn("rounded-2xl border px-2 py-2.5 text-xs font-black", language === value ? "border-rose-500 bg-rose-50 text-rose-800" : "border-slate-200 text-slate-600")}>{t(`dialog.languages.${value}`)}</button>)}</div>{loading ? <div className="mt-5 flex min-h-40 flex-col items-center justify-center rounded-2xl bg-rose-50 text-rose-700"><Loader2 className="size-7 animate-spin" /><p className="mt-3 text-sm font-bold">{t("dialog.loading")}</p></div> : <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={8} dir={language === "he" ? "rtl" : "auto"} className="mt-5 w-full rounded-2xl border border-rose-200 bg-rose-50/40 px-4 py-3 text-sm leading-7 outline-none" />}{error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}<p className="mt-2 text-xs text-slate-600">{t("dialog.dryRun")}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" disabled={!message || loading} onClick={() => void copyMessage()} className="h-12 rounded-full">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{t(copied ? "dialog.copied" : "dialog.copy")}</Button><Button disabled={!selected.phone || !message || loading} onClick={openWhatsApp} className="h-12 rounded-full bg-[#16a34a] font-black hover:bg-[#15803d]"><ExternalLink className="size-4" />{t("dialog.openWhatsApp")}</Button></div>{!selected.phone ? <p className="mt-2 text-center text-xs text-slate-500">{t("dialog.missingPhone")}</p> : null}</div></div> : null}
  </div>;
}
