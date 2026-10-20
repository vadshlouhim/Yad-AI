"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  isSupportedLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  LOCALE_SOURCE_MANUAL,
  LOCALE_PENDING_COOKIE_MAX_AGE,
  LOCALE_PENDING_COOKIE_NAME,
  type Locale,
} from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const currentLocale = useLocale();
  const router = useRouter();
  const t = useTranslations("languageSwitcher");
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);

  async function selectLocale(locale: Locale) {
    if (locale === currentLocale || pendingLocale) return;

    setPendingLocale(locale);
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `${LOCALE_SOURCE_COOKIE_NAME}=${LOCALE_SOURCE_MANUAL}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;

    try {
      const response = await fetch("/api/user/locale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });

      if (response.status === 401) {
        document.cookie = `${LOCALE_PENDING_COOKIE_NAME}=1; Path=/; Max-Age=${LOCALE_PENDING_COOKIE_MAX_AGE}; SameSite=Lax`;
      }

      if (!response.ok && response.status !== 401) {
        console.error("La préférence de langue n’a pas pu être enregistrée dans le profil.");
      }
    } catch {
      // Le cookie conserve le choix pour les visiteurs et en cas de panne réseau.
    } finally {
      setPendingLocale(null);
      router.refresh();
    }
  }

  const locale = isSupportedLocale(currentLocale) ? currentLocale : "fr";
  const options: Array<{ locale: Locale; shortLabel: string; label: string }> = [
    { locale: "fr", shortLabel: "FR", label: t("selectFrench") },
    { locale: "he", shortLabel: "עב", label: t("selectHebrew") },
  ];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-amber-300/80 bg-white p-1 shadow-sm",
        compact ? "gap-0.5" : "gap-1",
        className,
      )}
      dir="ltr"
      role="group"
      aria-label={t("label")}
    >
      {options.map((option) => {
        const active = locale === option.locale;
        const pending = pendingLocale === option.locale;

        return (
          <button
            key={option.locale}
            type="button"
            onClick={() => void selectLocale(option.locale)}
            aria-label={option.label}
            aria-pressed={active}
            disabled={pendingLocale !== null}
            className={cn(
              "inline-flex items-center justify-center rounded-full font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#421388] focus-visible:ring-offset-2 disabled:cursor-wait",
              compact ? "h-7 min-w-8 px-2 text-[10px]" : "h-8 min-w-9 px-2.5 text-xs",
              active
                ? "bg-[#421388] text-white shadow-sm ring-2 ring-amber-300"
                : "text-[#421388] hover:bg-violet-50",
              pending && "opacity-70",
            )}
          >
            {option.shortLabel}
          </button>
        );
      })}

      <span
        className="group relative inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#421388] focus-visible:ring-offset-2"
        tabIndex={0}
        title={t("englishUnavailable")}
      >
        <button
          type="button"
          disabled
          aria-label={t("englishUnavailable")}
          className={cn(
            "inline-flex cursor-not-allowed items-center justify-center rounded-full font-black text-slate-300",
            compact ? "h-7 min-w-8 px-2 text-[10px]" : "h-8 min-w-9 px-2.5 text-xs",
          )}
        >
          EN
        </button>
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-[120] mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block group-focus:block"
        >
          {t("englishUnavailable")}
        </span>
      </span>
    </div>
  );
}
