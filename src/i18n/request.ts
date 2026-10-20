import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  LOCALE_SOURCE_MANUAL,
  type Locale,
} from "@/i18n/config";

const messages: Record<Locale, () => Promise<Record<string, unknown>>> = {
  fr: () => import("../../messages/fr.json").then((module) => module.default),
  he: () => import("../../messages/he.json").then((module) => module.default),
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const localeSource = cookieStore.get(LOCALE_SOURCE_COOKIE_NAME)?.value;
  let locale: Locale = isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const hasSupabaseSession = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));

  if (
    localeSource !== LOCALE_SOURCE_MANUAL &&
    hasSupabaseSession &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("locale")
          .eq("id", user.id)
          .maybeSingle();

        if (isSupportedLocale(profile?.locale)) {
          locale = profile.locale;
        }
      }
    } catch {
      // La langue publique reste disponible même si Supabase est indisponible.
    }
  }

  return {
    locale,
    messages: await messages[locale](),
  };
});
