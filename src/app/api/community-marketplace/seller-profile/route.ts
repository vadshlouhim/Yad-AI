import { NextResponse } from "next/server";
import { isValidPaymentUrl, type PaymentProvider, type SellerContactType } from "@/lib/community-marketplace";
import { getMarketplaceContext, marketplaceError } from "@/lib/community-marketplace-server";

export async function GET() {
  const context = await getMarketplaceContext();
  if (!context) return marketplaceError("Non autorisé", 401);
  const { data, error } = await context.admin
    .from("community_seller_profiles")
    .select("*")
    .eq("userId", context.user.id)
    .maybeSingle();
  if (error) return marketplaceError(error.message, 500);
  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const context = await getMarketplaceContext();
  if (!context) return marketplaceError("Non autorisé", 401);
  const body = await request.json() as Record<string, unknown>;
  const displayName = String(body.displayName ?? "").trim().slice(0, 100);
  const city = String(body.city ?? "").trim().slice(0, 120) || null;
  const contactType = body.contactType as SellerContactType;
  const contactValue = String(body.contactValue ?? "").trim().slice(0, 200);
  const paymentProvider = body.paymentProvider as PaymentProvider;
  const paymentUrl = String(body.paymentUrl ?? "").trim();
  const acceptedTerms = body.acceptedTerms === true;
  const requiresPayment = body.requiresPayment === true;
  const hasValidPayment = (["paypal", "revolut"] as string[]).includes(paymentProvider)
    && isValidPaymentUrl(paymentProvider, paymentUrl);

  if (!displayName || !contactValue || !(["email", "whatsapp"] as string[]).includes(contactType)) {
    return marketplaceError("Profil vendeur incomplet", 400);
  }
  if (contactType === "email" && !/^\S+@\S+\.\S+$/.test(contactValue)) return marketplaceError("E-mail invalide", 400);
  if (contactType === "whatsapp" && !/^\+?[0-9 ()-]{8,20}$/.test(contactValue)) return marketplaceError("Numéro WhatsApp invalide", 400);
  if (requiresPayment && !hasValidPayment) {
    return marketplaceError("Utilisez un lien public PayPal ou Revolut valide", 400);
  }
  if (!acceptedTerms) return marketplaceError("Vous devez accepter les règles de vente entre particuliers", 400);

  const now = new Date().toISOString();
  const { data, error } = await context.admin
    .from("community_seller_profiles")
    .upsert({
      userId: context.user.id,
      displayName,
      city,
      contactType,
      contactValue,
      paymentProvider: hasValidPayment ? paymentProvider : null,
      paymentUrl: hasValidPayment ? paymentUrl : null,
      termsAcceptedAt: now,
      updatedAt: now,
    }, { onConflict: "userId" })
    .select()
    .single();
  if (error) return marketplaceError(error.message, 400);
  return NextResponse.json({ data });
}
