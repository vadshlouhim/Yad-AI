import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { NextResponse } from "next/server";

async function requireAdminGlobal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", user.id).single();
  if (!canAccessAdmin(profile)) return { error: NextResponse.json({ error: "Accès réservé à l'admin global" }, { status: 403 }) };

  return { admin, user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminGlobal();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) return NextResponse.json({ error: "Nom trop court" }, { status: 400 });
    updateData.name = name;
  }
  if (body.slug !== undefined) {
    const slug = slugify(String(body.slug));
    if (!slug) return NextResponse.json({ error: "Slug invalide" }, { status: 400 });
    updateData.slug = slug;
  }
  if (body.description !== undefined) updateData.description = String(body.description).trim() || null;
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder) || 0;

  const { data, error } = await auth.admin.from("CommunityRhythm").update(updateData).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminGlobal();
  if (auth.error) return auth.error;

  const { id } = await params;
  const { count } = await auth.admin
    .from("Community")
    .select("id", { count: "exact", head: true })
    .eq("rhythmId", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Ce rythme est utilisé par des comptes clients. Désactivez-le plutôt que de le supprimer.", usageCount: count },
      { status: 409 }
    );
  }

  const { error } = await auth.admin.from("CommunityRhythm").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
