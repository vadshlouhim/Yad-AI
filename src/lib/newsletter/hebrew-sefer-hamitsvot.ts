import { hebrewSeferHamitsvotUrl } from "./shabbat-study";
import { fetchSeferHamitsvot } from "@/lib/automation/hayom-yom";

const SEFARIA_TEXT_URL = "https://www.sefaria.org/api/v3/texts";
const SOURCE_TIMEOUT_MS = 20_000;

type FetchLike = typeof fetch;

type SefariaResponse = {
  ref?: string;
  heRef?: string;
  versions?: Array<{
    language?: string;
    text?: unknown;
  }>;
};

export type HebrewSeferHamitsvotSource = {
  date: string;
  title: string;
  text: string;
  sourceUrl: string;
  sourceLabel: string;
  retrieval: "he.chabad.org" | "loubavitch.fr+sefaria";
};

function decodeHtml(value: string) {
  const named: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const hex = code[1]?.toLowerCase() === "x";
    const parsed = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
    return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : entity;
  });
}

function htmlToText(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|h[1-6]|li|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function assertSameGregorianDate(text: string, dateISO: string) {
  const date = new Date(`${dateISO}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value?.replace(/^ב/, "");
  const year = parts.find((part) => part.type === "year")?.value;
  if (!day || !month || !year || !text.includes(day) || !text.includes(month) || !text.includes(year)) {
    throw new Error("המקור העברי לא החזיר את התאריך המבוקש.");
  }
}

export function extractHebrewSeferHamitsvot(html: string, dateISO: string) {
  if (/Just a moment|Enable JavaScript and cookies|Performing security verification/i.test(html)) {
    throw new Error("he.chabad.org חסם את בקשת השרת.");
  }
  const text = htmlToText(html);
  assertSameGregorianDate(text, dateISO);
  const startMarkers = ["המצוה היומית", "המצווה היומית"];
  const starts = startMarkers.map((marker) => text.indexOf(marker)).filter((index) => index >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  if (start < 0) throw new Error("כותרת הלימוד היומי לא נמצאה במקור העברי.");
  const selected = text.slice(start);
  const endMarkers = ["From Sefer Hamitzvot", "הטקסט בדף זה", "אודות הספר", "שיעורי לימוד יומיים"];
  const ends = endMarkers.map((marker) => selected.indexOf(marker)).filter((index) => index > 80);
  const result = selected.slice(0, ends.length ? Math.min(...ends) : undefined).trim();
  const title = result.match(/שיעור\s+\d+\s*:\s*([^\n]+)/)?.[1]?.trim()
    ?? result.match(/(מצוות\s+(?:עשה|לא תעשה)\s+[^\s;]+)/)?.[1]?.trim()
    ?? "ספר המצוות";
  if (result.length < 80 || !/[\u0590-\u05ff]/.test(result)) throw new Error("תוכן הלימוד העברי לא נמצא.");
  return { title, text: result.slice(0, 12_000) };
}

async function fetchWithTimeout(fetchImpl: FetchLike, url: string, accept: string) {
  return fetchImpl(url, {
    headers: {
      Accept: accept,
      "Accept-Language": "he-IL,he;q=0.9",
      "User-Agent": "EasyCom-IA/1.0 (+https://easycom-ai.com)",
    },
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
}

async function fetchDirectChabad(dateISO: string, fetchImpl: FetchLike): Promise<HebrewSeferHamitsvotSource> {
  const sourceUrl = hebrewSeferHamitsvotUrl(dateISO);
  const response = await fetchWithTimeout(fetchImpl, sourceUrl, "text/html,application/xhtml+xml");
  const html = await response.text();
  if (!response.ok) throw new Error(`he.chabad.org חסם את בקשת השרת (${response.status}).`);
  const study = extractHebrewSeferHamitsvot(html, dateISO);
  return { date: dateISO, ...study, sourceUrl, sourceLabel: "מקור: he.chabad.org", retrieval: "he.chabad.org" };
}

export function commandmentRefs(frenchStudy: string) {
  const refs: Array<{ type: "Positive" | "Negative"; number: number }> = [];
  for (const match of frenchStudy.matchAll(/Mitsva\s+(positive|n[eé]gative)\s+N(?:°|º|o)?\s*(\d+)/gi)) {
    const number = Number.parseInt(match[2], 10);
    const type = match[1].toLocaleLowerCase("fr-FR") === "positive" ? "Positive" : "Negative";
    if (Number.isInteger(number) && number > 0 && !refs.some((ref) => ref.type === type && ref.number === number)) refs.push({ type, number });
  }
  return refs;
}

function flattenHebrewText(value: unknown): string[] {
  if (typeof value === "string") return [htmlToText(value)].filter(Boolean);
  if (!Array.isArray(value)) return [];
  return value.flatMap(flattenHebrewText);
}

async function fetchSameDayHebrewFallback(dateISO: string, fetchImpl: FetchLike): Promise<HebrewSeferHamitsvotSource> {
  const frenchStudy = await fetchSeferHamitsvot(dateISO, fetchImpl);
  const refs = commandmentRefs(frenchStudy.text);
  if (!refs.length) throw new Error("לא ניתן לזהות את מספר המצווה בלימוד היומי.");

  const portions = await Promise.all(refs.map(async ({ type, number }) => {
    const ref = `Sefer_HaMitzvot,_${type}_Commandments.${number}`;
    const apiUrl = `${SEFARIA_TEXT_URL}/${ref}?version=hebrew`;
    const response = await fetchWithTimeout(fetchImpl, apiUrl, "application/json");
    if (!response.ok) throw new Error(`הטקסט העברי של המצווה אינו זמין (${response.status}).`);
    const payload = await response.json() as SefariaResponse;
    const expectedRef = `Sefer HaMitzvot, ${type} Commandments ${number}`;
    const text = flattenHebrewText(payload.versions?.find((version) => version.language === "he")?.text).join("\n").trim();
    const title = payload.heRef?.replace(/^ספר המצוות,\s*/, "").trim();
    if (payload.ref !== expectedRef || !title || text.length < 40 || !/[\u0590-\u05ff]/.test(text)) throw new Error("הטקסט העברי של המצווה חסר או שההפניה אינה תואמת.");
    return { title, text: `${title}\n${text}` };
  }));

  const firstRef = `Sefer_HaMitzvot,_${refs[0].type}_Commandments.${refs[0].number}`;
  return {
    date: dateISO,
    title: portions.map((portion) => portion.title).join("; "),
    text: portions.map((portion) => portion.text).join("\n\n"),
    sourceUrl: `https://www.sefaria.org/${firstRef}?lang=he`,
    sourceLabel: "מקור: ספר המצוות לרמב״ם (Sefaria)",
    retrieval: "loubavitch.fr+sefaria",
  };
}

export async function fetchHebrewSeferHamitsvotSource(dateISO: string, fetchImpl: FetchLike = fetch) {
  try {
    return await fetchDirectChabad(dateISO, fetchImpl);
  } catch (directError) {
    try {
      return await fetchSameDayHebrewFallback(dateISO, fetchImpl);
    } catch (fallbackError) {
      throw new AggregateError([directError, fallbackError], "לא ניתן לטעון את ספר המצוות לתאריך המבוקש.");
    }
  }
}
