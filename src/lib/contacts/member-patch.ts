import { normalizeAge, normalizeEmail, normalizePhone, type MemberInput } from "./normalize";
import { gregorianToHebrew, hebrewBirthdayToGregorianISO, validateHebrewBirthday } from "./hebrew-birthday";

type ExistingMember = MemberInput & { optInEmail?: boolean; optInWhatsapp?: boolean };
const owns = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
export function cleanGroups(tags: string[]) {
  const seen = new Set<string>();
  return tags.map(tag => tag.trim()).filter(tag => {
    const key = tag.toLocaleLowerCase("fr");
    if (!tag || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function validCivilDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Only explicitly supplied writable properties enter the update. Never infer legacy names. */
export function buildMemberPatch(existing: ExistingMember, raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Modification invalide.");
  const input = raw as MemberInput;
  const patch: MemberInput & { optInEmail?: boolean; optInWhatsapp?: boolean; updatedAt: string } = { updatedAt: new Date().toISOString() };
  for (const key of ["firstName", "lastName", "displayName", "email", "phone", "profession", "address", "city", "familyStatus", "notes", "source"] as const) {
    if (!owns(input, key)) continue;
    const value = input[key];
    if (value !== null && typeof value !== "string") throw new Error(`Valeur invalide : ${key}.`);
    Object.assign(patch, { [key]: value?.trim() || (key === "displayName" || key === "source" ? "" : null) });
  }
  if (owns(input, "email")) {
    patch.email = normalizeEmail(input.email);
    if (patch.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email)) throw new Error("Email invalide.");
    if (!patch.email) patch.optInEmail = false;
  }
  if (owns(input, "phone")) {
    patch.phone = normalizePhone(input.phone);
    if (input.phone?.trim() && (!patch.phone || !/^\+?\d+$/.test(patch.phone) || /[^\d+\s()./-]/.test(input.phone))) throw new Error("Téléphone invalide.");
  }
  if (owns(input, "phone") && !patch.phone) patch.optInWhatsapp = false;
  if (owns(input, "age")) {
    if (input.age !== null && input.age !== "" && (!Number.isFinite(Number(input.age)) || Number(input.age) < 0)) throw new Error("Âge invalide.");
    patch.age = normalizeAge(input.age);
  }
  if (owns(input, "tags")) {
    if (!Array.isArray(input.tags) || input.tags.some(tag => typeof tag !== "string")) throw new Error("Groupes invalides.");
    patch.tags = cleanGroups(input.tags);
  }
  if (!owns(input, "displayName") && (owns(input, "firstName") || owns(input, "lastName"))) {
    const composed = (member: MemberInput) => [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
    if (!existing.displayName || existing.displayName === composed(existing)) {
      patch.displayName = composed({ ...existing, ...patch }) || existing.email || existing.phone || "Membre";
    }
  }
  if (owns(input, "birthAfterSunset")) {
    if (typeof input.birthAfterSunset !== "boolean") throw new Error("Option coucher du soleil invalide.");
    patch.birthAfterSunset = input.birthAfterSunset;
  }
  const hebrewKeys = ["hebrewBirthDay", "hebrewBirthMonth", "hebrewBirthYear"] as const;
  const hebrewTouched = hebrewKeys.some(key => owns(input, key));
  const civilTouched = owns(input, "birthDate");
  const sunsetTouched = owns(input, "birthAfterSunset");
  const afterSunset = input.birthAfterSunset ?? existing.birthAfterSunset ?? false;
  const clear = (civilTouched && (input.birthDate === "" || input.birthDate === null)) || (!civilTouched && hebrewKeys.every(key => owns(input, key) && (input[key] === "" || input[key] === null)));
  if (clear) {
    patch.birthDate = null;
    for (const key of hebrewKeys) patch[key] = null;
  } else if (civilTouched || (!hebrewTouched && sunsetTouched && existing.birthDate)) {
    const date = civilTouched ? input.birthDate : existing.birthDate?.slice(0, 10);
    if (typeof date !== "string" || !validCivilDate(date)) throw new Error("Date civile complète et valide requise.");
    const birthday = gregorianToHebrew(date, afterSunset);
    if (!birthday || !validateHebrewBirthday({ hebrewBirthDay: birthday.day, hebrewBirthMonth: birthday.month, hebrewBirthYear: birthday.year })) throw new Error("Date hors limites.");
    Object.assign(patch, { birthDate: date, hebrewBirthDay: birthday.day, hebrewBirthMonth: birthday.month, hebrewBirthYear: birthday.year });
  } else if (hebrewTouched) {
    if (!hebrewKeys.every(key => owns(input, key))) throw new Error("Date hébraïque complète requise.");
    if (hebrewKeys.some(key => !["number", "string"].includes(typeof input[key]))) throw new Error("Date hébraïque invalide.");
    const birthday = validateHebrewBirthday({ hebrewBirthDay: Number(input.hebrewBirthDay), hebrewBirthMonth: Number(input.hebrewBirthMonth), hebrewBirthYear: Number(input.hebrewBirthYear) });
    if (!birthday) throw new Error("Date hébraïque invalide.");
    const civil = new Date(`${hebrewBirthdayToGregorianISO(birthday)}T12:00:00Z`);
    if (afterSunset) civil.setUTCDate(civil.getUTCDate() - 1);
    Object.assign(patch, birthday, { birthDate: civil.toISOString().slice(0, 10) });
  }
  return patch;
}
