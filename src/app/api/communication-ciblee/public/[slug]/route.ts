import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { targetedDb } from "@/lib/targeted-communication/auth";
import { createPreferenceToken, hashPreferenceToken, normalizeTargetedPhone } from "@/lib/targeted-communication/core";

type Context = { params: Promise<{ slug: string }> };
type Row = Record<string, unknown>;

async function getPublicContext(slug: string) {
  const admin = createAdminClient();
  const db = targetedDb(admin);
  const { data: community } = await db.from("Community").select("id,name,slug,logoUrl,address").eq("slug", slug).maybeSingle();
  if (!community) return null;
  const communityId = String((community as Row).id);
  const [settingsResult, categoriesResult] = await Promise.all([
    db.from("TargetedPageSettings").select("*").eq("communityId", communityId).maybeSingle(),
    db.from("TargetedCategory").select("id,name,sortOrder").eq("communityId", communityId).eq("isActive", true).order("sortOrder"),
  ]);
  return {
    admin,
    db,
    community: community as Row,
    communityId,
    settings: settingsResult.data as Row | null,
    categories: (categoriesResult.data ?? []) as unknown as Row[],
    moduleUnavailable: Boolean(settingsResult.error || categoriesResult.error),
  };
}

async function getTokenMember(db: ReturnType<typeof targetedDb>, communityId: string, token: string) {
  if (token.length < 32 || token.length > 200) return null;
  const { data } = await db.from("TargetedPreferenceToken")
    .select("member:CommunityMember(id,communityId,firstName,lastName,phone),expiresAt")
    .eq("tokenHash", hashPreferenceToken(token))
    .eq("communityId", communityId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as { member: { id: string; communityId: string; firstName: string | null; lastName: string | null; phone: string | null } | null; expiresAt: string | null };
  if (!row.member || (row.expiresAt && new Date(row.expiresAt) <= new Date())) return null;
  return row.member;
}

export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  const context = await getPublicContext(slug);
  if (!context) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  if (context.moduleUnavailable) return NextResponse.json({ error: "Cette page n’est pas encore activée." }, { status: 503 });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const member = token ? await getTokenMember(context.db, context.communityId, token) : null;
  let selectedCategoryIds: string[] = [];
  if (member) {
    const { data } = await context.db.from("TargetedSubscription").select("categoryId").eq("memberId", member.id);
    selectedCategoryIds = ((data ?? []) as Array<{ categoryId: string }>).map((subscription) => subscription.categoryId);
  }
  const settings = context.settings;
  return NextResponse.json({
    active: settings?.isActive !== false,
    community: {
      name: String(settings?.displayName ?? context.community.name),
      logoUrl: String(settings?.logoUrl ?? context.community.logoUrl ?? ""),
    },
    title: String(settings?.title ?? "Choisissez les informations qui vous intéressent"),
    introduction: String(settings?.introduction ?? "Recevez uniquement les messages utiles, directement sur WhatsApp."),
    primaryColor: String(settings?.primaryColor ?? "#421388"),
    accentColor: String(settings?.accentColor ?? "#14b8a6"),
    categories: context.categories,
    member,
    selectedCategoryIds,
    tokenValid: token ? Boolean(member) : null,
  });
}

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;
  const context = await getPublicContext(slug);
  if (!context) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  if (context.moduleUnavailable) return NextResponse.json({ error: "Cette page n’est pas encore activée." }, { status: 503 });
  if (context.settings?.isActive === false) return NextResponse.json({ error: "Les inscriptions sont momentanément fermées." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const phone = normalizeTargetedPhone(body.phone);
  const requestedIds = Array.isArray(body.categoryIds) ? Array.from(new Set(body.categoryIds.filter((id): id is string => typeof id === "string"))) : [];
  if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80 || !phone || requestedIds.length === 0) {
    return NextResponse.json({ error: "Renseignez votre prénom, votre nom, un numéro WhatsApp valide et au moins une catégorie." }, { status: 400 });
  }
  const allowedIds = new Set(context.categories.map((category) => String(category.id)));
  if (requestedIds.some((id) => !allowedIds.has(id))) return NextResponse.json({ error: "Une catégorie sélectionnée n’est plus disponible." }, { status: 400 });

  let { data: member } = await context.db.from("CommunityMember").select("id").eq("communityId", context.communityId).eq("phone", phone).maybeSingle();
  const now = new Date().toISOString();
  if (member) {
    const { data, error } = await context.db.from("CommunityMember").update({
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      optInWhatsapp: true,
      updatedAt: now,
    }).eq("id", (member as { id: string }).id).eq("communityId", context.communityId).select("id").single();
    if (error) return NextResponse.json({ error: "Impossible de mettre à jour votre fiche." }, { status: 500 });
    member = data;
  } else {
    const insert = await context.db.from("CommunityMember").insert({
      id: crypto.randomUUID(),
      communityId: context.communityId,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      phone,
      source: "targeted_public_page",
      tags: [],
      optInEmail: false,
      optInWhatsapp: true,
      updatedAt: now,
    }).select("id").single();
    if (insert.error?.code === "23505") {
      const existing = await context.db.from("CommunityMember").select("id").eq("communityId", context.communityId).eq("phone", phone).single();
      member = existing.data;
    } else if (insert.error) {
      return NextResponse.json({ error: "Impossible de créer votre fiche." }, { status: 500 });
    } else member = insert.data;
  }
  if (!member) return NextResponse.json({ error: "Inscription impossible." }, { status: 500 });
  const memberId = String((member as { id: string }).id);
  await context.db.from("TargetedSubscription").delete().eq("memberId", memberId);
  const subscriptions = requestedIds.map((categoryId) => ({ id: crypto.randomUUID(), memberId, categoryId }));
  const { error: subscriptionError } = await context.db.from("TargetedSubscription").insert(subscriptions);
  if (subscriptionError) return NextResponse.json({ error: "Impossible d’enregistrer vos préférences." }, { status: 500 });

  const token = createPreferenceToken();
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 2);
  const { error: tokenError } = await context.db.from("TargetedPreferenceToken").upsert({
    id: crypto.randomUUID(),
    communityId: context.communityId,
    memberId,
    tokenHash: hashPreferenceToken(token),
    expiresAt: expiresAt.toISOString(),
    updatedAt: now,
  }, { onConflict: "memberId" });
  if (tokenError) return NextResponse.json({ error: "Préférences enregistrées, mais le lien personnel n’a pas pu être créé." }, { status: 500 });
  const origin = new URL(request.url).origin;
  return NextResponse.json({ success: true, managementUrl: `${origin}/communication/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}` }, { status: 201 });
}

export async function PATCH(request: Request, { params }: Context) {
  const { slug } = await params;
  const context = await getPublicContext(slug);
  if (!context) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  if (context.moduleUnavailable) return NextResponse.json({ error: "Cette page n’est pas encore activée." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const token = String(body.token ?? "");
  const member = await getTokenMember(context.db, context.communityId, token);
  if (!member) return NextResponse.json({ error: "Lien personnel invalide ou expiré." }, { status: 401 });
  const requestedIds = Array.isArray(body.categoryIds) ? Array.from(new Set(body.categoryIds.filter((id): id is string => typeof id === "string"))) : [];
  const allowedIds = new Set(context.categories.map((category) => String(category.id)));
  if (requestedIds.some((id) => !allowedIds.has(id))) return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
  await context.db.from("TargetedSubscription").delete().eq("memberId", member.id);
  if (requestedIds.length > 0) {
    const { error } = await context.db.from("TargetedSubscription").insert(requestedIds.map((categoryId) => ({ id: crypto.randomUUID(), memberId: member.id, categoryId })));
    if (error) return NextResponse.json({ error: "Impossible d’enregistrer vos préférences." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
