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

  try {
    // Appel court (5 s max) : on demande juste ce qui est disponible maintenant
    const res = await fetch(`${SERVICE_URL}/session/${communityId}/qr-instant`, {
      headers: { "x-service-secret": SERVICE_SECRET },
      signal: AbortSignal.timeout(5_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[WhatsApp QR] Erreur proxy :", err);
    return NextResponse.json({ error: "Service WhatsApp injoignable." }, { status: 502 });
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

  try {
    // Démarre la session en arrière-plan sans attendre le QR
    await fetch(`${SERVICE_URL}/session/${communityId}/start`, {
      method: "POST",
      headers: { "x-service-secret": SERVICE_SECRET },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // On ignore l'erreur réseau — la session démarre quand même
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
