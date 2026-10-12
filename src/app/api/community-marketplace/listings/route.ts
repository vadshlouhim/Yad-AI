import { NextResponse } from "next/server";
import {
  LISTING_CATEGORIES,
  MARKETPLACE_BUCKET,
  MARKETPLACE_MAX_ASSETS,
  canSeeListing,
  isAllowedMarketplaceFile,
  type FulfillmentMode,
  type ListingAccess,
  type ListingCategory,
  type ListingKind,
  type ListingVisibility,
  type PhysicalCondition,
} from "@/lib/community-marketplace";
import { getMarketplaceContext, isPublishingPlan, marketplaceError } from "@/lib/community-marketplace-server";

const PAGE_SIZE = 24;

function cleanSearch(value: string) {
  return value.normalize("NFC").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function fileExtension(mimeType: string) {
  return ({
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "text/plain": "txt",
  } as Record<string, string>)[mimeType] ?? "bin";
}

async function hydrateListings(
  context: NonNullable<Awaited<ReturnType<typeof getMarketplaceContext>>>,
  listings: Record<string, unknown>[]
) {
  const ids = listings.map((item) => String(item.id));
  if (ids.length === 0) return [];

  const [{ data: assets }, { data: favorites }, { data: allFavorites }, { data: views }] = await Promise.all([
    context.admin.from("community_listing_assets").select("*").in("listingId", ids).order("sortOrder"),
    context.admin.from("community_listing_favorites").select("listingId").eq("userId", context.user.id).in("listingId", ids),
    context.admin.from("community_listing_favorites").select("listingId").in("listingId", ids),
    context.admin.from("community_listing_views").select("listingId").in("listingId", ids),
  ]);

  const favoriteSet = new Set((favorites ?? []).map((item) => item.listingId));
  const favoriteCounts = new Map<string, number>();
  const viewCounts = new Map<string, number>();
  for (const item of allFavorites ?? []) favoriteCounts.set(item.listingId, (favoriteCounts.get(item.listingId) ?? 0) + 1);
  for (const item of views ?? []) viewCounts.set(item.listingId, (viewCounts.get(item.listingId) ?? 0) + 1);

  const assetsByListing = new Map<string, Record<string, unknown>[]>();
  for (const asset of assets ?? []) {
    const list = assetsByListing.get(asset.listingId) ?? [];
    list.push(asset);
    assetsByListing.set(asset.listingId, list);
  }

  return Promise.all(listings.map(async (listing) => {
    const listingAssets = assetsByListing.get(String(listing.id)) ?? [];
    const previewAsset = listingAssets.find((asset) =>
      (asset.role === "cover" || asset.role === "gallery") && String(asset.mimeType).startsWith("image/")
    );
    let previewUrl: string | null = null;
    if (previewAsset) {
      const result = await context.admin.storage
        .from(MARKETPLACE_BUCKET)
        .createSignedUrl(String(previewAsset.storagePath), 300);
      previewUrl = result.data?.signedUrl ?? null;
    }

    return {
      ...listing,
      assets: listingAssets.map((asset) => ({ ...asset, signedUrl: asset.id === previewAsset?.id ? previewUrl : null })),
      isFavorite: favoriteSet.has(String(listing.id)),
      favoriteCount: favoriteCounts.get(String(listing.id)) ?? 0,
      viewCount: viewCounts.get(String(listing.id)) ?? 0,
    };
  }));
}

export async function GET(request: Request) {
  const context = await getMarketplaceContext();
  if (!context) return marketplaceError("Non autorisé", 401);

  const params = new URL(request.url).searchParams;
  const scope = params.get("scope") ?? "discover";
  const q = cleanSearch(params.get("q") ?? "");
  const kind = params.get("kind") ?? "";
  const access = params.get("access") ?? "";
  const category = params.get("category") ?? "";
  const cursor = params.get("cursor") ?? "";

  let favoriteIds: string[] | null = null;
  if (scope === "favorites") {
    const { data } = await context.admin
      .from("community_listing_favorites")
      .select("listingId")
      .eq("userId", context.user.id);
    favoriteIds = (data ?? []).map((item) => item.listingId);
    if (favoriteIds.length === 0) return NextResponse.json({ data: [], nextCursor: null });
  }

  let query = context.admin
    .from("community_listings")
    .select("*, owner:profiles!community_listings_ownerUserId_fkey(name, avatarUrl)")
    .order("createdAt", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (scope === "mine") {
    query = query.eq("ownerUserId", context.user.id);
  } else {
    query = query
      .in("status", ["published", "sold"])
      .or(`visibility.eq.platform,and(visibility.eq.community,communityId.eq.${context.community.id})`);
  }
  if (favoriteIds) query = query.in("id", favoriteIds);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (kind === "digital" || kind === "physical") query = query.eq("kind", kind);
  if (access === "free" || access === "paid") query = query.eq("access", access);
  if (LISTING_CATEGORIES.includes(category as ListingCategory)) query = query.eq("category", category);
  if (cursor && !Number.isNaN(Date.parse(cursor))) query = query.lt("createdAt", cursor);

  const { data, error } = await query;
  if (error) return marketplaceError(error.message, 500);
  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const page = (data ?? []).slice(0, PAGE_SIZE);
  const hydrated = await hydrateListings(context, page);
  return NextResponse.json({
    data: hydrated,
    nextCursor: hasMore ? String(page.at(-1)?.createdAt ?? "") : null,
  });
}

export async function POST(request: Request) {
  const context = await getMarketplaceContext();
  if (!context) return marketplaceError("Non autorisé", 401);
  if (!isPublishingPlan(context.community.plan)) return marketplaceError("Abonnement requis pour publier", 402);

  const form = await request.formData();
  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(String(form.get("metadata") ?? "{}"));
  } catch {
    return marketplaceError("Métadonnées invalides", 400);
  }

  const kind = metadata.kind as ListingKind;
  const access = metadata.access as ListingAccess;
  const visibility = metadata.visibility as ListingVisibility;
  const category = metadata.category as ListingCategory;
  const condition = (metadata.condition || null) as PhysicalCondition | null;
  const fulfillmentMode = (metadata.fulfillmentMode || null) as FulfillmentMode | null;
  const title = String(metadata.title ?? "").trim().slice(0, 120);
  const description = String(metadata.description ?? "").trim().slice(0, 3000);
  const city = String(metadata.city ?? "").trim().slice(0, 120) || null;
  const priceCents = access === "paid" ? Math.round(Number(metadata.price) * 100) : null;

  if (!title || description.length < 10) return marketplaceError("Titre et description requis", 400);
  if (!LISTING_CATEGORIES.includes(category)) return marketplaceError("Catégorie invalide", 400);
  if (!(["digital", "physical"] as string[]).includes(kind)) return marketplaceError("Type invalide", 400);
  if (!(["personal", "free", "paid"] as string[]).includes(access)) return marketplaceError("Mode invalide", 400);
  if (!(["owner", "community", "platform"] as string[]).includes(visibility)) return marketplaceError("Visibilité invalide", 400);
  if (access === "personal" && (kind !== "digital" || visibility !== "owner")) {
    return marketplaceError("Une ressource personnelle doit être numérique et privée", 400);
  }
  if (access !== "personal" && visibility === "owner") return marketplaceError("Visibilité invalide", 400);
  if (access === "paid" && (!priceCents || priceCents <= 0)) return marketplaceError("Prix invalide", 400);
  if (kind === "physical" && (!condition || !fulfillmentMode || !city)) {
    return marketplaceError("État, remise et ville requis", 400);
  }

  if (access === "paid" || kind === "physical") {
    const { data: seller } = await context.admin
      .from("community_seller_profiles")
      .select("userId, paymentUrl")
      .eq("userId", context.user.id)
      .maybeSingle();
    if (!seller) return marketplaceError("Configurez votre profil vendeur avant de publier", 409);
    if (access === "paid" && !seller.paymentUrl) return marketplaceError("Ajoutez votre lien de paiement avant de publier", 409);
  }

  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0 || files.length > MARKETPLACE_MAX_ASSETS) {
    return marketplaceError(kind === "physical" ? "Ajoutez entre 1 et 5 photos" : "Ajoutez un fichier", 400);
  }
  if (kind === "digital" && files.length !== 1) return marketplaceError("Une seule ressource numérique est autorisée", 400);
  if (files.some((file) => !isAllowedMarketplaceFile(file, kind))) {
    return marketplaceError("Un fichier est trop lourd ou son format n’est pas autorisé", 400);
  }

  const listingId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  try {
    for (const file of files) {
      const path = `${context.user.id}/${listingId}/${crypto.randomUUID()}.${fileExtension(file.type)}`;
      const { error } = await context.admin.storage
        .from(MARKETPLACE_BUCKET)
        .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
      if (error) throw error;
      uploadedPaths.push(path);
    }

    const now = new Date().toISOString();
    const { data: listing, error: listingError } = await context.admin
      .from("community_listings")
      .insert({
        id: listingId,
        ownerUserId: context.user.id,
        communityId: context.community.id,
        kind,
        access,
        visibility,
        status: "published",
        title,
        description,
        category,
        theme: String(metadata.theme ?? "").trim().slice(0, 80) || null,
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords.map(String).slice(0, 8) : [],
        priceCents,
        currency: "EUR",
        condition,
        fulfillmentMode,
        city,
        shippingNote: String(metadata.shippingNote ?? "").trim().slice(0, 500) || null,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (listingError) throw listingError;

    const { error: assetError } = await context.admin.from("community_listing_assets").insert(
      files.map((file, index) => ({
        listingId,
        role: kind === "digital" ? "digital_file" : index === 0 ? "cover" : "gallery",
        storagePath: uploadedPaths[index],
        mimeType: file.type,
        fileSize: file.size,
        sortOrder: index,
      }))
    );
    if (assetError) throw assetError;
    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    if (uploadedPaths.length) await context.admin.storage.from(MARKETPLACE_BUCKET).remove(uploadedPaths);
    await context.admin.from("community_listings").delete().eq("id", listingId).eq("ownerUserId", context.user.id);
    return marketplaceError(error instanceof Error ? error.message : "Publication impossible", 500);
  }
}

export { canSeeListing };
