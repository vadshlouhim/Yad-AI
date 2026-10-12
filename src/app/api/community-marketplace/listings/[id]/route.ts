import { NextResponse } from "next/server";
import { MARKETPLACE_BUCKET, canSeeListing, type MarketplaceListing } from "@/lib/community-marketplace";
import { getMarketplaceContext, marketplaceError } from "@/lib/community-marketplace-server";

async function loadListing(id: string) {
  const context = await getMarketplaceContext();
  if (!context) return { response: marketplaceError("Non autorisé", 401) } as const;
  const { data, error } = await context.admin
    .from("community_listings")
    .select("*, owner:profiles!community_listings_ownerUserId_fkey(name, avatarUrl), assets:community_listing_assets(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) return { response: marketplaceError(error.message, 500) } as const;
  if (!data || !canSeeListing(data as MarketplaceListing, context.user.id, context.community.id)) {
    return { response: marketplaceError("Annonce introuvable", 404) } as const;
  }
  return { context, listing: data } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadListing(id);
  if ("response" in loaded) return loaded.response;

  const assets = await Promise.all((loaded.listing.assets ?? []).map(async (asset: Record<string, unknown>) => {
    const canPreview = (asset.role === "cover" || asset.role === "gallery") && String(asset.mimeType).startsWith("image/");
    if (!canPreview) return { ...asset, signedUrl: null };
    const { data } = await loaded.context.admin.storage
      .from(MARKETPLACE_BUCKET)
      .createSignedUrl(String(asset.storagePath), 300);
    return { ...asset, signedUrl: data?.signedUrl ?? null };
  }));
  return NextResponse.json({ data: { ...loaded.listing, assets } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadListing(id);
  if ("response" in loaded) return loaded.response;
  if (loaded.listing.ownerUserId !== loaded.context.user.id) return marketplaceError("Action interdite", 403);

  const body = await request.json() as { action?: string };
  const statusByAction: Record<string, string> = {
    sold: "sold",
    republish: "published",
    archive: "archived",
  };
  const status = statusByAction[body.action ?? ""];
  if (!status) return marketplaceError("Action invalide", 400);

  const { error } = await loaded.context.admin
    .from("community_listings")
    .update({ status, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .eq("ownerUserId", loaded.context.user.id);
  if (error) return marketplaceError(error.message, 400);
  return NextResponse.json({ success: true, status });
}
