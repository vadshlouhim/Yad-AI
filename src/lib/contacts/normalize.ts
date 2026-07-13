// Normalisation des contacts (CommunityMember) — partagée entre la route API
// /api/community/members et l'exécuteur de l'assistant IA.

export interface MemberInput {
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  profession?: string | null;
  age?: number | string | null;
  birthDate?: string | null;
  address?: string | null;
  city?: string | null;
  familyStatus?: string | null;
  notes?: string | null;
  source?: string;
  tags?: string[];
}

export function normalizePhone(value: string | null | undefined) {
  return value?.replace(/[^\d+]/g, "").trim() || null;
}

export function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

export function buildDisplayName(member: MemberInput) {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return member.displayName?.trim() || fullName || member.email || member.phone || "Membre";
}

export function normalizeAge(value: MemberInput["age"]) {
  if (value === null || value === undefined || value === "") return null;
  const age = Number(value);
  return Number.isFinite(age) && age >= 0 ? Math.round(age) : null;
}

/** Construit une ligne CommunityMember prête à insérer à partir d'une entrée brute. */
export function buildMemberRow(communityId: string, member: MemberInput) {
  return {
    id: crypto.randomUUID(),
    communityId,
    firstName: member.firstName?.trim() || null,
    lastName: member.lastName?.trim() || null,
    displayName: buildDisplayName(member),
    email: normalizeEmail(member.email),
    phone: normalizePhone(member.phone),
    profession: member.profession?.trim() || null,
    age: normalizeAge(member.age),
    birthDate: member.birthDate || null,
    address: member.address?.trim() || null,
    city: member.city?.trim() || null,
    familyStatus: member.familyStatus?.trim() || null,
    notes: member.notes?.trim() || null,
    source: member.source ?? "manual",
    tags: member.tags ?? [],
    optInEmail: Boolean(normalizeEmail(member.email)),
    optInWhatsapp: Boolean(normalizePhone(member.phone)),
    updatedAt: new Date().toISOString(),
  };
}
