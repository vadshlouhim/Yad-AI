import { gregorianToHebrew } from "@/lib/contacts/hebrew-birthday";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function normalizedKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function first(source: JsonObject, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  const normalized = new Map(Object.entries(source).map(([key, value]) => [normalizedKey(key), value]));
  for (const key of keys) {
    const value = normalized.get(normalizedKey(key));
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function text(source: JsonObject, keys: string[]) {
  const value = first(source, keys);
  if (Array.isArray(value)) return String(value[0] ?? "").trim() || null;
  if (value && typeof value === "object") return String(first(object(value), ["value", "number", "address", "label"]) ?? "").trim() || null;
  return typeof value === "string" || typeof value === "number" ? String(value).trim() || null : null;
}

function boolean(source: JsonObject, keys: string[]) {
  const value = first(source, keys);
  return value === true || value === 1 || value === "1" || ["true", "yes", "oui"].includes(String(value).toLowerCase());
}

function dateOnly(value: string | null) {
  const iso = value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const french = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return french ? `${french[3]}-${french[2]}-${french[1]}` : null;
}

function array(source: JsonObject, keys: string[]) {
  const value = first(source, keys);
  return Array.isArray(value) ? value : [];
}

function sourceWithCustomFields(raw: JsonObject) {
  const customValues: JsonObject = {};
  for (const item of array(raw, ["customFields"])) {
    const field = object(item);
    const key = text(field, ["key", "name", "label", "slug"]);
    if (key) customValues[key] = first(field, ["value", "values"]);
  }
  return { ...customValues, ...raw };
}

export type UnisoftRelation = {
  contactId: string;
  relationship: string | null;
};

export type NormalizedUnisoftContact = {
  externalId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  birthAfterSunset: boolean;
  hebrewFirstName: string | null;
  hebrewFatherName: string | null;
  hebrewMotherName: string | null;
  deceased: boolean;
  deceasedDate: string | null;
  deathAfterSunset: boolean;
  deceasedFatherName: string | null;
  deceasedMotherName: string | null;
  tags: string[];
  relations: UnisoftRelation[];
  relationIds: string[];
  raw: JsonObject;
};

export function normalizeUnisoftContact(rawValue: unknown): NormalizedUnisoftContact | null {
  const raw = object(rawValue);
  const source = sourceWithCustomFields(raw);
  const externalId = text(source, ["id", "uuid", "contactId", "contact_id"]);
  if (!externalId) return null;
  const firstName = text(source, ["firstName", "firstname", "prenom", "first_name"]);
  const lastName = text(source, ["lastName", "lastname", "nom", "last_name"]);
  const displayName = text(source, ["displayName", "fullName", "name", "nomComplet"]) || [firstName, lastName].filter(Boolean).join(" ") || "Contact Unisoft";
  const birthDate = dateOnly(text(source, ["birthDate", "dateOfBirth", "dateNaissance", "birth_date"]));
  const deceasedDate = dateOnly(text(source, ["deceasedDate", "deathDate", "dateDeces", "dateDécès", "deceased_date", "yahrzeitDate", "yahrzeit"]));
  const relations = array(raw, ["familyLinks", "relations", "family", "famille", "relatives"]).flatMap((item) => {
    const relation = object(item);
    const contactId = text(relation, ["contactId", "relatedContactId", "id", "contact_id"]);
    return contactId ? [{ contactId, relationship: text(relation, ["relationship", "relation", "type"]) }] : [];
  });
  const categories = array(raw, ["categories", "tags", "groups"])
    .map((item) => typeof item === "string" ? item : text(object(item), ["name", "label"]))
    .filter((item): item is string => Boolean(item));
  return {
    externalId,
    firstName,
    lastName,
    displayName,
    email: text(source, ["email", "emailAddress", "mail"]),
    phone: text(source, ["phone", "mobile", "telephone", "phoneNumber"]),
    birthDate,
    birthAfterSunset: boolean(source, ["birthAfterSunset", "bornAfterSunset", "naissanceApresCoucherSoleil"]),
    hebrewFirstName: text(source, ["hebrewFirstName", "prenomHebreu", "hebrewName"]),
    hebrewFatherName: text(source, ["hebrewFatherName", "nomHebreuPere", "fatherHebrewName"]),
    hebrewMotherName: text(source, ["hebrewMotherName", "nomHebreuMere", "motherHebrewName"]),
    deceased: Boolean(deceasedDate) || boolean(source, ["deceased", "isDeceased", "decede", "décédé"]),
    deceasedDate,
    deathAfterSunset: boolean(source, ["deathAfterSunset", "deceasedAfterSunset", "decesApresCoucherSoleil"]),
    deceasedFatherName: text(source, ["deceasedPere", "deceasedFather", "fatherHebrewName", "nomHebreuPere"]),
    deceasedMotherName: text(source, ["deceasedMere", "deceasedMother", "motherHebrewName", "nomHebreuMere"]),
    tags: [...new Set(categories)],
    relations,
    relationIds: [...new Set(relations.map((relation) => relation.contactId))],
    raw,
  };
}

export function unisoftHebrewDate(date: string | null, afterSunset: boolean) {
  return date ? gregorianToHebrew(date, afterSunset) : null;
}
