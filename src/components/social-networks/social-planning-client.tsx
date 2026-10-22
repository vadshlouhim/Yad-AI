"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CalendarClock, Copy, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { FacebookIcon as Facebook, InstagramIcon as Instagram } from "@/components/layout/dashboard-nav";
import { cn } from "@/lib/utils";

type Publication = { id: string; draftId: string | null; channelType: "FACEBOOK" | "INSTAGRAM"; content: string; scheduledAt: string | null; status: string; createdAt: string; updatedAt: string; mediaUrls: string[] | null };
type IdeaContext = { parasha: string | null; holiday: string | null; events: string[] };
type Filter = "upcoming" | "published" | "failed";

export function SocialPlanningClient() {
  const t = useTranslations("socialPlanning");
  const locale = useLocale();
  const rtl = locale === "he";
  const [publications, setPublications] = useState<Publication[]>([]);
  const [ideas, setIdeas] = useState<IdeaContext>({ parasha: null, holiday: null, events: [] });
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/social-networks", { cache: "no-store" }); const data = await response.json() as { publications?: Publication[]; ideas?: IdeaContext }; setPublications(data.publications ?? []); setIdeas(data.ideas ?? { parasha: null, holiday: null, events: [] }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const grouped = useMemo(() => {
    const accepted = publications.filter((item) => filter === "upcoming" ? item.status === "SCHEDULED" : filter === "published" ? item.status === "PUBLISHED" : item.status === "FAILED");
    const map = new Map<string, Publication[]>();
    for (const item of accepted) { const key = item.draftId ?? item.id; map.set(key, [...(map.get(key) ?? []), item]); }
    return [...map.values()].sort((a, b) => new Date(a[0].scheduledAt ?? a[0].createdAt).getTime() - new Date(b[0].scheduledAt ?? b[0].createdAt).getTime());
  }, [filter, publications]);

  const ideaPills = [
    ...(ideas.parasha ? [t("ideas.parasha", { name: ideas.parasha })] : []),
    ...(ideas.holiday ? [t("ideas.holiday", { name: ideas.holiday })] : []),
    ...ideas.events.slice(0, 1).map((name) => t("ideas.event", { name })),
    t("ideas.volunteers"), t("ideas.kiddush"),
  ].slice(0, 4);

  const remove = async (items: Publication[]) => {
    if (!window.confirm(t("actions.deleteConfirm"))) return;
    await fetch(`/api/social-networks?ids=${items.map((item) => item.id).join(",")}`, { method: "DELETE" });
    await load();
  };

  return <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f4fb] px-3 py-4 text-slate-900 sm:px-5 sm:py-6"><main className="mx-auto w-full max-w-[720px] space-y-4">
    <header className="flex items-center justify-between gap-3"><Link href="/dashboard/social-networks" aria-label={t("back")} className="flex size-11 items-center justify-center rounded-full bg-white ring-1 ring-[#eee9f7]"><ArrowLeft className={cn("size-5", rtl && "rotate-180")} /></Link><div className="text-center"><h1 className="text-xl font-black">{t("title")}</h1><p className="text-xs text-slate-500">{t("subtitle")}</p></div><span className="size-11" /></header>
    <section className="rounded-[20px] border border-[#eee9f7] bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><Sparkles className="size-5 text-amber-500" /><h2 className="text-sm font-black">{t("ideas.title")}</h2></div><div className="flex flex-wrap gap-2">{ideaPills.map((idea) => <Link key={idea} href={`/dashboard/social-networks?idea=${encodeURIComponent(idea)}`} className="inline-flex min-h-11 items-center rounded-full bg-violet-50 px-4 text-sm font-bold text-violet-800 ring-1 ring-violet-100">{idea}</Link>)}</div></section>
    <div className="grid grid-cols-3 rounded-xl bg-white p-1 ring-1 ring-[#eee9f7]">{(["upcoming", "published", "failed"] as Filter[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={cn("min-h-11 rounded-lg text-sm font-bold", filter === value ? "bg-violet-600 text-white" : "text-slate-500")}>{t(`tabs.${value}`)}</button>)}</div>
    <div className="rounded-[20px] border border-sky-200 bg-sky-50 p-4 text-sm font-black text-sky-950">🕯️ {t("shabbat")}</div>
    {loading ? <div className="flex justify-center py-14"><Loader2 className="size-6 animate-spin text-violet-600" /></div> : grouped.length === 0 ? <div className="rounded-[20px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-400">{t("empty")}</div> : <div className="space-y-3">{grouped.map((items) => { const first = items[0]; const date = new Date(first.scheduledAt ?? first.createdAt); return <article key={first.draftId ?? first.id} className="rounded-[20px] border border-[#eee9f7] bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-violet-50 text-violet-800"><span className="text-[10px] font-black uppercase">{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date)}</span><span className="text-base font-black">{date.getDate()}</span></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-black">{first.content}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500"><CalendarClock className="size-3.5" /><span>{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date)}</span>{items.some((item) => item.channelType === "FACEBOOK") ? <Facebook className="size-3.5" /> : null}{items.some((item) => item.channelType === "INSTAGRAM") ? <Instagram className="size-3.5" /> : null}<span className={cn("rounded-full px-2 py-1 font-bold", first.status === "FAILED" ? "bg-red-50 text-red-700" : first.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{t(`status.${first.status}`)}</span></div></div></div>{filter === "upcoming" ? <div className="mt-4 grid grid-cols-3 gap-2"><Link href={`/dashboard/social-networks?idea=${encodeURIComponent(first.content)}`} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-100 text-xs font-bold"><Pencil className="size-3.5" />{t("actions.edit")}</Link><Link href={`/dashboard/social-networks?idea=${encodeURIComponent(first.content)}`} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-100 text-xs font-bold"><Copy className="size-3.5" />{t("actions.duplicate")}</Link><button type="button" onClick={() => void remove(items)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-red-50 text-xs font-bold text-red-700"><Trash2 className="size-3.5" />{t("actions.delete")}</button></div> : null}</article>; })}</div>}
  </main></div>;
}
