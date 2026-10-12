import { NextResponse } from "next/server";
import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  return canAccessAdmin(profile) ? admin : null;
}

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  const { data, error } = await admin
    .from("community_listing_reports")
    .select("*, listing:community_listings(id, title, status, ownerUserId), reporter:profiles!community_listing_reports_reporterUserId_fkey(name, email)")
    .order("createdAt", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  const body = await request.json() as { reportId?: string; action?: "dismiss" | "hide" };
  if (!body.reportId || !body.action || !["dismiss", "hide"].includes(body.action)) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }
  const { data: report } = await admin.from("community_listing_reports").select("listingId").eq("id", body.reportId).maybeSingle();
  if (!report) return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });
  if (body.action === "hide") {
    const { error } = await admin.from("community_listings").update({ status: "hidden", updatedAt: new Date().toISOString() }).eq("id", report.listingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const { error } = await admin.from("community_listing_reports").update({ status: body.action === "hide" ? "actioned" : "dismissed", updatedAt: new Date().toISOString() }).eq("id", body.reportId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
