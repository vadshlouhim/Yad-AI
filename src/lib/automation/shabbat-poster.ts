import type { PosterChange } from "@/lib/templates/fal-edit";
import type { ShabbatTimes } from "./hebcal";
import type { OutputLocale } from "@/lib/ai/output-locale";
import { formatOfficeLines, parseOfficeText } from "@/lib/religious/office-times";

export function buildShabbatCaption(fields: Record<string, string>, times: ShabbatTimes, locale: OutputLocale = "fr"): string {
  if (locale === "he") return [
    `שבת שלום${fields.structureName ? ` מאת ${fields.structureName}` : ""}.`,
    `${fields.city ?? times.cityName ?? ""} · ${times.date}`,
    `פרשת השבוע: ${times.parasha}`,
    `כניסת שבת: ${times.entry}`,
    `יציאת שבת: ${times.exit}`,
    fields.kiddouch,
    ...formatOfficeLines(parseOfficeText(fields.officeTimes ?? ""), times, locale),
  ].filter(Boolean).join("\n");
  return [
    `Chabbat Chalom${fields.structureName ? ` de la part de ${fields.structureName}` : ""}.`,
    `${fields.city ?? times.cityName ?? ""} · ${times.date}`,
    `Paracha / lecture : ${times.parasha}`,
    `Entrée de Chabbat : ${times.entry}`,
    `Sortie de Chabbat : ${times.exit}`,
    fields.kiddouch,
    ...formatOfficeLines(parseOfficeText(fields.officeTimes ?? ""), times, locale),
  ].filter(Boolean).join("\n");
}

export function buildShabbatPosterChanges(fields: Record<string, string>, times: ShabbatTimes, previous: PosterChange[] = []): PosterChange[] {
  const date = new Date(`${times.date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const changes = [
    { label: "organization", newText: fields.structureName ?? "" },
    { label: "parasha", newText: times.parasha },
    { label: "Date", newText: date },
    { label: "entry time", newText: times.entry },
    { label: "exit time", newText: times.exit },
    { label: "location", newText: fields.city ?? times.cityName ?? "" },
    { label: "Kiddouch", newText: fields.kiddouch ?? "" },
    { label: "Offices", newText: formatOfficeLines(parseOfficeText(fields.officeTimes ?? ""), times, "fr").join("\n") },
  ];
  return changes.filter((change) => change.newText.trim()).map((change) => ({ ...change, currentText: previous.find((old) => old.label.toLowerCase() === change.label.toLowerCase())?.newText ?? "" }));
}
