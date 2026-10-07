import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JewishBirthdaysClient } from "@/components/jewish-birthdays/jewish-birthdays-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBirthdayOccurrence, getCurrentHebrewDate, getHebrewMonthLabel, getYahrzeitOccurrence, validateHebrewBirthday } from "@/lib/contacts/hebrew-birthday";

export const metadata: Metadata = { title: "Anniversaires & Yahrzeit — EasyCom IA" };

export default async function JewishBirthdaysPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");
  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };
  const [{ data: community }, { data: contacts, error }, { data: yahrzeitRows, error: yahrzeitError }] = await Promise.all([
    admin.from("Community").select("timezone").eq("id", profile.communityId).single(),
    admin.from("CommunityMember")
      .select("id, firstName, displayName, phone, hebrewBirthDay, hebrewBirthMonth, hebrewBirthYear")
      .eq("communityId", profile.communityId)
      .not("hebrewBirthDay", "is", null),
    admin.from("MemberYahrzeit")
      .select("id, memberId, deceasedName, deceasedHebrewName, relationship, hebrewDeathDay, hebrewDeathMonth, hebrewDeathYear, member:CommunityMember(id, firstName, displayName, phone)")
      .eq("communityId", profile.communityId)
      .eq("isActive", true),
  ]);
  if (error) console.error("[Jewish Birthdays Page]", error);
  if (yahrzeitError) console.error("[Yahrzeit Page]", yahrzeitError);

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

  const yahrzeits = (yahrzeitRows ?? []).flatMap((row) => {
    const occurrence = getYahrzeitOccurrence({ hebrewDeathDay: row.hebrewDeathDay, hebrewDeathMonth: row.hebrewDeathMonth, hebrewDeathYear: row.hebrewDeathYear }, current.getFullYear());
    const member = Array.isArray(row.member) ? row.member[0] : row.member;
    if (!occurrence || occurrence.hebrewDate.getMonth() !== current.getMonth() || !member) return [];
    return [{ id: row.id, memberId: row.memberId, firstName: member.firstName?.trim() || member.displayName.split(/\s+/)[0], displayName: member.displayName, phone: member.phone, deceasedName: row.deceasedName, deceasedHebrewName: row.deceasedHebrewName, relationship: row.relationship, hebrewDate: occurrence.label, hebrewDay: occurrence.hebrewDate.getDate(), gregorianDate: occurrence.gregorianDate }];
  }).sort((left, right) => left.gregorianDate.localeCompare(right.gregorianDate));

  return (
    <JewishBirthdaysClient
      birthdays={birthdays}
      yahrzeits={yahrzeits}
      currentHebrewDay={current.getDate()}
      currentMonth={`${getHebrewMonthLabel(current.getMonth(), current.getFullYear())} ${current.getFullYear()}`}
    />
  );
}

