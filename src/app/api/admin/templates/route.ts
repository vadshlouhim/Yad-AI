import { canAccessAdmin } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { classifyTemplateAdminError } from "@/lib/templates/admin-errors";
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

function normalizeDesign(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 80).map((zone, index) => {
    const item = zone && typeof zone === "object" ? zone as Record<string, unknown> : {};
    const id = String(item.id ?? `zone_${crypto.randomUUID()}`);

    return {
      id,
      label: String(item.label ?? `Zone ${index + 1}`).trim() || `Zone ${index + 1}`,
      variableKey: String(item.variableKey ?? item.type ?? "MESSAGE").trim() || "MESSAGE",
      variableType: String(item.variableType ?? "TEXT").trim() || "TEXT",
      defaultText: String(item.defaultText ?? "").trim(),
      x: Number(item.x ?? 10),
      y: Number(item.y ?? 10),
      width: Number(item.width ?? 50),
      height: Number(item.height ?? 12),
      align: String(item.align ?? "center"),
      fontSize: Number(item.fontSize ?? 42),
      color: String(item.color ?? "#111827"),
      fontFamily: String(item.fontFamily ?? "Arial, Helvetica, sans-serif"),
      overflow: String(item.overflow ?? "shrink"),
      locked: Boolean(item.locked),
    };
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non autorisé", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  if (!(await canManageAdminTemplates(user.id))) {
    return NextResponse.json(
      { error: "Accès réservé à l'admin global", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const name = String(body.name ?? "Nouvelle affiche").trim();
  const category = TEMPLATE_CATEGORIES.has(body.category) ? body.category : "GENERAL";
  const now = new Date().toISOString();

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Le nom de l'affiche est trop court", code: "INVALID_REQUEST" },
      { status: 400 },
    );
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
      originalUrl: body.originalUrl ? String(body.originalUrl).trim() : null,
      thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl).trim() : null,
      previewUrl: body.previewUrl ? String(body.previewUrl).trim() : null,
      design: normalizeDesign(body.design),
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
    console.error("[Admin Templates] Création impossible:", error);
    const apiError = classifyTemplateAdminError(error, "TEMPLATE_CREATE_FAILED");
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.status },
    );
  }

  return NextResponse.json(template, { status: 201 });
}
