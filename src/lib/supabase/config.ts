const SUPABASE_PLACEHOLDER_HOSTS = new Set([
  "xxx.supabase.co",
  "xxxxxxxxxxxx.supabase.co",
]);

function isValidSupabaseUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (SUPABASE_PLACEHOLDER_HOSTS.has(hostname)) return false;
    if (hostname.includes("xxxx")) return false;

    return (
      hostname.endsWith(".supabase.co") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function isValidSupabaseKey(value: string | undefined): boolean {
  if (!value) return false;
  if (value.includes("xxx")) return false;

  return value.length > 100;
}

export function isSupabaseConfigured(): boolean {
  return (
    isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isValidSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
