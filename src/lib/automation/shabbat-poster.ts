import type { PosterChange } from "@/lib/templates/fal-edit";
import type { ShabbatTimes } from "./hebcal";

export const CHABAD_SHABBAT_ATTRIBUTION = "Shabbat times provided by Chabad.org/ShabbatTimes";

export function buildShabbatCaption(fields: Record<string, string>, times: ShabbatTimes): string {
  return [
    `Chabbat Chalom${fields.structureName ? ` de la part de ${fields.structureName}` : ""}.`,
    `${fields.city ?? times.cityName ?? ""} · ${times.date}`,
    `Paracha / lecture : ${times.parasha}`,
    `Entrée de Chabbat : ${times.entry}`,
    `Sortie de Chabbat : ${times.exit}`,
    fields.kiddouch,
    fields.officeTimes,
    CHABAD_SHABBAT_ATTRIBUTION,
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
    { label: "Offices", newText: fields.officeTimes ?? "" },
    { label: "source", newText: CHABAD_SHABBAT_ATTRIBUTION },
  ];
  return changes.filter((change) => change.newText.trim()).map((change) => ({ ...change, currentText: previous.find((old) => old.label.toLowerCase() === change.label.toLowerCase())?.newText ?? "" }));
}
