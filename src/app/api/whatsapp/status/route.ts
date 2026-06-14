import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  const communityId = (profile as { communityId?: string } | null)?.communityId;
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  // Vérifie si le mode personnel est activé dans les réglages du canal
  const { data: channel } = await (admin as ReturnType<typeof createAdminClient> & { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> })
    .from("Channel")
    .select("settings")
    .eq("communityId", communityId)
    .eq("type", "WHATSAPP")
    .maybeSingle();

  const settings = (channel?.settings as Record<string, unknown> | null) ?? {};
  const mode = settings.mode as string | undefined;

  if (mode !== "personal" || !SERVICE_URL || !SERVICE_SECRET) {
    return NextResponse.json({ mode: mode ?? "cloud", status: "disconnected" });
  }

  try {
    const res = await fetch(`${SERVICE_URL}/session/${communityId}/status`, {
      headers: { "x-service-secret": SERVICE_SECRET },
      signal: AbortSignal.timeout(5_000),
    });
    const data = await res.json() as { status: string };
    return NextResponse.json({ mode: "personal", status: data.status });
  } catch {
    return NextResponse.json({ mode: "personal", status: "unreachable" });
  }
}

// POST → bascule le canal en mode "personal" et persiste dans Supabase
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  const communityId = (profile as { communityId?: string } | null)?.communityId;
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  // Upsert le canal WHATSAPP en mode personal
  const db = admin as ReturnType<typeof createAdminClient> & { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };
  const { data: existing } = await db.from("Channel").select("id").eq("communityId", communityId).eq("type", "WHATSAPP").maybeSingle();

  if (existing) {
    await db.from("Channel").update({ settings: { mode: "personal" }, isActive: true }).eq("id", (existing as { id: string }).id);
  } else {
    await db.from("Channel").insert({
      id: crypto.randomUUID(),
      communityId,
      type: "WHATSAPP",
      name: "WhatsApp Personnel",
      isActive: true,
      isConnected: false,
      settings: { mode: "personal" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, mode: "personal" });
}
