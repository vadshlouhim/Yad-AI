export const MARKETPLACE_BUCKET = "community-library";
export const MARKETPLACE_MAX_FILE_SIZE = 15 * 1024 * 1024;
export const MARKETPLACE_MAX_ASSETS = 5;

export const LISTING_CATEGORIES = [
  "books_texts",
  "prayer_study",
  "shabbat_holidays",
  "judaica_objects",
  "children_family",
  "community_communication",
  "other",
] as const;

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  books_texts: "Livres et textes",
  prayer_study: "Prière et étude",
  shabbat_holidays: "Chabbat et fêtes",
  judaica_objects: "Judaïca et objets",
  children_family: "Enfants et famille",
  community_communication: "Communication communautaire",
  other: "Autres",
};

export const CONDITION_LABELS: Record<PhysicalCondition, string> = {
  new: "Neuf",
  very_good: "Très bon état",
  good: "Bon état",
  fair: "État correct",
};

export const FULFILLMENT_LABELS: Record<FulfillmentMode, string> = {
  pickup: "Remise en main propre",
  shipping: "Expédition à convenir",
  both: "Remise ou expédition",
};

export type ListingKind = "digital" | "physical";
export type ListingAccess = "personal" | "free" | "paid";
export type ListingVisibility = "owner" | "community" | "platform";
export type ListingStatus = "draft" | "published" | "hidden" | "reported" | "sold" | "archived";
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];
export type PhysicalCondition = "new" | "very_good" | "good" | "fair";
export type FulfillmentMode = "pickup" | "shipping" | "both";
export type PaymentProvider = "paypal" | "revolut";
export type SellerContactType = "email" | "whatsapp";

export interface MarketplaceAsset {
  id: string;
  listingId: string;
  role: "cover" | "gallery" | "digital_file";
  storagePath: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  signedUrl?: string | null;
}

export interface MarketplaceListing {
  id: string;
  ownerUserId: string | null;
  communityId: string;
  kind: ListingKind;
  access: ListingAccess;
  visibility: ListingVisibility;
  status: ListingStatus;
  title: string;
  description: string;
  category: ListingCategory;
  theme: string | null;
  keywords: string[];
  priceCents: number | null;
  currency: string;
  condition: PhysicalCondition | null;
  fulfillmentMode: FulfillmentMode | null;
  city: string | null;
  shippingNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { name: string | null; avatarUrl: string | null } | null;
  assets?: MarketplaceAsset[];
  isFavorite?: boolean;
  favoriteCount?: number;
  viewCount?: number;
}

export interface SellerProfile {
  userId: string;
  displayName: string;
  city: string | null;
  contactType: SellerContactType;
  contactValue: string;
  paymentProvider: PaymentProvider | null;
  paymentUrl: string | null;
  termsAcceptedAt: string;
}

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_DIGITAL_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
] as const;

export function isAllowedMarketplaceFile(file: File, kind: ListingKind) {
  const allowed = kind === "physical" ? ALLOWED_IMAGE_MIME_TYPES : ALLOWED_DIGITAL_MIME_TYPES;
  return (allowed as readonly string[]).includes(file.type) && file.size > 0 && file.size <= MARKETPLACE_MAX_FILE_SIZE;
}

export function isValidPaymentUrl(provider: PaymentProvider, rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return provider === "paypal"
      ? host === "paypal.me" || host === "paypal.com"
      : host === "revolut.me" || host === "revolut.com";
  } catch {
    return false;
  }
}

export function formatMarketplacePrice(priceCents: number | null, currency = "EUR") {
  if (priceCents === null) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(priceCents / 100);
}

export function listingReference(id: string) {
  return `AR-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function canSeeListing(
  listing: Pick<MarketplaceListing, "ownerUserId" | "communityId" | "visibility" | "status">,
  userId: string,
  communityId: string
) {
  if (listing.ownerUserId === userId) return true;
  if (listing.status !== "published" && listing.status !== "sold") return false;
  if (listing.visibility === "platform") return true;
  return listing.visibility === "community" && listing.communityId === communityId;
}
