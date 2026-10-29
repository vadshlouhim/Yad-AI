"use client";

import Link from "next/link";
import {
  BookOpen,
  Cake,
  ChevronDown,
  Clock3,
  FileText,
  Image as ImageIcon,
  Mail,
  Settings2,
  Share2,
  ShoppingBag,
  Users,
} from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { cn } from "@/lib/utils";

const ACTIVE_TOOLS = [
  {
    title: "פרסום בכל הערוצים",
    description: "כותבים פעם אחת ומפרסמים בפייסבוק, באינסטגרם ובוואטסאפ.",
    href: "/dashboard/social-networks",
    icon: Share2,
    tone: "home-tool-publish",
  },
  {
    title: "עלון שבת",
    description: "עלון דו־צדדי מקצועי, מוכן להדפסה תוך כמה דקות.",
    href: "/dashboard/newsletter",
    icon: FileText,
    tone: "home-tool-newsletter",
  },
  {
    title: "יום הולדת עברי ויארצייט",
    description: "תזכורות והודעות אוטומטיות לימי הולדת עבריים וליארצייט של הקהילה.",
    href: "/dashboard/jewish-birthdays",
    icon: Cake,
    tone: "home-tool-automations",
  },
] as const;

const UPCOMING_TOOLS = [
  { title: "מודעות ופליירים", icon: ImageIcon },
  { title: "זמני שבת וחגים", icon: Clock3 },
  { title: "אוטומציות", icon: Settings2 },
  { title: "CRM 2.0", icon: Users },
  { title: "שיעורי תורה", icon: BookOpen },
  { title: "אימייל וביקורות Google", icon: Mail },
  { title: "חנות ומוצרים", icon: ShoppingBag },
] as const;

export function HebrewDashboardHome({
  firstName,
  basePath,
}: {
  firstName: string;
  basePath: "/dashboard" | "/demo";
}) {
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const resolveHref = (href: string) => href.replace("/dashboard", basePath);

  return (
    <div dir="rtl" className="min-h-full bg-[#fffaf4] px-3 pb-28 pt-4 text-slate-950 sm:px-6 md:px-8 md:pb-10 md:pt-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-sm font-black text-[#6b3eb5]">EasyCom AI</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">ברוכים הבאים, {firstName}</h1>
            <p className="mt-2 text-sm text-slate-500">שלושת הכלים שלכם, במקום אחד.</p>
          </div>
          <LanguageSwitcher compact />
        </header>

        <section className="mt-6" aria-labelledby="hebrew-dashboard-tools">
          <h2 id="hebrew-dashboard-tools" className="text-xl font-black sm:text-2xl">מה תרצו לעשות?</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ACTIVE_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={resolveHref(tool.href)}
                  className={cn(
                    "group relative flex min-h-64 flex-col overflow-hidden rounded-[2rem] border border-white/60 p-6 text-white shadow-[0_18px_40px_-20px_rgba(31,18,70,0.55)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_48px_-18px_rgba(31,18,70,0.65)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300",
                    tool.tone,
                  )}
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.26),transparent_43%)]" />
                  <span className="relative flex size-14 items-center justify-center rounded-2xl border border-white/30 bg-white/15 shadow-inner">
                    <Icon className="size-7" aria-hidden="true" />
                  </span>
                  <span className="relative mt-auto pt-8">
                    <strong className="block text-2xl font-black leading-tight">{tool.title}</strong>
                    <span className="mt-2 block text-sm leading-6 text-white/85">{tool.description}</span>
                    <span className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-black text-[#35106f] shadow-sm">
                      מתחילים עכשיו
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setUpcomingOpen((open) => !open)}
            aria-expanded={upcomingOpen}
            aria-controls="hebrew-upcoming-tools"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-[#421388] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
          >
            <ChevronDown className={cn("size-4 transition-transform duration-300", upcomingOpen && "rotate-180")} aria-hidden="true" />
            פונקציות בקרוב
          </button>
          <div
            id="hebrew-upcoming-tools"
            className={cn(
              "grid transition-all duration-300 ease-out",
              upcomingOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <ul className="grid gap-3 text-start sm:grid-cols-2 lg:grid-cols-3">
                {UPCOMING_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li key={tool.title} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-400">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white"><Icon className="size-5" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1 font-bold">{tool.title}</span>
                      <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-500">בקרוב</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
