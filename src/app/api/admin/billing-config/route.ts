import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdmin } from "@/lib/admin-access";
import { DEFAULT_BILLING_CONFIG, getBillingConfig } from "@/lib/billing";

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

  await request.json().catch(() => ({}));
  return NextResponse.json({
    config: DEFAULT_BILLING_CONFIG,
    message: "Tarification centralisée : 9,99 € TTC le premier mois, puis 19,99 € TTC/mois.",
  });
}
