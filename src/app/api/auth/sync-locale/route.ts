import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { syncLocaleOnLogin } from "@/lib/i18n/sync-locale-on-login";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const requestCookies = await cookies();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  try {
    await syncLocaleOnLogin({
      supabase,
      requestCookies,
      responseCookies: response.cookies,
    });
    return response;
  } catch (error) {
    console.error("[Auth] Synchronisation de langue impossible:", error);
    return NextResponse.json(
      { error: "Synchronisation de langue impossible" },
      { status: 500 },
    );
  }
}
