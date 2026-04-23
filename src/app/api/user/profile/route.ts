import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

  const { data: updated, error } = await admin
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select()
    .single();

  if (error || !updated) return NextResponse.json({ error: "Mise à jour échouée" }, { status: 500 });

  return NextResponse.json(updated);
}
