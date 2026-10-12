import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_DRAFT_BYTES = 300_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function getDraftContext() {
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
    marker: `newsletter-paper-autosave:${user.id}`,
  };
}

export async function GET() {
  const context = await getDraftContext();
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

  if (error) return NextResponse.json({ error: "Chargement du brouillon impossible" }, { status: 500 });
  const row = data?.[0];
  if (!row) return NextResponse.json({ draft: null });

  try {
    const draft = JSON.parse(row.body) as unknown;
    return NextResponse.json({ draft: isRecord(draft) ? draft : null, updatedAt: row.updatedAt });
  } catch {
    return NextResponse.json({ draft: null, updatedAt: row.updatedAt });
  }
}

export async function PUT(request: Request) {
  const context = await getDraftContext();
  if ("error" in context) return context.error;

  const body = await request.json().catch(() => null) as { draft?: unknown } | null;
  if (!isRecord(body?.draft)) {
    return NextResponse.json({ error: "Brouillon invalide" }, { status: 400 });
  }

  const serialized = JSON.stringify(body.draft);
  if (new TextEncoder().encode(serialized).byteLength > MAX_DRAFT_BYTES) {
    return NextResponse.json({ error: "Brouillon trop volumineux" }, { status: 413 });
  }

  const { data: existing, error: lookupError } = await context.admin
    .from("ContentDraft")
    .select("id")
    .eq("communityId", context.communityId)
    .eq("contentType", "COMMUNITY_NEWS")
    .eq("status", "DRAFT")
    .eq("aiPromptUsed", context.marker)
    .order("updatedAt", { ascending: false })
    .limit(1);

  if (lookupError) return NextResponse.json({ error: "Sauvegarde impossible" }, { status: 500 });

  const now = new Date().toISOString();
  if (existing?.[0]) {
    const { data, error } = await context.admin
      .from("ContentDraft")
      .update({
        title: typeof body.draft.title === "string" ? body.draft.title.slice(0, 120) : "Newsletter en cours",
        body: serialized,
        updatedAt: now,
      })
      .eq("id", existing[0].id)
      .eq("communityId", context.communityId)
      .select("updatedAt")
      .single();

    if (error) return NextResponse.json({ error: "Sauvegarde impossible" }, { status: 500 });
    return NextResponse.json({ saved: true, updatedAt: data.updatedAt });
  }

  const { data, error } = await context.admin
    .from("ContentDraft")
    .insert({
      id: crypto.randomUUID(),
      communityId: context.communityId,
      eventId: null,
      title: typeof body.draft.title === "string" ? body.draft.title.slice(0, 120) : "Newsletter en cours",
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

  if (error) return NextResponse.json({ error: "Sauvegarde impossible" }, { status: 500 });
  return NextResponse.json({ saved: true, updatedAt: data.updatedAt }, { status: 201 });
}
