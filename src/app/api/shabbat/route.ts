import { resolveShabbatLocation, CityResolutionError } from "@/lib/automation/city-location";
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

    let city = "";
    let country = "France";

    if (profile?.communityId) {
      const { data: community } = await admin
        .from("Community")
        .select("city, timezone, country")
        .eq("id", profile.communityId)
        .single();
      if (community?.country) country = community.country;
      if (community?.city) city = community.city;
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "shabbat";

    if (type === "holidays") {
      const holidays = await getJewishHolidays({ year: new Date().getFullYear() });
      return NextResponse.json(holidays);
    }

    city = searchParams.get("city")?.trim() || city;
    const location = await resolveShabbatLocation(city, country);
    const shabbatTimes = await getShabbatTimes({ city: location.cityName, latitude: location.latitude, longitude: location.longitude, timezone: location.timezone, country: location.countryCode });
    if (!shabbatTimes?.entry || !shabbatTimes.exit) return NextResponse.json({ error: "Horaires indisponibles pour cette ville et cette semaine." }, { status: 503 });
    return NextResponse.json(shabbatTimes);
  } catch (error) {
    if (error instanceof CityResolutionError) return NextResponse.json({ error: error.message, candidates: error.candidates }, { status: 422 });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
