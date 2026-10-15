import { getBirthdayOccurrence, getCurrentHebrewDate, validateHebrewBirthday } from "./hebrew-birthday";
import type { MemberInput } from "./normalize";

export interface CommunityMember extends MemberInput {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  birthAfterSunset: boolean;
  hebrewBirthDay: number | null;
  hebrewBirthMonth: number | null;
  hebrewBirthYear: number | null;
}
export const searchKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
export function matchesContact(contact: CommunityMember, query: string) {
  const terms = searchKey(query).trim().split(/\s+/).filter(Boolean);
  const content = searchKey([contact.displayName, contact.lastName, contact.firstName, contact.phone, contact.email, contact.city, ...(contact.tags ?? [])].filter(Boolean).join(" "));
  return terms.every(term => content.includes(term));
}
export function birthdaySoon(contact: CommunityMember, calendar: "hebrew" | "civil", now = new Date(), timezone = "Europe/Paris") {
  const today = getCurrentHebrewDate(timezone, now);
  const start = today.greg();
  start.setHours(12, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 30);
  if (calendar === "hebrew") {
    const birthday = validateHebrewBirthday({ hebrewBirthDay: contact.hebrewBirthDay ?? undefined, hebrewBirthMonth: contact.hebrewBirthMonth ?? undefined, hebrewBirthYear: contact.hebrewBirthYear ?? undefined });
    if (!birthday) return false;
    return [today.getFullYear(), today.getFullYear() + 1].some(year => {
      const occurrence = getBirthdayOccurrence(birthday, year);
      if (!occurrence) return false;
      const date = new Date(`${occurrence.gregorianDate}T12:00:00`);
      return date >= start && date < end;
    });
  }
  if (!contact.birthDate) return false;
  const [, month, day] = contact.birthDate.slice(0, 10).split("-").map(Number);
  return [start.getFullYear(), start.getFullYear() + 1].some(year => {
    // Civil leap-day anniversaries fall on 1 March in non-leap years.
    const date = new Date(year, month - 1, day, 12);
    return date >= start && date < end;
  });
}
