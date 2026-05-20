import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { NextResponse } from "next/server";

const TEMPLATE_CATEGORIES = new Set<Database["public"]["Enums"]["TemplateCategory"]>([
  "SHABBAT",
  "HOLIDAY",
  "EVENT",
  "COURSE",
  "ANNOUNCEMENT",
  "RECAP",
  "GREETING",
  "GENERAL",
]);

async function canManageAdminTemplates(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", userId).single();
  return canAccessAdmin(profile);
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 30);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  if (!(await canManageAdminTemplates(user.id))) {
    return NextResponse.json({ error: "Acces reserve a l'admin global" }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name ?? "Nouvelle affiche").trim();
  const category = TEMPLATE_CATEGORIES.has(body.category) ? body.category : "GENERAL";
  const now = new Date().toISOString();

  if (name.length < 2) {
    return NextResponse.json({ error: "Le nom de l'affiche est trop court" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: template, error } = await admin
    .from("Template")
    .insert({
      id: `template_${crypto.randomUUID()}`,
      name,
      description: body.description ? String(body.description).trim() : null,
      category,
      subCategory: body.subCategory ? String(body.subCategory).trim() : null,
      channelType: body.channelType || null,
      thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl).trim() : null,
      previewUrl: body.previewUrl ? String(body.previewUrl).trim() : null,
      design: [],
      isGlobal: body.isGlobal === undefined ? true : Boolean(body.isGlobal),
      isPremium: Boolean(body.isPremium),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      tags: normalizeTags(body.tags),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(template, { status: 201 });
}
