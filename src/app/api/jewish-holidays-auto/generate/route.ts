import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBillingGate, paywallResponse } from "@/lib/billing";
import { createReligiousPoster } from "@/lib/religious/poster-overlay";
import { parseOutputLocale, outputIntlLocale } from "@/lib/ai/output-locale";
import { getHolidayTimes } from "@/lib/automation/hebcal";
import { RELIGIOUS_COPY } from "@/lib/religious/locale";
import { trustedStoredCommunityLogo } from "@/lib/templates/edit-source";

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const admin = createAdminClient();
  const gate = await getBillingGate(admin, user.id);
  if (!gate.isPaid) return { error: paywallResponse("holiday_generation", "La génération d’affiches de fêtes est réservée au mode payant.") };
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return { error: NextResponse.json({ error: "Communauté introuvable" }, { status: 403 }) };
  const { data: community } = await admin.from("Community").select("id, name, city, country, timezone, logoUrl").eq("id", profile.communityId).single();
  if (!community) return { error: NextResponse.json({ error: "Structure introuvable" }, { status: 404 }) };
  return { admin, communityId: profile.communityId, community, userId: user.id };
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const selectedTemplateId = typeof body.selectedTemplateId === "string" ? body.selectedTemplateId : "";
    const outputLocale = parseOutputLocale(body.outputLocale, "fr");
    const holidayName = typeof body.holidayName === "string" && body.holidayName.trim() ? body.holidayName.trim().slice(0, 150) : outputLocale === "he" ? "חג שמח" : "Bonne fête";
    const holidayDate = typeof body.holidayDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.holidayDate) ? body.holidayDate : null;
    const timesDate = typeof body.timesDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.timesDate) ? body.timesDate : holidayDate;
    const hebrewDate = typeof body.hebrewDate === "string" ? body.hebrewDate.trim().slice(0, 100) : undefined;
    const structureName = typeof body.structureName === "string" && body.structureName.trim() ? body.structureName.trim().slice(0, 160) : auth.community.name;
    const city = typeof body.city === "string" && body.city.trim() ? body.city.trim().slice(0, 120) : auth.community.city ?? undefined;
    if (!selectedTemplateId || !holidayDate) return NextResponse.json({ error: "Sélectionnez un modèle et une fête." }, { status: 400 });

    const { data: template } = await auth.admin.from("Template").select("*").eq("id", selectedTemplateId).eq("isActive", true).contains("tags", ["usage:holiday-times"]).or(`isGlobal.eq.true,communityId.eq.${auth.communityId}`).maybeSingle();
    if (!template || template.tags?.includes("legacy")) return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
    const times = await getHolidayTimes({ city, country: auth.community.country ?? undefined, timezone: auth.community.timezone ?? undefined, date: timesDate ?? holidayDate, outputLocale });
    const poster = await createReligiousPoster({
      admin: auth.admin,
      template,
      communityId: auth.communityId,
      userId: auth.userId,
      locale: outputLocale,
      logoUrl: trustedStoredCommunityLogo(typeof body.logoUrl === "string" ? body.logoUrl : auth.community.logoUrl) ?? undefined,
      content: {
        communityName: structureName,
        title: holidayName,
        subtitle: hebrewDate,
        gregorianDate: new Date(`${holidayDate}T12:00:00Z`).toLocaleDateString(outputIntlLocale(outputLocale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
        location: city,
        entryLabel: RELIGIOUS_COPY[outputLocale].holidayEve,
        entryTime: times?.entry,
        exitLabel: RELIGIOUS_COPY[outputLocale].holidayExit,
        exitTime: times?.exit,
      },
    });
    return NextResponse.json({ imageUrl: poster.imageUrl, promptUsed: "Texte superposé avec les polices embarquées du projet." });
  } catch (error) {
    console.error("[Jewish Holidays Manual Generate]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Génération impossible" }, { status: 500 });
  }
}
