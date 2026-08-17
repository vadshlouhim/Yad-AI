import { NextResponse } from "next/server";
import { requireTargetedCommunity } from "@/lib/targeted-communication/auth";

export async function POST(request: Request) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Le nom doit contenir entre 2 et 80 caractères." }, { status: 400 });

  const { data: last } = await context.db.from("TargetedCategory")
    .select("sortOrder")
    .eq("communityId", context.communityId)
    .order("sortOrder", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = Number((last as { sortOrder?: number } | null)?.sortOrder ?? -1) + 1;
  const { data, error } = await context.db.from("TargetedCategory").insert({
    id: crypto.randomUUID(),
    communityId: context.communityId,
    name,
    sortOrder,
    isActive: true,
    updatedAt: new Date().toISOString(),
  }).select("id,name,sortOrder,isActive").single();
  if (error) {
    const duplicate = error.code === "23505";
    const missingTable = error.code === "PGRST205" || error.code === "42P01" || /schema cache|does not exist/i.test(error.message);
    return NextResponse.json(
      {
        error: duplicate
          ? "Cette catégorie existe déjà."
          : missingTable
            ? "La base de données du module n’est pas encore activée. Appliquez la migration Communication ciblée."
            : "Impossible de créer la catégorie. Réessayez dans quelques instants.",
        code: missingTable ? "TARGETED_MODULE_NOT_MIGRATED" : undefined,
      },
      { status: duplicate ? 409 : missingTable ? 503 : 500 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { ids?: unknown };
  if (!Array.isArray(body.ids) || body.ids.length > 100) return NextResponse.json({ error: "Ordre invalide." }, { status: 400 });
  const ids = body.ids.filter((id): id is string => typeof id === "string");
  const { data: owned } = await context.db.from("TargetedCategory").select("id").eq("communityId", context.communityId).in("id", ids);
  if ((owned ?? []).length !== ids.length) return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
  const now = new Date().toISOString();
  const results = await Promise.all(ids.map((id, sortOrder) => context.db.from("TargetedCategory").update({ sortOrder, updatedAt: now }).eq("id", id).eq("communityId", context.communityId)));
  const failure = results.find((result) => result.error);
  if (failure?.error) return NextResponse.json({ error: failure.error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
