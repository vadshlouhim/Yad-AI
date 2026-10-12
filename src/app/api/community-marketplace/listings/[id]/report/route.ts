import { NextResponse } from "next/server";
import { canSeeListing, type MarketplaceListing } from "@/lib/community-marketplace";
import { getMarketplaceContext, marketplaceError } from "@/lib/community-marketplace-server";

const REASONS = ["prohibited", "fraud", "copyright", "incorrect", "other"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMarketplaceContext();
  if (!context) return marketplaceError("Non autorisé", 401);
  const { id } = await params;
  const { data: listing } = await context.admin.from("community_listings").select("*").eq("id", id).maybeSingle();
  if (!listing || !canSeeListing(listing as MarketplaceListing, context.user.id, context.community.id)) {
    return marketplaceError("Annonce introuvable", 404);
  }
  if (listing.ownerUserId === context.user.id) return marketplaceError("Vous ne pouvez pas signaler votre annonce", 400);
  const body = await request.json() as { reason?: string; details?: string };
  if (!REASONS.includes(body.reason as (typeof REASONS)[number])) return marketplaceError("Motif invalide", 400);
  const { error } = await context.admin.from("community_listing_reports").upsert({
    listingId: id,
    reporterUserId: context.user.id,
    reason: body.reason,
    details: String(body.details ?? "").trim().slice(0, 1000) || null,
    status: "open",
    updatedAt: new Date().toISOString(),
  }, { onConflict: "listingId,reporterUserId" });
  if (error) return marketplaceError(error.message, 400);
  return NextResponse.json({ success: true });
}
