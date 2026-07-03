import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPaidFeature } from "@/lib/billing";

const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

async function getCommunityId(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  return (data as { communityId?: string } | null)?.communityId ?? null;
}

function sanitizePairingPhone(value: unknown) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

export async function POST(request: Request) {
  if (!SERVICE_URL || !SERVICE_SECRET) {
    return NextResponse.json({ error: "Service WhatsApp non configure." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const communityId = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communaute introuvable" }, { status: 403 });

  const admin = createAdminClient();
  const paid = await assertPaidFeature(
    admin,
    user.id,
    "whatsapp",
    "WhatsApp est reserve au mode payant. Passez a l'abonnement pour connecter votre numero."
  );
  if (!paid.ok) return paid.response;

  const body = await request.json().catch(() => ({}));
  const phoneNumber = sanitizePairingPhone((body as { phoneNumber?: unknown }).phoneNumber);
  if (phoneNumber.length < 8) {
    return NextResponse.json(
      { error: "Saisissez un numero WhatsApp au format international, par exemple 33612345678." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${SERVICE_URL.replace(/\/$/, "")}/session/${communityId}/pairing-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-secret": SERVICE_SECRET,
      },
      body: JSON.stringify({ phoneNumber }),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: (data as { error?: string } | null)?.error ?? "Generation du code impossible." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service WhatsApp inaccessible.";
    return NextResponse.json({ status: "error", error: message }, { status: 503 });
  }
}
