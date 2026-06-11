import { Resend } from "resend";
import { getGmailClient } from "@/lib/gmail";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.replace(/^"|"$/g, "") ?? "Yad.ia";

export interface SendCommunityEmailParams {
  to: string;
  subject: string;
  bodyText: string;
}

export interface SendCommunityEmailResult {
  success: boolean;
  provider?: "gmail" | "resend";
  id?: string | null;
  error?: string;
}

function buildHtml(communityName: string, bodyText: string): string {
  const htmlBody = bodyText
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${communityName}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b;">
  <div style="border-bottom:3px solid #047857;padding-bottom:16px;margin-bottom:24px;">
    <h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0;">${communityName}</h1>
  </div>
  <div style="font-size:15px;line-height:1.7;color:#334155;"><p>${htmlBody}</p></div>
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;">
    Envoyé via <strong>${APP_NAME}</strong> · Communication communautaire assistée par IA
  </div>
</body></html>`;
}

// Envoie un email au nom de la communauté.
// Priorité : Gmail OAuth si connecté, sinon fallback Resend.
// Logique centralisée, réutilisée par l'API email et par l'assistant IA.
export async function sendCommunityEmail(
  admin: Admin,
  communityId: string,
  params: SendCommunityEmailParams
): Promise<SendCommunityEmailResult> {
  const { to, subject, bodyText } = params;
  if (!to || !subject || !bodyText) {
    return { success: false, error: "Champs obligatoires manquants" };
  }

  const { data: community } = await admin
    .from("Community")
    .select("name")
    .eq("id", communityId)
    .single();
  const communityName = (community as { name?: string } | null)?.name ?? APP_NAME;

  const { data: gmailChannel } = await admin
    .from("Channel")
    .select("refreshToken, isConnected, handle")
    .eq("communityId", communityId)
    .eq("type", "EMAIL")
    .maybeSingle();

  const htmlContent = buildHtml(communityName, bodyText);

  // ── Gmail OAuth ──
  if (gmailChannel?.refreshToken && gmailChannel.isConnected) {
    try {
      const gmail = getGmailClient(gmailChannel.refreshToken);
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
      const messageParts = [
        `To: ${to}`,
        `From: ${communityName} <${gmailChannel.handle ?? "me"}>`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${utf8Subject}`,
        "",
        htmlContent,
      ];
      const raw = Buffer.from(messageParts.join("\n"))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
      return { success: true, provider: "gmail", id: res.data.id };
    } catch (error) {
      console.error("[Email] Échec Gmail, fallback Resend:", (error as Error).message);
    }
  }

  // ── Fallback Resend ──
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Aucun canal email configuré (Gmail ou Resend)." };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM?.replace(/^"|"$/g, "") ?? "onboarding@resend.dev",
      to: [to],
      subject,
      html: htmlContent,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, provider: "resend", id: data?.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
