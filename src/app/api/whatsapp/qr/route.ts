import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

async function getCommunityId(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  return (data as { communityId?: string } | null)?.communityId ?? null;
}

// GET → retourne immédiatement le statut + QR si disponible (pas de long-poll)
export async function GET() {
  if (!SERVICE_URL || !SERVICE_SECRET) {
    return NextResponse.json(
      { error: "Service WhatsApp non configuré (WHATSAPP_SERVICE_URL manquant)." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const url = `${SERVICE_URL.replace(/\/$/, "")}/session/${communityId}/qr-instant`;
  try {
    const res = await fetch(url, {
      headers: { "x-service-secret": SERVICE_SECRET },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error(`[WhatsApp QR] Railway ${res.status} sur ${url}`);
      return NextResponse.json({ status: "error", error: `Railway: HTTP ${res.status}` }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp QR] Fetch échoué vers ${url} :`, msg);
    // On retourne 200 avec un statut d'erreur pour que le client continue de poller
    return NextResponse.json({ status: "error", error: msg });
  }
}

// POST → démarre la session sur Railway (retourne immédiatement)
export async function POST() {
  if (!SERVICE_URL || !SERVICE_SECRET) {
    return NextResponse.json({ error: "Service non configuré." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const url = `${SERVICE_URL.replace(/\/$/, "")}/session/${communityId}/start`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "x-service-secret": SERVICE_SECRET },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    // On ignore : la session démarre côté Railway même si la réponse n'arrive pas
    console.warn("[WhatsApp QR/start] Timeout ignoré :", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}

// DELETE → déconnecte la session
export async function DELETE() {
  if (!SERVICE_URL || !SERVICE_SECRET) {
    return NextResponse.json({ error: "Service non configuré." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const admin = createAdminClient();
  await (admin as ReturnType<typeof createAdminClient> & { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> })
    .from("Channel")
    .update({ settings: {} })
    .eq("communityId", communityId)
    .eq("type", "WHATSAPP");

  try {
    await fetch(`${SERVICE_URL}/session/${communityId}`, {
      method: "DELETE",
      headers: { "x-service-secret": SERVICE_SECRET },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
