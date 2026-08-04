export type TemplateAdminErrorCode =
  | "TEMPLATE_SCHEMA_OUTDATED"
  | "TEMPLATE_CREATE_FAILED"
  | "TEMPLATE_UPDATE_FAILED"
  | "TEMPLATE_DELETE_FAILED"
  | "TEMPLATE_UPLOAD_FAILED";

export interface TemplateAdminError {
  code: TemplateAdminErrorCode;
  error: string;
  status: number;
}

type DatabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export function isTemplateSchemaOutdated(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const databaseError = error as DatabaseErrorLike;
  const searchable = [
    databaseError.code,
    databaseError.message,
    databaseError.details,
    databaseError.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (searchable.includes("originalurl") || searchable.includes("layoutstatus") || searchable.includes("layoutconfidence") || searchable.includes("layoutanalysis"))
    && (
      searchable.includes("does not exist")
      || searchable.includes("schema cache")
      || databaseError.code === "42703"
      || databaseError.code === "PGRST204"
    )
  );
}

export function classifyTemplateAdminError(
  error: unknown,
  fallbackCode: Exclude<TemplateAdminErrorCode, "TEMPLATE_SCHEMA_OUTDATED">,
): TemplateAdminError {
  if (isTemplateSchemaOutdated(error)) {
    return {
      code: "TEMPLATE_SCHEMA_OUTDATED",
      error: "La base Supabase doit être mise à jour avant de gérer les affiches.",
      status: 503,
    };
  }

  const fallbackMessages: Record<typeof fallbackCode, string> = {
    TEMPLATE_CREATE_FAILED: "Impossible de créer l'affiche.",
    TEMPLATE_UPDATE_FAILED: "Impossible de mettre à jour l'affiche.",
    TEMPLATE_DELETE_FAILED: "Impossible de supprimer l'affiche.",
    TEMPLATE_UPLOAD_FAILED: "Impossible de téléverser l'image.",
  };
  return {
    code: fallbackCode,
    error: fallbackMessages[fallbackCode],
    status: 500,
  };
}
