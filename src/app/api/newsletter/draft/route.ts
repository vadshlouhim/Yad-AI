import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_DRAFT_BYTES = 300_000;

function draftId(communityId: string, marker: string) {
  const hash = createHash("sha256").update(`${communityId}:${marker}`).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanLegacyFields(draft: Record<string, unknown>) {
  const cleanDraft = { ...draft };
  delete cleanDraft.sichaUrl;
  delete cleanDraft.ravTheme;
  delete cleanDraft.studies;
  if (isRecord(cleanDraft.enabled)) {
    const enabled = { ...cleanDraft.enabled };
    delete enabled.sicha;
    cleanDraft.enabled = enabled;
  }
  if (isRecord(cleanDraft.generated)) {
    const generated = { ...cleanDraft.generated };
    delete generated.sichaTitle;
    delete generated.sichaExcerpt;
    delete generated.sichaUrl;
    cleanDraft.generated = generated;
  }
  return cleanDraft;
}

function draftLocale(request: Request) {
  const value = new URL(request.url).searchParams.get("locale");
  return value === "he" ? "he" : "fr";
}

async function getDraftContext(locale: "fr" | "he") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  if (!profile?.communityId) {
    return { error: NextResponse.json({ error: "Communauté introuvable" }, { status: 403 }) };
  }

  return {
    admin,
    communityId: profile.communityId,
    // Keep the historical marker for French so the existing "Le Chabaton"
    // draft is read unchanged. Other locales have an isolated row.
    marker: locale === "fr"
      ? `newsletter-paper-autosave:${user.id}`
      : `newsletter-paper-autosave:${user.id}:${locale}`,
  };
}

export async function GET(request: Request) {
  const context = await getDraftContext(draftLocale(request));
  if ("error" in context) return context.error;

  const { data, error } = await context.admin
    .from("ContentDraft")
    .select("id, body, updatedAt")
    .eq("communityId", context.communityId)
    .eq("contentType", "COMMUNITY_NEWS")
    .eq("status", "DRAFT")
    .eq("aiPromptUsed", context.marker)
    .order("updatedAt", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[Newsletter Draft GET]", error.code, error.message);
    return NextResponse.json({ error: "Chargement du brouillon impossible" }, { status: 500 });
  }
  const row = data?.[0];
  if (!row) return NextResponse.json({ draft: null });

  try {
    const draft = JSON.parse(row.body) as unknown;
    return NextResponse.json({ draft: isRecord(draft) ? cleanLegacyFields(draft) : null, updatedAt: row.updatedAt });
  } catch {
    return NextResponse.json({ draft: null, updatedAt: row.updatedAt });
  }
}

export async function PUT(request: Request) {
  const locale = draftLocale(request);
  const context = await getDraftContext(locale);
  if ("error" in context) return context.error;

  const body = await request.json().catch(() => null) as { draft?: unknown; expectedUpdatedAt?: unknown } | null;
  if (!isRecord(body?.draft)) {
    return NextResponse.json({ error: "Brouillon invalide" }, { status: 400 });
  }
  if (body.draft.outputLocale !== locale) {
    return NextResponse.json({ error: "Langue du brouillon invalide" }, { status: 400 });
  }

  const cleanedDraft = cleanLegacyFields(body.draft);
  const serialized = JSON.stringify(cleanedDraft);
  if (new TextEncoder().encode(serialized).byteLength > MAX_DRAFT_BYTES) {
    return NextResponse.json({ error: "Brouillon trop volumineux" }, { status: 413 });
  }

  const { data: existing, error: lookupError } = await context.admin
    .from("ContentDraft")
    .select("id, updatedAt")
    .eq("communityId", context.communityId)
    .eq("contentType", "COMMUNITY_NEWS")
    .eq("status", "DRAFT")
    .eq("aiPromptUsed", context.marker)
    .order("updatedAt", { ascending: false })
    .limit(1);

  if (lookupError) {
    console.error("[Newsletter Draft lookup]", lookupError.code, lookupError.message);
    return NextResponse.json({ error: "Sauvegarde impossible" }, { status: 500 });
  }

  const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : null;
  if ((existing?.[0]?.updatedAt ?? null) !== expectedUpdatedAt) {
    return NextResponse.json({ error: "Ce brouillon a été modifié sur un autre appareil.", updatedAt: existing?.[0]?.updatedAt ?? null }, { status: 409 });
  }

  const now = new Date().toISOString();
  if (existing?.[0]) {
    const { data, error } = await context.admin
      .from("ContentDraft")
      .update({
        title: typeof cleanedDraft.title === "string" ? cleanedDraft.title.slice(0, 120) : "Newsletter en cours",
        body: serialized,
        updatedAt: now,
      })
      .eq("id", existing[0].id)
      .eq("communityId", context.communityId)
      .eq("updatedAt", existing[0].updatedAt)
      .select("updatedAt")
      .maybeSingle();

    if (error) {
      console.error("[Newsletter Draft UPDATE]", error.code, error.message);
      return NextResponse.json({ error: "Sauvegarde impossible" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Ce brouillon a été modifié sur un autre appareil." }, { status: 409 });
    return NextResponse.json({ saved: true, updatedAt: data.updatedAt });
  }

  const { data, error } = await context.admin
    .from("ContentDraft")
    .insert({
      id: draftId(context.communityId, context.marker),
      communityId: context.communityId,
      eventId: null,
      title: typeof cleanedDraft.title === "string" ? cleanedDraft.title.slice(0, 120) : "Newsletter en cours",
      body: serialized,
      hashtags: [],
      status: "DRAFT",
      contentType: "COMMUNITY_NEWS",
      aiGenerated: false,
      aiPromptUsed: context.marker,
      updatedAt: now,
    })
    .select("updatedAt")
    .single();

  if (error?.code === "23505") return NextResponse.json({ error: "Ce brouillon a été créé sur un autre appareil." }, { status: 409 });
  if (error) {
    console.error("[Newsletter Draft INSERT]", error.code, error.message);
    return NextResponse.json({ error: "Sauvegarde impossible" }, { status: 500 });
  }
  return NextResponse.json({ saved: true, updatedAt: data.updatedAt }, { status: 201 });
}
