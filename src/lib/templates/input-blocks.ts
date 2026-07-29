export type PosterInputPriority = "main" | "important" | "complementary";

export interface PosterInputField {
  id: string;
  role: string;
  priority: PosterInputPriority;
}

export interface PosterInputTextBlock {
  id: string;
  text: string;
  role: string;
  priority: PosterInputPriority;
}

export function buildStructuredPosterTextBlocks(
  fields: PosterInputField[],
  values: Record<string, string>,
): PosterInputTextBlock[] {
  return fields
    .filter((field) => (values[field.id] ?? "").trim().length > 0)
    .map((field) => ({
      id: field.id,
      text: values[field.id],
      role: field.role,
      priority: field.priority,
    }));
}

export function buildFreePosterTextBlocks(text: string): PosterInputTextBlock[] {
  return text
    .split(/\r?\n[ \t]*\r?\n/)
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((paragraph, index) => ({
      id: `paragraph_${index + 1}`,
      text: paragraph,
      role: index === 0 ? "title" : "paragraph",
      priority: index === 0 ? "main" : index === 1 ? "important" : "complementary",
    }));
}
