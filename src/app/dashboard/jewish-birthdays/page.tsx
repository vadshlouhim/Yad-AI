import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JewishBirthdaysClient } from "@/components/jewish-birthdays/jewish-birthdays-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBirthdayOccurrence, getCurrentHebrewDate, getHebrewMonthLabel, validateHebrewBirthday } from "@/lib/contacts/hebrew-birthday";

export const metadata: Metadata = { title: "Anniversaires juifs — EasyCom IA" };

export default async function JewishBirthdaysPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };
  const [{ data: community }, { data: contacts, error }] = await Promise.all([
    admin.from("Community").select("timezone").eq("id", profile.communityId).single(),
    admin.from("CommunityMember")
      .select("id, firstName, displayName, phone, hebrewBirthDay, hebrewBirthMonth, hebrewBirthYear")
      .eq("communityId", profile.communityId)
      .not("hebrewBirthDay", "is", null),
  ]);
  if (error) console.error("[Jewish Birthdays Page]", error);

  const timezone = community?.timezone ?? "Europe/Paris";
  const current = getCurrentHebrewDate(timezone);
  const birthdays = (contacts ?? []).flatMap((contact) => {
    const birthday = validateHebrewBirthday(contact);
    if (!birthday) return [];
    const occurrence = getBirthdayOccurrence(birthday, current.getFullYear());
    if (!occurrence || occurrence.hebrewDate.getMonth() !== current.getMonth()) return [];
    return [{
      id: contact.id,
      firstName: contact.firstName?.trim() || contact.displayName.split(/\s+/)[0],
      displayName: contact.displayName,
      phone: contact.phone,
      hebrewDate: occurrence.label,
      hebrewDay: occurrence.hebrewDate.getDate(),
      gregorianDate: occurrence.gregorianDate,
    }];
  }).sort((left, right) => left.gregorianDate.localeCompare(right.gregorianDate));

  return (
    <JewishBirthdaysClient
      birthdays={birthdays}
      currentHebrewDay={current.getDate()}
      currentMonth={`${getHebrewMonthLabel(current.getMonth(), current.getFullYear())} ${current.getFullYear()}`}
    />
  );
}

