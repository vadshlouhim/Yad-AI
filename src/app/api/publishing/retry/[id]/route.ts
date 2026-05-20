import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryFailedPublication } from "@/lib/publishing/publisher";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { id } = await params;
  const { data: publication } = await admin
    .from("Publication")
    .select("id, status")
    .eq("id", id)
    .eq("communityId", profile.communityId)
    .single();

  if (!publication) return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  if (publication.status !== "FAILED") {
    return NextResponse.json({ error: "Seules les publications en échec peuvent être relancées" }, { status: 400 });
  }

  await retryFailedPublication(id);
  return NextResponse.json({ success: true });
}
