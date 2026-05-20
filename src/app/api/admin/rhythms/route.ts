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

export async function GET() {
  const auth = await requireAdminGlobal();
  if (auth.error) return auth.error;

  const { data, error } = await auth.admin
    .from("CommunityRhythm")
    .select("*")
    .order("sortOrder", { ascending: true })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireAdminGlobal();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (name.length < 2) return NextResponse.json({ error: "Nom trop court" }, { status: 400 });

  const slug = slugify(String(body.slug ?? name));
  if (!slug) return NextResponse.json({ error: "Slug invalide" }, { status: 400 });

  const { data, error } = await auth.admin
    .from("CommunityRhythm")
    .insert({
      id: `rhythm_${crypto.randomUUID()}`,
      name,
      slug,
      description: body.description ? String(body.description).trim() : null,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      sortOrder: Number(body.sortOrder ?? 100),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
