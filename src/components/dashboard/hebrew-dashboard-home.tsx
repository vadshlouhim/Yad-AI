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
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { cn } from "@/lib/utils";

const ACTIVE_TOOLS = [
  {
    id: "publish",
    href: "/dashboard/social-networks",
    icon: Share2,
    tone: "home-tool-publish",
  },
  {
    id: "newsletter",
    href: "/dashboard/newsletter",
    icon: FileText,
    tone: "home-tool-newsletter",
  },
  {
    id: "birthdays",
    href: "/dashboard/jewish-birthdays",
    icon: Cake,
    tone: "home-tool-automations",
  },
] as const;

const UPCOMING_TOOLS = [
  { id: "posters", icon: ImageIcon },
  { id: "times", icon: Clock3 },
  { id: "automations", icon: Settings2 },
  { id: "crm", icon: Users },
  { id: "torah", icon: BookOpen },
  { id: "email", icon: Mail },
  { id: "shop", icon: ShoppingBag },
] as const;

export function HebrewDashboardHome({
  firstName,
  basePath,
}: {
  firstName: string;
  basePath: "/dashboard" | "/demo";
}) {
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const t = useTranslations("hebrewDashboardHome");
  const resolveHref = (href: string) => href.replace("/dashboard", basePath);

  return (
    <div dir="rtl" className="min-h-full bg-[#fffaf4] px-3 pb-28 pt-2 text-slate-950 sm:px-6 md:px-8 md:pb-10 md:pt-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-violet-100 bg-white p-3 shadow-[0_8px_24px_rgba(60,20,120,.08)] sm:p-7">
          <div>
            <p className="text-sm font-black text-[#6b3eb5]">EasyCom AI</p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight sm:mt-1 sm:text-4xl">{t("welcome", { name: firstName })}</h1>
            <p className="mt-1 text-xs text-slate-600 sm:mt-2 sm:text-sm">{t("subtitle")}</p>
          </div>
          <LanguageSwitcher compact />
        </header>

        <section className="mt-3 sm:mt-6" aria-labelledby="hebrew-dashboard-tools">
          <h2 id="hebrew-dashboard-tools" className="text-lg font-black sm:text-2xl">{t("question")}</h2>
          <div className="mt-2 grid gap-4 sm:mt-4 md:grid-cols-3">
            {ACTIVE_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={resolveHref(tool.href)}
                  className={cn(
                    "group relative flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/60 p-3 text-white shadow-[0_8px_24px_rgba(60,20,120,.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(60,20,120,.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 md:min-h-64 md:p-6",
                    tool.tone,
                  )}
                >
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(255,255,255,0.26),transparent_43%)]" />
                  <span className="relative flex size-9 items-center justify-center rounded-xl border border-white/30 bg-white/15 shadow-inner md:size-14 md:rounded-2xl">
                    <Icon className="size-5 md:size-7" aria-hidden="true" />
                  </span>
                  <span className="relative mt-auto pt-2 md:pt-8">
                    <strong className="block text-lg font-black leading-tight md:text-2xl">{t(`tools.${tool.id}.title`)}</strong>
                    <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-white/90 md:mt-2 md:text-sm md:leading-6">{t(`tools.${tool.id}.description`)}</span>
                    <span className="mt-2 inline-flex min-h-8 items-center rounded-full bg-white px-3 text-[11px] font-black text-[#35106f] shadow-sm md:mt-5 md:min-h-11 md:px-4 md:text-sm">
                      {t("start")}
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
            {t("comingSoon")}
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
                    <li key={tool.id} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-slate-400">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white"><Icon className="size-5" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1 font-bold">{t(`upcoming.${tool.id}`)}</span>
                      <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-500">{t("soonBadge")}</span>
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
