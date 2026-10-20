import { hebrewSeferHamitsvotUrl } from "./shabbat-study";

const TORAH_CALC_URL = "https://www.torahcalc.com/api/dailylearning";
const SEFARIA_TEXT_URL = "https://www.sefaria.org/api/texts";
const SOURCE_TIMEOUT_MS = 20_000;

type FetchLike = typeof fetch;

type TorahCalcResponse = {
  success?: boolean;
  data?: {
    date?: string;
    dailySeferHamitzvos?: {
      name?: string;
      url?: string;
    } | null;
  };
};

type SefariaResponse = {
  heRef?: string;
  he?: unknown;
};

export type HebrewSeferHamitsvotSource = {
  date: string;
  title: string;
  text: string;
  sourceUrl: string;
  retrieval: "he.chabad.org" | "same-day-hebrew-fallback";
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
  return { date: dateISO, ...study, sourceUrl, retrieval: "he.chabad.org" };
}

function commandmentRefs(name: string) {
  const refs: Array<{ type: "Positive" | "Negative"; number: number }> = [];
  for (const match of name.matchAll(/(Positive|Negative) Commandments?\s+([\d,\s]+)/g)) {
    for (const raw of match[2].split(",")) {
      const number = Number.parseInt(raw.trim(), 10);
      if (Number.isInteger(number) && number > 0) refs.push({ type: match[1] as "Positive" | "Negative", number });
    }
  }
  return refs;
}

function flattenHebrewText(value: unknown): string[] {
  if (typeof value === "string") return [htmlToText(value)].filter(Boolean);
  if (!Array.isArray(value)) return [];
  return value.flatMap(flattenHebrewText);
}

async function fetchSameDayHebrewFallback(dateISO: string, fetchImpl: FetchLike): Promise<HebrewSeferHamitsvotSource> {
  const scheduleUrl = `${TORAH_CALC_URL}?date=${encodeURIComponent(dateISO)}`;
  const scheduleResponse = await fetchWithTimeout(fetchImpl, scheduleUrl, "application/json");
  if (!scheduleResponse.ok) throw new Error(`לוח ספר המצוות אינו זמין (${scheduleResponse.status}).`);
  const schedule = await scheduleResponse.json() as TorahCalcResponse;
  const daily = schedule.data?.dailySeferHamitzvos;
  if (!schedule.success || schedule.data?.date !== dateISO || !daily?.name || !daily.url) {
    throw new Error("לוח ספר המצוות לא החזיר לימוד לתאריך המבוקש.");
  }
  const scheduledDate = new URL(daily.url).searchParams.get("tdate");
  const [year, month, day] = dateISO.split("-");
  if (scheduledDate !== `${Number(month)}/${Number(day)}/${year}`) {
    throw new Error("לוח ספר המצוות החזיר תאריך אחר.");
  }
  const refs = commandmentRefs(daily.name);
  if (!refs.length) throw new Error("לא ניתן לזהות את מספר המצווה בלימוד היומי.");

  const portions = await Promise.all(refs.map(async ({ type, number }) => {
    const ref = `Sefer_HaMitzvot,_${type}_Commandments.${number}`;
    const response = await fetchWithTimeout(fetchImpl, `${SEFARIA_TEXT_URL}/${encodeURIComponent(ref)}?lang=he&context=0`, "application/json");
    if (!response.ok) throw new Error(`הטקסט העברי של המצווה אינו זמין (${response.status}).`);
    const payload = await response.json() as SefariaResponse;
    const text = flattenHebrewText(payload.he).join("\n").trim();
    const title = payload.heRef?.replace(/^ספר המצוות,\s*/, "").trim();
    if (!title || text.length < 40 || !/[\u0590-\u05ff]/.test(text)) throw new Error("הטקסט העברי של המצווה חסר.");
    return { title, text: `${title}\n${text}` };
  }));

  return {
    date: dateISO,
    title: portions.map((portion) => portion.title).join("; "),
    text: portions.map((portion) => portion.text).join("\n\n"),
    sourceUrl: hebrewSeferHamitsvotUrl(dateISO),
    retrieval: "same-day-hebrew-fallback",
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
