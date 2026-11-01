import type { ZodError } from "zod";

export function formatValidationError(error: ZodError): string {
  const details = Array.from(new Set(error.issues.map((issue) => {
    const field = issue.path.join(".") || "requête";
    if (issue.code === "too_big") return `${field} dépasse la limite de ${issue.maximum}`;
    if (issue.code === "too_small") return `${field} doit contenir au moins ${issue.minimum} élément(s)`;
    if (issue.code === "invalid_format") return `${field} n’a pas un format valide`;
    return `${field} : ${issue.message}`;
  })));

  return details.length > 0
    ? `Données invalides — ${details.join(" ; ")}.`
    : "Données invalides.";
}
