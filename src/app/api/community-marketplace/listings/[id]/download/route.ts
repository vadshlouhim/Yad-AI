import { NextResponse } from "next/server";
import { MARKETPLACE_BUCKET, canSeeListing, type MarketplaceListing } from "@/lib/community-marketplace";
import { getMarketplaceContext, marketplaceError } from "@/lib/community-marketplace-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMarketplaceContext();
  if (!context) return marketplaceError("Non autorisé", 401);
  const { id } = await params;
  const { data: listing } = await context.admin.from("community_listings").select("*").eq("id", id).maybeSingle();
  if (!listing || !canSeeListing(listing as MarketplaceListing, context.user.id, context.community.id) || listing.kind !== "digital") {
    return marketplaceError("Ressource introuvable", 404);
  }
  const isOwner = listing.ownerUserId === context.user.id;
  if (listing.access === "paid" && !isOwner) return marketplaceError("Le vendeur remet ce fichier après paiement", 403);
  const { data: asset } = await context.admin
    .from("community_listing_assets")
    .select("storagePath")
    .eq("listingId", id)
    .eq("role", "digital_file")
    .order("sortOrder")
    .limit(1)
    .maybeSingle();
  if (!asset) return marketplaceError("Fichier indisponible", 404);
  const { data, error } = await context.admin.storage.from(MARKETPLACE_BUCKET).createSignedUrl(asset.storagePath, 60);
  if (error || !data?.signedUrl) return marketplaceError("Téléchargement indisponible", 500);
  return NextResponse.redirect(data.signedUrl, 303);
}
