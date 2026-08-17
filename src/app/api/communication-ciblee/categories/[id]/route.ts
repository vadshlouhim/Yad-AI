import { NextResponse } from "next/server";
import { requireTargetedCommunity } from "@/lib/targeted-communication/auth";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
    update.name = name;
  }
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);
  const { data, error } = await context.db.from("TargetedCategory").update(update).eq("id", id).eq("communityId", context.communityId).select("id,name,sortOrder,isActive").maybeSingle();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Cette catégorie existe déjà." : error.message }, { status: error.code === "23505" ? 409 : 500 });
  if (!data) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Context) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const { count } = await context.db.from("TargetedAutomation").select("id", { count: "exact", head: true }).eq("communityId", context.communityId).eq("categoryId", id);
  if ((count ?? 0) > 0) return NextResponse.json({ error: "Désactivez ou supprimez d’abord les automatisations liées à cette catégorie." }, { status: 409 });
  const { error } = await context.db.from("TargetedCategory").delete().eq("id", id).eq("communityId", context.communityId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
