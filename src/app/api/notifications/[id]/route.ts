import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("Notification")
    .delete()
    .eq("id", id)
    .eq("userId", user.id)
    .select("id")
    .single();

  if (!data) return NextResponse.json({ error: "Notification introuvable" }, { status: 404 });
  return NextResponse.json({ success: true });
}

