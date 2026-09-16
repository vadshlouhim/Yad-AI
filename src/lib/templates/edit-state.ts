import type { Json } from "@/types/database.types";
import type { PosterChange } from "./fal-edit";

export type PosterEditState = {
  version: 1;
  templateId: string;
  sourceMediaId: string | null;
  changes: PosterChange[];
  textsToRemove: string[];
  logoUrl: string | null;
  shabbatDate?: string;
};

export function readPosterEditState(value: Json | null | undefined): PosterEditState | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.changes)) return null;
  return value as unknown as PosterEditState;
}

/** Store the texts actually visible on the new version, including unchanged fields. */
export function mergePosterChanges(previous: PosterChange[], changes: PosterChange[], removals: string[] = []): PosterChange[] {
  const result = previous.filter((change) => !removals.includes(change.newText));
  for (const change of changes) {
    const index = result.findIndex((old) => old.label.toLowerCase() === change.label.toLowerCase() || (change.currentText && old.newText === change.currentText));
    const current = { ...change, currentText: change.newText };
    if (index < 0) result.push(current);
    else result[index] = current;
  }
  return result;
}
