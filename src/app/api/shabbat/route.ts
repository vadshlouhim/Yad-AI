import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getShabbatTimes, getJewishHolidays } from "@/lib/automation/hebcal";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { community: { select: { city: true, timezone: true } } },
    });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "shabbat";

    if (type === "holidays") {
      const holidays = await getJewishHolidays({ year: new Date().getFullYear() });
      return NextResponse.json(holidays);
    }

    const shabbatTimes = await getShabbatTimes({
      city: profile?.community?.city ?? "Paris",
      timezone: profile?.community?.timezone ?? "Europe/Paris",
    });

    return NextResponse.json(shabbatTimes);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
