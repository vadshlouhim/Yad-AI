import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPaidFeature } from "@/lib/billing";
import { sanitizePhone } from "@/lib/whatsapp/send";

const postSchema = z.object({
  text: z.string().default(""),
  mediaUrls: z.array(z.string().url()).default([]),
  contactIds: z.array(z.string()).default([]),
  listTags: z.array(z.string()).default([]),
  phones: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });

  const { text, mediaUrls, contactIds, listTags, phones: rawPhones, scheduledAt } = parsed.data;
  const cleanText = text.trim();
  if (!cleanText && mediaUrls.length === 0) {
    return NextResponse.json({ error: "Ajoutez un message ou une piece jointe." }, { status: 400 });
  }

  const scheduleDate = new Date(scheduledAt);
  if (Number.isNaN(scheduleDate.getTime())) {
    return NextResponse.json({ error: "Date de planification invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const paid = await assertPaidFeature(
    admin,
    user.id,
    "whatsapp",
    "WhatsApp est reserve au mode payant. Passez a l'abonnement pour envoyer des messages."
  );
  if (!paid.ok) return paid.response;

  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  const communityId = (profile as { communityId?: string } | null)?.communityId;
  if (!communityId) return NextResponse.json({ error: "Communaute introuvable" }, { status: 403 });

  const { data: channel } = await admin
    .from("Channel")
    .select("id")
    .eq("communityId", communityId)
    .eq("type", "WHATSAPP")
    .eq("isActive", true)
    .maybeSingle();

  if (!channel?.id) {
    return NextResponse.json({ error: "Connectez WhatsApp avant de planifier un envoi." }, { status: 400 });
  }

  const recipientPhones = new Set(
    rawPhones.map((phone) => sanitizePhone(phone)).filter((phone): phone is string => Boolean(phone))
  );

  if (contactIds.length > 0 || listTags.length > 0) {
    let query = admin
      .from("CommunityMember")
      .select("id,phone,tags")
      .eq("communityId", communityId)
      .eq("optInWhatsapp", true)
      .not("phone", "is", null);

    if (contactIds.length > 0 && listTags.length === 0) {
      query = query.in("id", contactIds);
    }

    const { data: members, error } = await query;
    if (error) throw error;

    for (const member of members ?? []) {
      const tags = Array.isArray(member.tags) ? member.tags.filter((tag): tag is string => typeof tag === "string") : [];
      const selectedById = contactIds.includes(member.id);
      const selectedByTag = tags.some((tag) => listTags.includes(tag));
      if (!selectedById && !selectedByTag) continue;

      const phone = sanitizePhone(member.phone);
      if (phone) recipientPhones.add(phone);
    }
  }

  if (recipientPhones.size === 0) {
    return NextResponse.json({ error: "Selectionnez au moins un destinataire WhatsApp valide." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const draftId = crypto.randomUUID();
  const publicationId = crypto.randomUUID();
  const primaryImageUrl = mediaUrls[0] ?? null;

  await admin.from("ContentDraft").insert({
    id: draftId,
    communityId,
    title: cleanText.slice(0, 120) || "Envoi WhatsApp planifie",
    body: cleanText,
    imageUrl: primaryImageUrl,
    contentType: "GENERAL",
    status: "AI_PROPOSAL",
    aiGenerated: false,
    aiPromptUsed: "whatsapp-scheduled-page",
    updatedAt: now,
  });

  const metadata = {
    mediaUrls,
    source: "whatsapp-page",
    whatsappRecipientPhones: Array.from(recipientPhones),
  };

  const { data: publication, error: publicationError } = await admin
    .from("Publication")
    .insert({
      id: publicationId,
      communityId,
      draftId,
      channelId: channel.id,
      channelType: "WHATSAPP",
      content: cleanText,
      mediaUrls,
      metadata,
      status: "SCHEDULED",
      scheduledAt: scheduleDate.toISOString(),
      updatedAt: now,
    })
    .select("id,content,scheduledAt,status,mediaUrls,metadata")
    .single();

  if (publicationError) throw publicationError;

  return NextResponse.json({ publication }, { status: 201 });
}
