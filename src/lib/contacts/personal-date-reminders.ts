import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationOnce } from "@/lib/notifications/create-once";
import { getBirthdayOccurrence, getCurrentHebrewDate, getYahrzeitOccurrence, validateHebrewBirthday } from "@/lib/contacts/hebrew-birthday";

type Admin = ReturnType<typeof createAdminClient> & { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function todayIso(timezone: string, now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export async function runPersonalDateReminders(now = new Date()) {
  const admin = createAdminClient() as Admin;
  const { data: communities, error } = await admin.from("Community").select("id, timezone");
  if (error) throw error;
  let created = 0;
  for (const community of communities ?? []) {
    const [{ data: users }, { data: members }, { data: yahrzeits }] = await Promise.all([
      admin.from("profiles").select("id").eq("communityId", community.id).in("role", ["ADMIN", "SUPER_ADMIN"]),
      admin.from("CommunityMember").select("id, displayName, hebrewBirthDay, hebrewBirthMonth, hebrewBirthYear").eq("communityId", community.id).not("hebrewBirthDay", "is", null),
      admin.from("MemberYahrzeit").select("id, deceasedName, hebrewDeathDay, hebrewDeathMonth, hebrewDeathYear, member:CommunityMember(displayName)").eq("communityId", community.id).eq("isActive", true),
    ]);
    const timezone = community.timezone || "Europe/Paris";
    const currentHebrew = getCurrentHebrewDate(timezone, now);
    const today = todayIso(timezone, now);
    const events: Array<{ id: string; kind: "birthday" | "yahrzeit"; label: string; date: string }> = [];
    for (const member of members ?? []) {
      const birthday = validateHebrewBirthday(member);
      if (!birthday) continue;
      let occurrence = getBirthdayOccurrence(birthday, currentHebrew.getFullYear());
      if (occurrence && daysBetween(today, occurrence.gregorianDate) < 0) occurrence = getBirthdayOccurrence(birthday, currentHebrew.getFullYear() + 1);
      if (occurrence) events.push({ id: member.id, kind: "birthday", label: member.displayName, date: occurrence.gregorianDate });
    }
    for (const row of yahrzeits ?? []) {
      let occurrence = getYahrzeitOccurrence({ hebrewDeathDay: row.hebrewDeathDay, hebrewDeathMonth: row.hebrewDeathMonth, hebrewDeathYear: row.hebrewDeathYear }, currentHebrew.getFullYear());
      if (occurrence && daysBetween(today, occurrence.gregorianDate) < 0) occurrence = getYahrzeitOccurrence({ hebrewDeathDay: row.hebrewDeathDay, hebrewDeathMonth: row.hebrewDeathMonth, hebrewDeathYear: row.hebrewDeathYear }, currentHebrew.getFullYear() + 1);
      const member = Array.isArray(row.member) ? row.member[0] : row.member;
      if (occurrence) events.push({ id: row.id, kind: "yahrzeit", label: `${row.deceasedName}${member?.displayName ? ` — ${member.displayName}` : ""}`, date: occurrence.gregorianDate });
    }
    for (const event of events) {
      const lead = daysBetween(today, event.date);
      if (lead !== 7 && lead !== 1) continue;
      for (const user of users ?? []) {
        const proposal = lead === 7;
        const inserted = await createNotificationOnce(admin, {
          userId: user.id,
          communityId: community.id,
          type: "SYSTEM",
          title: proposal ? "Proposition à préparer" : "Rappel pour demain",
          body: `${event.kind === "birthday" ? "Anniversaire" : "Yahrzeit"} de ${event.label} ${proposal ? "dans 7 jours" : "demain"}. Préparez la proposition Kidouch ou Parnass Hayom.`,
          link: "/dashboard/jewish-birthdays",
          dedupeKey: `personal-date:${community.id}:${user.id}:${event.kind}:${event.id}:${event.date}:j-${lead}`,
          data: { eventId: event.id, kind: event.kind, occurrenceDate: event.date, leadDays: lead },
        });
        if (inserted) created += 1;
      }
    }
  }
  return { created };
}
