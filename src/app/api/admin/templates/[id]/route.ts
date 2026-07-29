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
  return canAccessAdmin(profile);
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 30);
}

function normalizePercent(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(100, Math.max(0, numeric));
}

function normalizeDesign(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  return value.slice(0, 80).map((zone, index) => {
    const item = zone && typeof zone === "object" ? zone as Record<string, unknown> : {};
    const id = String(item.id ?? `zone_${crypto.randomUUID()}`);
    const width = Math.max(1, normalizePercent(item.width, 40));
    const height = Math.max(1, normalizePercent(item.height, 10));

    return {
      id,
      label: String(item.label ?? `Zone ${index + 1}`).trim() || `Zone ${index + 1}`,
      variableKey: String(item.variableKey ?? item.type ?? "MESSAGE").trim() || "MESSAGE",
      variableType: String(item.variableType ?? "TEXT").trim() || "TEXT",
      defaultText: String(item.defaultText ?? "").trim(),
      x: Math.min(100 - width, normalizePercent(item.x, 10)),
      y: Math.min(100 - height, normalizePercent(item.y, 10)),
      width,
      height,
      align: ["left", "center", "right"].includes(String(item.align)) ? String(item.align) : "center",
      fontSize: Math.min(180, Math.max(8, Number(item.fontSize ?? 42))),
      color: String(item.color ?? "#111827"),
      fontFamily: String(item.fontFamily ?? "Arial, Helvetica, sans-serif"),
      overflow: ["shrink", "wrap", "truncate", "hide"].includes(String(item.overflow)) ? String(item.overflow) : "shrink",
      locked: Boolean(item.locked),
    };
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé", code: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!(await isSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Accès réservé à l'admin global", code: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Le nom de l'affiche est trop court", code: "INVALID_REQUEST" }, { status: 400 });
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
      return NextResponse.json({ error: "Catégorie invalide", code: "INVALID_REQUEST" }, { status: 400 });
    }
    updateData.category = body.category;
  }

  if (body.channelType !== undefined) {
    if (body.channelType && !CHANNEL_TYPES.has(body.channelType)) {
      return NextResponse.json({ error: "Canal invalide", code: "INVALID_REQUEST" }, { status: 400 });
    }
    updateData.channelType = body.channelType || null;
  }

  if (body.originalUrl !== undefined) {
    const originalUrl = String(body.originalUrl).trim();
    updateData.originalUrl = originalUrl.length > 0 ? originalUrl : null;
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

  const design = normalizeDesign(body.design);
  if (design) updateData.design = design;

  for (const field of ["isGlobal", "isActive", "isPremium"] as const) {
    if (body[field] !== undefined) updateData[field] = Boolean(body[field]);
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin.from("Template").update(updateData).eq("id", id).select().single();

  if (error) {
    console.error("[Admin Templates] Mise à jour impossible:", error);
    const apiError = classifyTemplateAdminError(error, "TEMPLATE_UPDATE_FAILED");
    return NextResponse.json({ error: apiError.error, code: apiError.code }, { status: apiError.status });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé", code: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!(await isSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Accès réservé à l'admin global", code: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("Template").delete().eq("id", id);

  if (error) {
    console.error("[Admin Templates] Suppression impossible:", error);
    const apiError = classifyTemplateAdminError(error, "TEMPLATE_DELETE_FAILED");
    return NextResponse.json({ error: apiError.error, code: apiError.code }, { status: apiError.status });
  }

  return NextResponse.json({ success: true });
}
