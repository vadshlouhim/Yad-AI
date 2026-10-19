"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

export function useDashboardCopy() {
  const translations = useTranslations("dashboard");
  const copy = translations.raw("copy") as Record<string, string>;

  return useCallback((value: string) => copy[value.replaceAll(".", "__dot__")] ?? value, [copy]);
}
