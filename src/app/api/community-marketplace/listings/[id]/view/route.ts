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
  if (listing.ownerUserId !== context.user.id) {
    const now = new Date().toISOString();
    const { error } = await context.admin.from("community_listing_views").upsert(
      { listingId: id, userId: context.user.id, lastViewedAt: now },
      { onConflict: "listingId,userId" }
    );
    if (error) return marketplaceError(error.message, 400);
  }
  return NextResponse.json({ success: true });
}
