import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveCommunityPhones, sendWhatsAppMessages, sanitizePhone } from "@/lib/whatsapp/send";

async function getCommunityId(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  return profile?.communityId ?? null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();
  const text = String(body.text ?? "").trim();
  const target = String(body.target ?? "community"); // "community" | "phone" | "contacts"
  if (!text) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  const admin = createAdminClient();
  let phones: string[] = [];

  if (target === "phone") {
    const phone = sanitizePhone(String(body.phone ?? ""));
    if (!phone) return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
    phones = [phone];
  } else if (target === "contacts") {
    const ids = Array.isArray(body.contactIds) ? body.contactIds.map(String) : [];
    const rawPhones: string[] = Array.isArray(body.phones) ? body.phones.map(String) : [];
    if (ids.length > 0) {
      const { data: members } = await (admin as ReturnType<typeof createAdminClient> & {
        from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
      })
        .from("CommunityMember")
        .select("phone")
        .eq("communityId", communityId)
        .in("id", ids);
      phones = (members ?? [])
        .map((m: { phone: string | null }) => sanitizePhone(m.phone))
        .filter((p): p is string => Boolean(p));
    }
    phones = Array.from(
      new Set([...phones, ...rawPhones.map((p) => sanitizePhone(p)).filter((p): p is string => Boolean(p))])
    );
    if (phones.length === 0) return NextResponse.json({ error: "Aucun contact sélectionné valide." }, { status: 400 });
  } else {
    phones = await resolveCommunityPhones(admin, communityId);
    if (phones.length === 0) {
      return NextResponse.json({ error: "Aucun contact opt-in WhatsApp dans la communauté." }, { status: 400 });
    }
  }

  const result = await sendWhatsAppMessages({ communityId, phones, text, admin });

  if (!result.configured) {
    return NextResponse.json(
      { error: "WhatsApp n'est pas configuré. Renseignez le Phone Number ID dans Réglages → Canaux.", result },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: result.sent > 0,
    sent: result.sent,
    failed: result.failed,
    total: result.total,
    templateRequired: result.templateRequired,
    errors: result.errors,
  });
}
