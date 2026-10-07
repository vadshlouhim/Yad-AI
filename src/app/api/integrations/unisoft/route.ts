import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageCommunity, getCommunityApiContext } from "@/lib/auth/community-api";
import { encryptIntegrationSecret } from "@/lib/security/integration-secrets";
import { testUnisoftConnection } from "@/lib/unisoft/client";

function adminClient() {
  return createAdminClient() as ReturnType<typeof createAdminClient> & { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };
}

export async function GET() {
  const context = await getCommunityApiContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { data, error } = await adminClient().from("CommunityIntegration")
    .select("isActive, lastSyncAt, lastSyncStatus, lastSyncError, lastSyncReport, updatedAt")
    .eq("communityId", context.communityId).eq("provider", "UNISOFT").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connected: Boolean(data?.isActive), ...data });
}

export async function POST(request: Request) {
  const context = await getCommunityApiContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!canManageCommunity(context.role)) return NextResponse.json({ error: "Seul un administrateur peut connecter Unisoft." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { apiKey?: string };
  const apiKey = body.apiKey?.trim();
  if (!apiKey) return NextResponse.json({ error: "Clé API Unisoft manquante." }, { status: 400 });
  try {
    const test = await testUnisoftConnection(apiKey);
    const admin = adminClient();
    const { data: existing } = await admin.from("CommunityIntegration").select("id").eq("communityId", context.communityId).eq("provider", "UNISOFT").maybeSingle();
    const values = { encryptedSecret: encryptIntegrationSecret(apiKey), isActive: true, lastSyncStatus: "connected", lastSyncError: null, updatedAt: new Date().toISOString() };
    const query = existing
      ? admin.from("CommunityIntegration").update(values).eq("id", existing.id)
      : admin.from("CommunityIntegration").insert({ id: crypto.randomUUID(), communityId: context.communityId, provider: "UNISOFT", ...values });
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ connected: true, ...test });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Connexion Unisoft impossible." }, { status: 400 });
  }
}

export async function DELETE() {
  const context = await getCommunityApiContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!canManageCommunity(context.role)) return NextResponse.json({ error: "Action réservée aux administrateurs." }, { status: 403 });
  const { error } = await adminClient().from("CommunityIntegration").delete().eq("communityId", context.communityId).eq("provider", "UNISOFT");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connected: false });
}
