export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { getUpcomingShabbatTimes } from "@/lib/automation/hebcal";
import { generateContent } from "@/lib/ai/engine";
import { getBirthdayOccurrence, getCurrentHebrewDate, validateHebrewBirthday } from "@/lib/contacts/hebrew-birthday";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertPaidFeature } from "@/lib/billing";

type ModuleKey = "ravWord" | "photos" | "parness" | "birthdays" | "kiddush" | "events" | "restaurantAd" | "shabbat";

type GenerateBody = {
  mode?: "full" | "rav";
  modules?: Partial<Record<ModuleKey, boolean>>;
  ravTheme?: string;
  parnessText?: string;
  kiddushText?: string;
  restaurantText?: string;
  photoCount?: number;
  tone?: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function safeText(value: unknown, max = 600) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function extractJson(raw: string) {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as Partial<{
      title: string;
      intro: string;
      ravWord: string;
      shabbatNote: string;
      eventIntro: string;
      restaurantAd: string;
      proofreadNote: string;
    }>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const admin = createAdminClient();
    const paidAccess = await assertPaidFeature(
      admin,
      user.id,
      "newsletter_generation",
      "Générez votre newsletter Chabbat avec EasyCom IA : premier mois à 9,99 € TTC, puis 19,99 € TTC/mois."
    );
    if (!paidAccess.ok) return paidAccess.response;
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communaute introuvable" }, { status: 403 });

    const body = await request.json().catch(() => ({})) as GenerateBody;
    const modules = body.modules ?? {};
    const now = new Date();
    const [{ data: community }, { data: events }, { data: contacts }] = await Promise.all([
      admin
        .from("Community")
        .select("name, city, timezone, tone, signature, editorialRules")
        .eq("id", profile.communityId)
        .single(),
      admin
        .from("Event")
        .select("id, title, description, startDate, endDate, location, category, status")
        .eq("communityId", profile.communityId)
        .neq("status", "ARCHIVED")
        .gte("startDate", now.toISOString())
        .lte("startDate", addDays(now, 45).toISOString())
        .order("startDate", { ascending: true })
        .limit(8),
      admin
        .from("CommunityMember")
        .select("id, firstName, displayName, hebrewBirthDay, hebrewBirthMonth, hebrewBirthYear")
        .eq("communityId", profile.communityId)
        .not("hebrewBirthDay", "is", null)
        .limit(1000),
    ]);

    const timezone = community?.timezone && community.timezone !== "UTC" ? community.timezone : "Europe/Paris";
    const city = community?.city ?? "Paris";
    const shabbat = (await getUpcomingShabbatTimes({ city, timezone, count: 1 }))[0] ?? null;
    const currentHebrewYear = getCurrentHebrewDate(timezone, now).getFullYear();
    const birthdayWindowStart = startOfDay(now);
    const birthdayWindowEnd = startOfDay(addDays(now, 7));
    const birthdays = (contacts ?? [])
      .flatMap((contact) => {
        const birthday = validateHebrewBirthday(contact);
        if (!birthday) return [];
        return [currentHebrewYear, currentHebrewYear + 1].flatMap((year) => {
          const occurrence = getBirthdayOccurrence(birthday, year);
          if (!occurrence) return [];
          const gregorian = new Date(`${occurrence.gregorianDate}T12:00:00`);
          if (gregorian < birthdayWindowStart || gregorian > birthdayWindowEnd) return [];
          return [`${contact.displayName || contact.firstName || "Membre"} (${occurrence.label})`];
        });
      })
      .slice(0, 10);

    const eventLines = (events ?? []).map((event) => {
      const when = formatDate(event.startDate, timezone);
      return `- ${when}: ${event.title}${event.location ? `, ${event.location}` : ""}${event.description ? ` - ${event.description.slice(0, 160)}` : ""}`;
    });

    const prompt = [
      "Tu prepares une newsletter papier A4 professionnelle pour Chabbat, en francais, pour une synagogue ou Beth Habad.",
      "Retourne uniquement un JSON valide avec les cles: title, intro, ravWord, shabbatNote, eventIntro, restaurantAd, proofreadNote.",
      body.mode === "rav" ? "Tu retravailles uniquement le Mot du Rav. Garde les autres champs courts ou vides, mais renvoie toujours un JSON valide." : "Le titre doit etre exactement : Le Chabatone. L'introduction doit etre exactement : Votre feuillet communautaire des activites de la semaine.",
      "Style: chaleureux, clair, tres professionnel, adapte a l'impression papier. Pas d'emojis. Pas de Markdown.",
      `Communaute: ${community?.name ?? "Communaute"}. Ville: ${city}. Ton souhaite: ${safeText(body.tone, 80) || community?.tone || "professionnel"}.`,
      shabbat ? `Chabbat: ${shabbat.parasha ?? "Chabbat"}, date hebraique ${shabbat.hebrewDate ?? ""}, entree ${shabbat.entry ?? ""}, sortie ${shabbat.exit ?? ""}.` : "Horaires de Chabbat indisponibles.",
      modules.ravWord ? `Mot du Rav actif. Theme demande: ${safeText(body.ravTheme, 240) || "message court de Torah pour la semaine"}. Redige un mot de Torah original, inspire de la Paracha, de 90 a 130 mots maximum.` : "Mot du Rav inactif: laisse ravWord vide.",
      modules.shabbat ? "Pour shabbatNote, redige un resume accessible et fidele de la Paracha de la semaine, entre 55 et 75 mots, sans inventer de details." : "Resume de Paracha inactif: laisse shabbatNote vide.",
      modules.parness ? `Parness Hayom: ${safeText(body.parnessText, 220) || "a completer"}.` : "Parness Hayom inactif.",
      modules.kiddush ? `Kidouch: ${safeText(body.kiddushText, 220) || "a completer"}.` : "Kidouch inactif.",
      modules.restaurantAd ? `Pub restaurant active. Base: ${safeText(body.restaurantText, 260) || "restaurant cacher partenaire"}. Redige une annonce courte et elegante.` : "Pub restaurant inactive: laisse restaurantAd vide.",
      modules.events ? `Evenements a venir:\n${eventLines.join("\n") || "Aucun evenement renseigne."}` : "Evenements inactifs.",
      modules.birthdays ? `Anniversaires de la semaine: ${birthdays.join(", ") || "aucun anniversaire renseigne."}` : "Anniversaires inactifs.",
      modules.photos ? `Photos de la semaine actives: ${body.photoCount ?? 0} photo(s) fournies. Propose une courte legende generale dans intro si utile.` : "Photos inactives.",
    ].join("\n");

    const generated = await generateContent({
      communityId: profile.communityId,
      contentType: "COMMUNITY_NEWS",
      customInstructions: prompt,
    });

    const parsed = extractJson(generated.body) ?? extractJson(generated.raw ?? "");

    return NextResponse.json({
      title: "Le Chabatone",
      intro: "Votre feuillet communautaire des activites de la semaine.",
      ravWord: parsed?.ravWord?.trim() || "",
      shabbatNote: parsed?.shabbatNote?.trim() || `Retrouvez les grands enseignements de ${shabbat?.parasha ?? "la Paracha de la semaine"} et partagez-les en famille pendant Chabbat.`,
      eventIntro: parsed?.eventIntro?.trim() || "Voici les principaux rendez-vous a noter pour les prochains jours.",
      restaurantAd: parsed?.restaurantAd?.trim() || "",
      proofreadNote: parsed?.proofreadNote?.trim() || "Texte relu et adapte a un support papier.",
      warnings: [
        ...(eventLines.length === 0 && modules.events ? ["Aucun evenement a venir trouve dans l'agenda."] : []),
        ...(birthdays.length === 0 && modules.birthdays ? ["Aucun anniversaire juif trouve sur les 7 prochains jours."] : []),
        ...(!shabbat && modules.shabbat ? ["Horaires de Chabbat indisponibles pour cette ville."] : []),
      ],
    });
  } catch (error) {
    console.error("[Newsletter Generate]", error);
    return NextResponse.json({ error: "Generation de newsletter impossible" }, { status: 500 });
  }
}
