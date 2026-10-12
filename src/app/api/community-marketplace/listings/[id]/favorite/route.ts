import { NextResponse } from "next/server";
import { canSeeListing, type MarketplaceListing } from "@/lib/community-marketplace";
import { getMarketplaceContext, marketplaceError } from "@/lib/community-marketplace-server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMarketplaceContext();
  if (!context) return marketplaceError("Non autorisé", 401);
  const { id } = await params;
  const { data: listing } = await context.admin.from("community_listings").select("*").eq("id", id).maybeSingle();
  if (!listing || !canSeeListing(listing as MarketplaceListing, context.user.id, context.community.id)) {
    return marketplaceError("Annonce introuvable", 404);
  }

  const { data: existing } = await context.admin
    .from("community_listing_favorites")
    .select("listingId")
    .eq("listingId", id)
    .eq("userId", context.user.id)
    .maybeSingle();
  if (existing) {
    await context.admin.from("community_listing_favorites").delete().eq("listingId", id).eq("userId", context.user.id);
    return NextResponse.json({ favorite: false });
  }
  const { error } = await context.admin.from("community_listing_favorites").insert({ listingId: id, userId: context.user.id });
  if (error) return marketplaceError(error.message, 400);
  return NextResponse.json({ favorite: true });
}
