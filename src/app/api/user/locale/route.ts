import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  isSupportedLocale,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  LOCALE_SOURCE_MANUAL,
  type Locale,
} from "@/i18n/config";

const localeSchema = z.object({
  locale: z.enum(["fr", "he"]),
});

function withLocaleCookie(response: NextResponse, locale: Locale, manual = false) {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  if (manual) {
    response.cookies.set(LOCALE_SOURCE_COOKIE_NAME, LOCALE_SOURCE_MANUAL, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .single();

  if (error || !isSupportedLocale(profile?.locale)) {
    return NextResponse.json({ error: "Langue du profil indisponible" }, { status: 500 });
  }

  return withLocaleCookie(NextResponse.json({ locale: profile.locale }), profile.locale);
}

export async function PATCH(request: Request) {
  const parsed = localeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Langue invalide" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { error } = await supabase.rpc("set_my_locale", {
    new_locale: parsed.data.locale,
  });

  if (error) {
    return NextResponse.json({ error: "Mise à jour échouée" }, { status: 500 });
  }

  return withLocaleCookie(
    NextResponse.json({ locale: parsed.data.locale }),
    parsed.data.locale,
    true,
  );
}
