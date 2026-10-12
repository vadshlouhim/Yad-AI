import { NextResponse } from "next/server";
import { canSeeListing, listingReference, type MarketplaceListing } from "@/lib/community-marketplace";
import { getMarketplaceContext, marketplaceError } from "@/lib/community-marketplace-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMarketplaceContext();
  if (!context) return marketplaceError("Non autorisé", 401);
  const { id } = await params;
  const { data: listing } = await context.admin.from("community_listings").select("*").eq("id", id).maybeSingle();
  if (
    !listing
    || !canSeeListing(listing as MarketplaceListing, context.user.id, context.community.id)
    || (listing.access !== "paid" && listing.kind !== "physical")
  ) {
    return marketplaceError("Annonce introuvable", 404);
  }

  const { data: seller } = await context.admin
    .from("community_seller_profiles")
    .select("displayName, city, contactType, contactValue, paymentProvider, paymentUrl")
    .eq("userId", listing.ownerUserId)
    .maybeSingle();
  if (seller) return NextResponse.json({ data: { ...seller, reference: listingReference(id) } });
  return marketplaceError("Coordonnées du membre indisponibles", 404);
}
