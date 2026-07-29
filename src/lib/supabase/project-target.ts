export interface SupabaseTargetCheck {
  expectedProjectRef: string | null;
  databaseProjectRef: string | null;
  matches: boolean;
  reason: string | null;
}

function parseUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getSupabaseProjectRef(value: string | undefined) {
  const url = parseUrl(value);
  if (!url) return null;
  const match = url.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
  return match?.[1] ?? null;
}

export function getDatabaseProjectRef(value: string | undefined) {
  const url = parseUrl(value);
  if (!url) return null;

  const directHostMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (directHostMatch) return directHostMatch[1];

  const username = decodeURIComponent(url.username);
  const pooledUserMatch = username.match(/^postgres\.([a-z0-9]+)$/i);
  return pooledUserMatch?.[1] ?? null;
}

export function checkSupabaseDatabaseTarget(params: {
  supabaseUrl: string | undefined;
  databaseUrl: string | undefined;
}): SupabaseTargetCheck {
  const expectedProjectRef = getSupabaseProjectRef(params.supabaseUrl);
  const databaseProjectRef = getDatabaseProjectRef(params.databaseUrl);
  const hasPlaceholder = /(?:%5b|\[)(?:ref|password)(?:%5d|\])/i.test(params.databaseUrl ?? "");

  if (!expectedProjectRef) {
    return {
      expectedProjectRef,
      databaseProjectRef,
      matches: false,
      reason: "NEXT_PUBLIC_SUPABASE_URL est absent ou invalide.",
    };
  }
  if (hasPlaceholder) {
    return {
      expectedProjectRef,
      databaseProjectRef,
      matches: false,
      reason: "La connexion PostgreSQL contient encore les placeholders [ref] ou [password].",
    };
  }
  if (!databaseProjectRef) {
    return {
      expectedProjectRef,
      databaseProjectRef,
      matches: false,
      reason: "La connexion PostgreSQL ne permet pas d'identifier le projet Supabase ciblé.",
    };
  }
  if (expectedProjectRef !== databaseProjectRef) {
    return {
      expectedProjectRef,
      databaseProjectRef,
      matches: false,
      reason: `La connexion PostgreSQL cible ${databaseProjectRef}, mais l'application utilise ${expectedProjectRef}.`,
    };
  }

  return { expectedProjectRef, databaseProjectRef, matches: true, reason: null };
}

export function assertSupabaseDatabaseTarget(params: {
  supabaseUrl: string | undefined;
  databaseUrl: string | undefined;
}) {
  const result = checkSupabaseDatabaseTarget(params);
  if (!result.matches) {
    throw new Error(
      `${result.reason} Récupérez DATABASE_URL et DIRECT_URL depuis « Connect » dans le projet Supabase actif.`,
    );
  }
  return result;
}
