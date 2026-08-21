import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewsletterPaperClient, type NewsletterBirthday, type NewsletterEvent, type NewsletterShabbat } from "@/components/newsletter/newsletter-paper-client";
import { getUpcomingShabbatTimes } from "@/lib/automation/hebcal";
import { requireAuth } from "@/lib/auth";
import { getBirthdayOccurrence, getCurrentHebrewDate, validateHebrewBirthday } from "@/lib/contacts/hebrew-birthday";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Newsletter papier Chabbat - EasyCom IA" };

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default async function NewsletterPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");

  const admin = createAdminClient();
  const now = new Date();
  const weekEnd = addDays(now, 7);
  const eventsEnd = addDays(now, 45);

  const [{ data: community }, { data: events }, { data: contacts }] = await Promise.all([
    admin
      .from("Community")
      .select("name, logoUrl, coverUrl, city, timezone, communityType, religiousStream, signature, vocabulary, address, phone, email, website")
      .eq("id", profile.communityId)
      .single(),
    admin
      .from("Event")
      .select("id, title, description, startDate, endDate, location, category, status")
      .eq("communityId", profile.communityId)
      .neq("status", "ARCHIVED")
      .gte("startDate", now.toISOString())
      .lte("startDate", eventsEnd.toISOString())
      .order("startDate", { ascending: true })
      .limit(12),
    admin
      .from("CommunityMember")
      .select("id, firstName, displayName, hebrewBirthDay, hebrewBirthMonth, hebrewBirthYear")
      .eq("communityId", profile.communityId)
      .not("hebrewBirthDay", "is", null)
      .limit(1000),
  ]);

  const timezone = community?.timezone && community.timezone !== "UTC" ? community.timezone : "Europe/Paris";
  const city = community?.city ?? "Paris";
  const vocabulary = community?.vocabulary && typeof community.vocabulary === "object" && !Array.isArray(community.vocabulary)
    ? community.vocabulary as Record<string, unknown>
    : null;
  const donationUrl = vocabulary
    ? typeof vocabulary.donationUrl === "string"
      ? vocabulary.donationUrl
      : null
    : null;
  const shabbat = (await getUpcomingShabbatTimes({ city, timezone, count: 1 }))[0] ?? null;
  const shabbatData: NewsletterShabbat | null = shabbat
    ? {
        date: shabbat.date,
        hebrewDate: shabbat.hebrewDate ?? null,
        parasha: shabbat.parasha ?? null,
        entry: shabbat.entry ?? null,
        exit: shabbat.exit ?? null,
      }
    : null;

  const birthdayWindowStart = startOfDay(now);
  const birthdayWindowEnd = startOfDay(weekEnd);
  const currentHebrewYear = getCurrentHebrewDate(timezone, now).getFullYear();
  const birthdays: NewsletterBirthday[] = (contacts ?? [])
    .flatMap((contact) => {
      const birthday = validateHebrewBirthday(contact);
      if (!birthday) return [];
      return [currentHebrewYear, currentHebrewYear + 1].flatMap((year) => {
        const occurrence = getBirthdayOccurrence(birthday, year);
        if (!occurrence) return [];
        const gregorian = new Date(`${occurrence.gregorianDate}T12:00:00`);
        if (gregorian < birthdayWindowStart || gregorian > birthdayWindowEnd) return [];
        return [{
          id: `${contact.id}-${occurrence.gregorianDate}`,
          name: contact.displayName || contact.firstName || "Membre",
          hebrewDate: occurrence.label,
          gregorianDate: occurrence.gregorianDate,
        }];
      });
    })
    .sort((left, right) => left.gregorianDate.localeCompare(right.gregorianDate));

  const eventItems: NewsletterEvent[] = (events ?? []).map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate,
    location: event.location,
    category: event.category,
  }));

  return (
    <NewsletterPaperClient
      community={{
        name: community?.name ?? "Votre communaute",
        logoUrl: community?.logoUrl ?? null,
        coverUrl: community?.coverUrl ?? null,
        city,
        timezone,
        signature: community?.signature ?? null,
        donationUrl,
        address: community?.address ?? null,
        phone: community?.phone ?? null,
        email: community?.email ?? null,
        website: community?.website ?? null,
        isBethHabad: community?.communityType === "SYNAGOGUE" || community?.religiousStream === "BETH_HABAD",
      }}
      initialEvents={eventItems}
      initialBirthdays={birthdays}
      initialShabbat={shabbatData}
    />
  );
}
