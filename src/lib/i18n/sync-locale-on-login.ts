import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isSupportedLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_PENDING_COOKIE_NAME,
  type Locale,
} from "@/i18n/config";
import type { Database } from "@/types/database.types";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type CookieWriter = {
  set(
    name: string,
    value: string,
    options: {
      maxAge: number;
      path: string;
      sameSite: "lax";
      secure: boolean;
    },
  ): unknown;
};

export async function syncLocaleOnLogin({
  supabase,
  requestCookies,
  responseCookies,
}: {
  supabase: SupabaseClient<Database>;
  requestCookies: CookieReader;
  responseCookies: CookieWriter;
}): Promise<Locale | null> {
  const cookieLocale = requestCookies.get(LOCALE_COOKIE_NAME)?.value;
  const hasPendingChoice =
    requestCookies.get(LOCALE_PENDING_COOKIE_NAME)?.value === "1";

  if (hasPendingChoice && isSupportedLocale(cookieLocale)) {
    const { error } = await supabase.rpc("set_my_locale", {
      new_locale: cookieLocale,
    });

    if (error) {
      throw new Error(`Impossible de synchroniser la langue choisie : ${error.message}`);
    }

    setLocaleCookie(responseCookies, cookieLocale);
    responseCookies.set(LOCALE_PENDING_COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return cookieLocale;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("locale")
    .single();

  if (error || !isSupportedLocale(profile?.locale)) {
    return null;
  }

  setLocaleCookie(responseCookies, profile.locale);
  return profile.locale;
}

function setLocaleCookie(responseCookies: CookieWriter, locale: Locale) {
  responseCookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
