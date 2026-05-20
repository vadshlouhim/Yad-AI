import type { Tables } from "@/types/database.types";
import type { PublishPayload, PublishResult } from "../publisher";
import { createAdminClient } from "@/lib/supabase/admin";

type Channel = Tables<"Channel">;

export async function prepareWhatsAppFallback(
  channel: Channel,
  payload: PublishPayload,
  communityId: string
): Promise<PublishResult> {
  const formattedContent = formatWhatsAppContent(payload);
  const supabase = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };
  const { data: members } = await supabase
    .from("CommunityMember")
    .select("displayName,phone")
    .eq("communityId", communityId)
    .eq("optInWhatsapp", true)
    .not("phone", "is", null);
  const recipients = (members ?? []).map((member: { displayName: string; phone: string | null }) => ({
    name: member.displayName,
    phone: member.phone,
    deepLink: member.phone
      ? `https://wa.me/${member.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(formattedContent)}`
      : null,
  }));

  return {
    success: false,
    fallbackUsed: true,
    fallbackType: "COPY_PASTE",
    fallbackData: {
      content: formattedContent,
      instructions: [
        "1. Copiez le texte ci-dessous",
        "2. Ouvrez WhatsApp sur votre téléphone",
        recipients.length > 0
          ? "3. Envoyez-le aux contacts de la communauté listés ci-dessous"
          : `3. Accédez à votre canal ou groupe "${channel.name}"`,
        "4. Collez et envoyez le message",
      ],
      channelName: channel.name,
      recipients,
      deepLink: `https://wa.me/?text=${encodeURIComponent(formattedContent)}`,
    },
  };
}

function formatWhatsAppContent(payload: PublishPayload): string {
  return payload.content;
}
