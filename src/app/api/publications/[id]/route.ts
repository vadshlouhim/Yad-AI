import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  if (!profile?.communityId) {
    return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
  }

  const { data: publication } = await admin
    .from("Publication")
    .select("id, communityId, status")
    .eq("id", id)
    .eq("communityId", profile.communityId)
    .single();

  if (!publication) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }

  if (publication.status !== "PUBLISHED" && publication.status !== "FAILED") {
    return NextResponse.json(
      { error: "Seules les publications envoyées ou en échec peuvent être supprimées." },
      { status: 400 }
    );
  }

  const { error } = await admin.from("Publication").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
