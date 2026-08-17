import { NextResponse } from "next/server";
import { requireTargetedCommunity } from "@/lib/targeted-communication/auth";
import { isHexColor } from "@/lib/targeted-communication/core";

const DEFAULT_TITLE = "Choisissez les informations qui vous intéressent";
const DEFAULT_INTRODUCTION = "Recevez uniquement les messages utiles, directement sur WhatsApp.";

export async function GET() {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { communityId, db } = context;

  const [communityResult, settingsResult, categoriesResult, automationsResult] = await Promise.all([
    db.from("Community").select("name,slug,logoUrl,address,timezone").eq("id", communityId).single(),
    db.from("TargetedPageSettings").select("*").eq("communityId", communityId).maybeSingle(),
    db.from("TargetedCategory").select("id,name,sortOrder,isActive").eq("communityId", communityId).order("sortOrder"),
    db.from("TargetedAutomation")
      .select("*,category:TargetedCategory(name),occurrences:TargetedOccurrence(id,scheduledFor,status,messageOverride,eventTimeOverride)")
      .eq("communityId", communityId)
      .order("createdAt", { ascending: false }),
  ]);

  if (communityResult.error || !communityResult.data) {
    return NextResponse.json({ error: "Communauté introuvable" }, { status: 404 });
  }

  const moduleError = settingsResult.error || categoriesResult.error || automationsResult.error;
  if (moduleError) {
    const missingTable = moduleError.code === "PGRST205" || moduleError.code === "42P01" || /schema cache|does not exist/i.test(moduleError.message);
    return NextResponse.json(
      {
        error: missingTable
          ? "Le module Communication ciblée n’est pas encore activé dans la base de données. Appliquez la migration avant de créer une catégorie."
          : "Impossible de charger Communication ciblée.",
        code: missingTable ? "TARGETED_MODULE_NOT_MIGRATED" : "TARGETED_MODULE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  const community = communityResult.data as unknown as { name: string; slug: string; logoUrl: string | null; address: string | null; timezone: string };
  const settings = settingsResult.data as unknown as Record<string, unknown> | null;
  const automations = ((automationsResult.data ?? []) as unknown as Array<Record<string, unknown>>).map((automation) => ({
    ...automation,
    categoryName: (automation.category as { name?: string } | null)?.name ?? "Catégorie supprimée",
    occurrences: ((automation.occurrences as Array<Record<string, unknown>> | null) ?? [])
      .filter((occurrence) => ["PENDING", "AWAITING_VALIDATION"].includes(String(occurrence.status)))
      .sort((left, right) => String(left.scheduledFor).localeCompare(String(right.scheduledFor))),
  }));

  return NextResponse.json({
    community,
    settings: {
      isActive: settings?.isActive !== false,
      displayName: String(settings?.displayName ?? community.name),
      logoUrl: String(settings?.logoUrl ?? community.logoUrl ?? ""),
      title: String(settings?.title ?? DEFAULT_TITLE),
      introduction: String(settings?.introduction ?? DEFAULT_INTRODUCTION),
      primaryColor: String(settings?.primaryColor ?? "#421388"),
      accentColor: String(settings?.accentColor ?? "#14b8a6"),
    },
    categories: categoriesResult.data ?? [],
    automations,
  });
}

export async function PATCH(request: Request) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const introduction = String(body.introduction ?? "").trim();
  const primaryColor = isHexColor(body.primaryColor) ? body.primaryColor : "#421388";
  const accentColor = isHexColor(body.accentColor) ? body.accentColor : "#14b8a6";
  if (title.length < 3 || title.length > 120 || introduction.length > 500) {
    return NextResponse.json({ error: "Le titre ou le texte d’introduction est invalide." }, { status: 400 });
  }

  const row = {
    id: crypto.randomUUID(),
    communityId: context.communityId,
    isActive: body.isActive !== false,
    displayName: String(body.displayName ?? "").trim().slice(0, 100) || null,
    logoUrl: String(body.logoUrl ?? "").trim().slice(0, 1000) || null,
    title,
    introduction,
    primaryColor,
    accentColor,
    updatedAt: new Date().toISOString(),
  };
  const { data, error } = await context.db.from("TargetedPageSettings")
    .upsert(row, { onConflict: "communityId" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
