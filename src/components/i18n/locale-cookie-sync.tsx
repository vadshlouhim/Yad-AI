"use client";

import { useEffect } from "react";
import {
  isSupportedLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
} from "@/i18n/config";

export function LocaleCookieSync({ locale }: { locale: string }) {
  useEffect(() => {
    if (!isSupportedLocale(locale)) return;

    const currentLocale = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${LOCALE_COOKIE_NAME}=`))
      ?.split("=")[1];

    if (currentLocale !== locale) {
      document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
    }
  }, [locale]);

  return null;
}
