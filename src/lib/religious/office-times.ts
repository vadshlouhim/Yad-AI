import type { OutputLocale } from "@/lib/ai/output-locale";

/**
 * One service on a Shabbat poster. `when` keeps what the user wrote ("18h30", "15 min avant
 * l'allumage", "après la lecture") so it stays editable; the clock time is worked out each week.
 */
export type OfficeLine = { label: string; when: string };

type ShabbatClock = { entry?: string | null; exit?: string | null };

const DAY_PREFIX = /^(vendredi(?: soir)?|samedi(?: matin| soir| après-midi)?|motsa[eé]i chabbat|chabbat matin|יום שישי|ערב שבת|מוצאי שבת|שבת בבוקר)(?=[\s:·-]|$)\s*[:·-]?\s*/iu;
// "18h30", "18 h", "18:30", "9h".
const CLOCK = /\b([01]?\d|2[0-3])\s*(?:h|H|:)\s*([0-5]\d)?\b/u;
// "15 min avant l'allumage", "10 minutes après la sortie", "20 דק' לפני הדלקת נרות".
const RELATIVE = /(\d{1,3})\s*(?:min(?:utes?)?|mn|דקות|דק['׳]?)\s*(avant|apr[eè]s|לפני|אחרי)\s*(?:l['’]\s*|la\s+|le\s+|les\s+)?(allumage|bougies|entr[ée]e|chabbat|coucher(?: du soleil)?|sortie|havdala|fin(?: de chabbat)?|הדלקת(?: נרות)?|כניסת(?: שבת)?|צאת(?: שבת)?|יציאת(?: שבת)?|הבדלה)/iu;
// "à l'allumage", "à la sortie", "בהדלקת נרות".
const AT_ANCHOR = /(?:^|\s)(?:à|a|ב)\s*(?:l['’]\s*|la\s+)?(allumage|entr[ée]e|sortie|havdala|הדלקת(?: נרות)?|צאת(?: שבת)?)/iu;

const isExitAnchor = (word: string) => /sortie|havdala|fin|צאת|יציאת|הבדלה/iu.test(word);

function toMinutes(clock: string | null | undefined) {
  const match = clock?.match(/(\d{1,2})\D+(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatClock(totalMinutes: number, locale: OutputLocale) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(minutes / 60);
  const rest = String(minutes % 60).padStart(2, "0");
  return locale === "he" ? `${String(hours).padStart(2, "0")}:${rest}` : `${hours}h${rest}`;
}

const clean = (text: string) => text.replace(/\s+/g, " ").replace(/^[\s:·,–—-]+|[\s:·,–—-]+$/g, "").trim();

/** Splits one written line into a label and its time expression. */
export function parseOfficeLine(text: string): OfficeLine | null {
  const line = clean(text);
  if (!line) return null;
  for (const pattern of [RELATIVE, AT_ANCHOR, CLOCK]) {
    const match = line.match(pattern);
    if (!match || match.index === undefined) continue;
    // "Office vendredi à 19h" → "Office vendredi": the joining word goes with the time.
    const label = clean(clean(line.slice(0, match.index) + " " + line.slice(match.index + match[0].length)).replace(/\s(?:à|a|at|vers|ב)$/iu, ""));
    return { label, when: clean(match[0]) };
  }
  // No recognisable time: "Moussaf : après la lecture" keeps its wording on both sides.
  const separator = line.search(/\s[:–—-]\s/);
  return separator > 0
    ? { label: clean(line.slice(0, separator)), when: clean(line.slice(separator + 2)) }
    : { label: line, when: "" };
}

/**
 * Reads free text such as "Vendredi Min'ha 18h30, Arvit 18h50 – Samedi Cha'harit 9h30" into lines.
 * A day written at the start of a group is carried over to the services that follow it.
 */
export function parseOfficeText(text: string): OfficeLine[] {
  const lines: OfficeLine[] = [];
  for (const row of text.split(/\n|;|\s[–—]\s/u)) {
    let day = "";
    for (const piece of row.split(",")) {
      const dayMatch = clean(piece).match(DAY_PREFIX);
      if (dayMatch) day = clean(dayMatch[1]);
      const parsed = parseOfficeLine(dayMatch ? clean(piece).slice(dayMatch[0].length) : piece);
      if (!parsed) continue;
      const label = day && !parsed.label.toLowerCase().startsWith(day.toLowerCase()) ? clean(`${day[0].toUpperCase()}${day.slice(1)} · ${parsed.label}`) : parsed.label;
      lines.push({ label, when: parsed.when });
    }
  }
  return lines.filter((line) => line.label || line.when).slice(0, 12);
}

/** Works out the clock time of one line for this week's Shabbat; null when it is not a time. */
export function resolveOfficeTime(when: string, clock: ShabbatClock, locale: OutputLocale): string | null {
  const relative = when.match(RELATIVE);
  if (relative) {
    const anchor = toMinutes(isExitAnchor(relative[3]) ? clock.exit : clock.entry);
    if (anchor === null) return null;
    const offset = Number(relative[1]) * (/avant|לפני/iu.test(relative[2]) ? -1 : 1);
    return formatClock(anchor + offset, locale);
  }
  const at = when.match(AT_ANCHOR);
  if (at) {
    const anchor = toMinutes(isExitAnchor(at[1]) ? clock.exit : clock.entry);
    return anchor === null ? null : formatClock(anchor, locale);
  }
  const fixed = when.match(CLOCK);
  return fixed ? formatClock(Number(fixed[1]) * 60 + Number(fixed[2] ?? 0), locale) : null;
}

/** The text printed on the poster: "Min'ha — 18h27", or the user's own wording when it is not a time. */
export function formatOfficeLines(lines: OfficeLine[], clock: ShabbatClock, locale: OutputLocale): string[] {
  return lines.flatMap((line) => {
    const time = line.when ? resolveOfficeTime(line.when, clock, locale) ?? line.when : "";
    const text = [line.label, time].filter(Boolean).join(" — ");
    return text ? [text] : [];
  });
}

/** Groups the services onto a few printed lines ("Min'ha — 17h57 · Arvit — 18h20") for small text areas. */
export function packOfficeLines(texts: string[], maxChars = 52, maxLines = 2): string[] {
  const packed: string[] = [];
  for (const text of texts) {
    const last = packed.at(-1);
    if (last && `${last} · ${text}`.length <= maxChars) packed[packed.length - 1] = `${last} · ${text}`;
    else packed.push(text);
  }
  return packed.length > maxLines ? [...packed.slice(0, maxLines - 1), packed.slice(maxLines - 1).join(" · ")] : packed;
}

/** Stored form, one service per line, that `parseOfficeText` reads back unchanged. */
export function serializeOfficeLines(lines: OfficeLine[]) {
  return lines.map((line) => [line.label, line.when].filter(Boolean).join(" : ")).join("\n");
}
