import { isAdminEmail } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database.types";

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

const CHANNEL_TYPES = new Set<Database["public"]["Enums"]["ChannelType"]>([
  "FACEBOOK",
  "INSTAGRAM",
  "WHATSAPP",
  "TELEGRAM",
  "EMAIL",
  "WEB",
]);

async function isSuperAdmin(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("email, role").eq("id", userId).single();
  return profile?.role === "SUPER_ADMIN" || isAdminEmail(profile?.email);
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 30);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!(await isSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Accès réservé au super-admin" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Le nom de l'affiche est trop court" }, { status: 400 });
    }
    updateData.name = name;
  }

  if (body.description !== undefined) {
    const description = String(body.description).trim();
    updateData.description = description.length > 0 ? description : null;
  }

  if (body.subCategory !== undefined) {
    const subCategory = String(body.subCategory).trim();
    updateData.subCategory = subCategory.length > 0 ? subCategory : null;
  }

  if (body.category !== undefined) {
    if (!TEMPLATE_CATEGORIES.has(body.category)) {
      return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    }
    updateData.category = body.category;
  }

  if (body.channelType !== undefined) {
    if (body.channelType && !CHANNEL_TYPES.has(body.channelType)) {
      return NextResponse.json({ error: "Canal invalide" }, { status: 400 });
    }
    updateData.channelType = body.channelType || null;
  }

  if (body.thumbnailUrl !== undefined) {
    const thumbnailUrl = String(body.thumbnailUrl).trim();
    updateData.thumbnailUrl = thumbnailUrl.length > 0 ? thumbnailUrl : null;
  }

  if (body.previewUrl !== undefined) {
    const previewUrl = String(body.previewUrl).trim();
    updateData.previewUrl = previewUrl.length > 0 ? previewUrl : null;
  }

  const tags = normalizeTags(body.tags);
  if (tags) updateData.tags = tags;

  for (const field of ["isGlobal", "isActive", "isPremium"] as const) {
    if (body[field] !== undefined) updateData[field] = Boolean(body[field]);
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin.from("Template").update(updateData).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!(await isSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Accès réservé au super-admin" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("Template").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
