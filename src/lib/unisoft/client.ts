import "server-only";

const DEFAULT_BASE_URL = "https://api.kehila.syn-assist.fr/integrations/v1";
const PAGE_SIZE = 200;
const MAX_PAGES = 100;

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function recordsFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const value = object(payload);
  for (const key of ["contacts", "items", "results", "data"]) {
    if (Array.isArray(value[key])) return value[key] as unknown[];
    if (value[key] && typeof value[key] === "object") {
      const nested = recordsFromPayload(value[key]);
      if (nested.length) return nested;
    }
  }
  return [];
}

function pageInfo(payload: unknown, received: number) {
  const value = object(payload);
  const meta = object(value.meta ?? value.pagination);
  const nextCursor = typeof meta.nextCursor === "string" && meta.nextCursor.trim()
    ? meta.nextCursor.trim()
    : typeof meta.next_cursor === "string" && meta.next_cursor.trim()
      ? meta.next_cursor.trim()
      : null;
  const explicitHasMore = meta.hasMore ?? meta.has_more;

  return {
    hasMore: typeof explicitHasMore === "boolean" ? explicitHasMore : received >= PAGE_SIZE,
    nextCursor,
  };
}

async function unisoftError(response: Response) {
  const raw = (await response.text()).slice(0, 500);
  let detail = raw;
  try {
    const payload = object(JSON.parse(raw));
    detail = String(payload.message ?? payload.error ?? raw).trim();
  } catch {
    // The response is not JSON; keep its text as the diagnostic detail.
  }

  if (response.status === 401) return new Error("Clé API Unisoft absente ou invalide.");
  if (response.status === 403) return new Error("La clé API Unisoft ne possède pas le droit contacts:read.");
  return new Error(`Unisoft a répondu ${response.status}${detail ? ` : ${detail}` : ""}`);
}

function connectionError(error: unknown, origin: string) {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new Error(`L’API Unisoft (${origin}) n’a pas répondu dans les 30 secondes.`);
  }
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
  const detail = cause || (error instanceof Error ? error.message : "erreur réseau inconnue");
  return new Error(`Impossible de contacter l’API Unisoft (${origin}) : ${detail}`);
}

export async function fetchUnisoftContacts(apiKey: string) {
  const contacts: unknown[] = [];
  const baseUrl = process.env.UNISOFT_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE_URL;
  let cursor: string | null = null;
  const seenCursors = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL(`${baseUrl}/contacts`);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (cursor) url.searchParams.set("cursor", cursor);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      throw connectionError(error, url.origin);
    }

    if (!response.ok) throw await unisoftError(response);

    const payload: unknown = await response.json();
    const pageContacts = recordsFromPayload(payload);
    contacts.push(...pageContacts);
    const { hasMore, nextCursor } = pageInfo(payload, pageContacts.length);
    if (!hasMore) return contacts;
    if (!nextCursor || seenCursors.has(nextCursor)) {
      throw new Error("La pagination retournée par Unisoft est incomplète ou répétée.");
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  throw new Error(`La synchronisation Unisoft dépasse la limite de ${MAX_PAGES * PAGE_SIZE} contacts.`);
}

export async function testUnisoftConnection(apiKey: string) {
  const contacts = await fetchUnisoftContacts(apiKey);
  return { ok: true, contactCount: contacts.length };
}
