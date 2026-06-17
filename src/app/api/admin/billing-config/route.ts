import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdmin } from "@/lib/admin-access";
import { DEFAULT_BILLING_CONFIG, getBillingConfig, saveBillingConfig } from "@/lib/billing";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile as { email: string; role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER" } | null)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.json({ config: await getBillingConfig(admin) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile as { email: string; role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER" } | null)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const basePriceCents = eurosToCents(body.basePriceEuros, DEFAULT_BILLING_CONFIG.basePriceCents);
  const launchPriceCents = eurosToCents(body.launchPriceEuros, DEFAULT_BILLING_CONFIG.launchPriceCents);
  const launchEndsAt = typeof body.launchEndsAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.launchEndsAt)
    ? body.launchEndsAt
    : DEFAULT_BILLING_CONFIG.launchEndsAt;
  const launchMessage = typeof body.launchMessage === "string" && body.launchMessage.trim()
    ? body.launchMessage.trim()
    : DEFAULT_BILLING_CONFIG.launchMessage;

  try {
    const config = await saveBillingConfig(admin, {
      basePriceCents,
      launchPriceCents,
      currency: "EUR",
      taxLabel: "HT",
      launchEndsAt,
      launchMessage,
    });
    return NextResponse.json({ config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible d'enregistrer la tarification" },
      { status: 500 }
    );
  }
}

function eurosToCents(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric * 100);
}
