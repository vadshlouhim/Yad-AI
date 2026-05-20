import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShabbatTimes, getJewishHolidays } from "@/lib/automation/hebcal";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();

    let city = "Paris";
    let timezone = "Europe/Paris";

    if (profile?.communityId) {
      const { data: community } = await admin
        .from("Community")
        .select("city, timezone")
        .eq("id", profile.communityId)
        .single();
      if (community?.city) city = community.city;
      if (community?.timezone) timezone = community.timezone;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "shabbat";

    if (type === "holidays") {
      const holidays = await getJewishHolidays({ year: new Date().getFullYear() });
      return NextResponse.json(holidays);
    }

    const shabbatTimes = await getShabbatTimes({ city, timezone });
    return NextResponse.json(shabbatTimes);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
