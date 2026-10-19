import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHolidayTimes } from "@/lib/automation/hebcal";
import { parseOutputLocale } from "@/lib/ai/output-locale";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Date invalide" }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
  const { data: community } = await admin.from("Community").select("city, country, timezone").eq("id", profile.communityId).single();
  if (!community) return NextResponse.json({ error: "Communauté introuvable" }, { status: 404 });

  const times = await getHolidayTimes({
    city: url.searchParams.get("city")?.trim() || community.city || undefined,
    country: community.country ?? undefined,
    timezone: community.timezone ?? undefined,
    date,
    outputLocale: parseOutputLocale(url.searchParams.get("outputLocale"), "fr"),
  });
  if (!times) return NextResponse.json({ error: "Horaires indisponibles" }, { status: 404 });
  return NextResponse.json(times);
}
