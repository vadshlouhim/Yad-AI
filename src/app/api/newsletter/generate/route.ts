export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { newsletterGeneratedText } from "@/lib/newsletter/generated-text";
import { getUpcomingShabbatTimes } from "@/lib/automation/hebcal";
import { generateContent } from "@/lib/ai/engine";
import { getBirthdayOccurrence, getCurrentHebrewDate, validateHebrewBirthday } from "@/lib/contacts/hebrew-birthday";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertPaidFeature } from "@/lib/billing";
import { limitNewsletterText, NEWSLETTER_RAV_WORD_LIMIT } from "@/lib/newsletter/limits";
import { outputIntlLocale, outputLanguageDirective, parseOutputLocale, type OutputLocale } from "@/lib/ai/output-locale";
import { localizedHebrewDate, localizedParasha } from "@/lib/newsletter/religious-locale";

type ModuleKey = "ravWord" | "photos" | "parness" | "birthdays" | "kiddush" | "events" | "restaurantAd" | "shabbat";

type GenerateBody = {
  mode?: "full" | "rav";
  title?: string;
  modules?: Partial<Record<ModuleKey, boolean>>;
  ravTheme?: string;
  parnessText?: string;
  kiddushText?: string;
  restaurantText?: string;
  photoCount?: number;
  tone?: string;
  outputLocale?: OutputLocale;
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

function formatDate(value: string, timezone: string, locale: OutputLocale) {
  return new Intl.DateTimeFormat(outputIntlLocale(locale), {
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
      subtitle: string;
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
    if (!user) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });

    const admin = createAdminClient();
    const paidAccess = await assertPaidFeature(
      admin,
      user.id,
      "newsletter_generation"
    );
    if (!paidAccess.ok) return paidAccess.response;
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ code: "COMMUNITY_UNAVAILABLE" }, { status: 403 });

    const body = await request.json().catch(() => ({})) as GenerateBody;
    const outputLocale = parseOutputLocale(body.outputLocale);
    const modules = body.modules ?? {};
    const activeModuleCount = Object.values(modules).filter(Boolean).length;
    const sparseLayout = activeModuleCount <= 5;
    const requestedTitle = safeText(body.title, 70) || (outputLocale === "he" ? "השבתון" : "Le Chabbat Mag");
    const now = new Date();
    const [{ data: community }, { data: events }, { data: contacts }] = await Promise.all([
      admin
        .from("Community")
        .select("name, city, timezone, tone, editorialRules")
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
    const parasha = shabbat ? localizedParasha(shabbat.date, outputLocale, shabbat.parasha) : null;
    const hebrewDate = shabbat ? localizedHebrewDate(shabbat.date, outputLocale, shabbat.hebrewDate) : null;
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
      const when = formatDate(event.startDate, timezone, outputLocale);
      return `- ${when}: ${event.title}${event.location ? `, ${event.location}` : ""}${event.description ? ` - ${event.description.slice(0, 160)}` : ""}`;
    });

    const prompt = [
      "Tu prépares une newsletter papier A4 professionnelle pour Chabbat, pour une synagogue ou un Beth Habad.",
      outputLanguageDirective(outputLocale),
      "Retourne uniquement un JSON valide avec les cles: title, subtitle, intro, ravWord, shabbatNote, eventIntro, restaurantAd, proofreadNote.",
      body.mode === "rav" ? "Tu retravailles uniquement le Mot du Rav. Garde les autres champs courts ou vides, mais renvoie toujours un JSON valide." : `Le titre doit rester exactement : ${requestedTitle}. L'introduction doit etre courte, accueillante et tenir sur deux lignes maximum.`,
      sparseLayout
        ? "La maquette contient peu de rubriques. Equilibre intelligemment la page en enrichissant les textes actifs avec du contenu utile, sans repetition et sans remplissage artificiel, afin d'eviter de grandes zones vides."
        : "La maquette contient plusieurs rubriques. Reste concis pour conserver une composition aeree et reguliere.",
      "Style: chaleureux, clair, tres professionnel, adapte a l'impression papier. Pas d'emojis. Pas de Markdown.",
      outputLocale === "he" ? "Écris un hébreu naturel, chaleureux et fluide, adapté à une communauté Habad ; évite toute traduction mot à mot du français." : "",
      `Communaute: ${community?.name ?? "Communaute"}. Ville: ${city}. Ton souhaite: ${safeText(body.tone, 80) || community?.tone || "professionnel"}.`,
      shabbat ? `Chabbat: ${parasha ?? "Chabbat"}, date hébraïque ${hebrewDate ?? ""}, entrée ${shabbat.entry ?? ""}, sortie ${shabbat.exit ?? ""}.` : "Horaires de Chabbat indisponibles.",
      modules.ravWord ? `Mot du Rav actif. Theme demande: ${safeText(body.ravTheme, 240) || "message court de Torah pour la semaine"}. Redige un mot de Torah original, inspire de la Paracha, sans jamais depasser ${NEWSLETTER_RAV_WORD_LIMIT} caracteres, espaces compris.` : "Mot du Rav inactif: laisse ravWord vide.",
      modules.shabbat ? `Pour shabbatNote, redige un resume accessible et fidele de la Paracha de la semaine, entre ${sparseLayout ? "75 et 95" : "55 et 75"} mots, sans inventer de details.` : "Resume de Paracha inactif: laisse shabbatNote vide.",
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
      outputLocale,
    });

    const parsed = extractJson(generated.body) ?? extractJson(generated.raw ?? "");

    return NextResponse.json({
      title: requestedTitle,
      subtitle: newsletterGeneratedText(parsed?.subtitle, outputLocale === "he" ? "דף השבוע של הקהילה" : "Au cœur de notre communauté"),
      intro: newsletterGeneratedText(parsed?.intro, outputLocale === "he" ? `שבת שלום וברוכים הבאים להשבתון שלנו. פרשת ${parasha ?? "השבוע"} מזמינה אותנו להתחזק יחד בתורה, במצוות ובאהבת ישראל. נאחל לכל בני הקהילה שבוע מבורך ומלא אור.` : "Votre feuillet communautaire des activités de la semaine."),
      ravWord: limitNewsletterText(newsletterGeneratedText(parsed?.ravWord), NEWSLETTER_RAV_WORD_LIMIT),
      shabbatNote: newsletterGeneratedText(parsed?.shabbatNote, outputLocale === "he" ? "רעיונות מרכזיים מפרשת השבוע לשיתוף סביב שולחן השבת." : `Retrouvez les grands enseignements de ${parasha ?? "la Paracha de la semaine"} et partagez-les en famille pendant Chabbat.`),
      eventIntro: newsletterGeneratedText(parsed?.eventIntro, outputLocale === "he" ? "האירועים המרכזיים לימים הקרובים." : "Voici les principaux rendez-vous à noter pour les prochains jours."),
      restaurantAd: newsletterGeneratedText(parsed?.restaurantAd),
      proofreadNote: newsletterGeneratedText(parsed?.proofreadNote, outputLocale === "he" ? "הטקסט מותאם לקריאה ולהדפסה." : "Texte relu et adapté à un support papier."),
      warnings: [
        ...(eventLines.length === 0 && modules.events ? ["NO_UPCOMING_EVENTS"] : []),
        ...(birthdays.length === 0 && modules.birthdays ? ["NO_UPCOMING_BIRTHDAYS"] : []),
        ...(!shabbat && modules.shabbat ? ["SHABBAT_TIMES_UNAVAILABLE"] : []),
      ],
    });
  } catch (error) {
    console.error("[Newsletter Generate]", error);
    return NextResponse.json({ code: "AI_UNAVAILABLE" }, { status: 500 });
  }
}
