import type { Channel } from "@prisma/client";
import type { PublishPayload, PublishResult } from "../publisher";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export async function prepareEmailFallback(
  channel: Channel,
  payload: PublishPayload,
  communityId: string
): Promise<PublishResult> {
  // Récupérer les informations de la communauté pour l'email
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true, email: true, logoUrl: true },
  });

  const formattedContent = formatEmailContent(payload, community?.name ?? "");

  // Si Resend est configuré, envoyer directement
  if (process.env.RESEND_API_KEY && channel.handle) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailList = channel.handle.split(",").map((e) => e.trim());

      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? `${community?.name} <noreply@yad-ia.com>`,
        to: emailList,
        subject: extractEmailSubject(payload.content),
        html: formattedContent,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        externalId: data?.id,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Erreur email" };
    }
  }

  // Fallback : préparer le brouillon email
  return {
    success: false,
    fallbackUsed: true,
    fallbackType: "EMAIL_DRAFT",
    fallbackData: {
      subject: extractEmailSubject(payload.content),
      htmlContent: formattedContent,
      instructions: "Configurez Resend dans les Paramètres pour l'envoi automatique.",
    },
  };
}

function extractEmailSubject(content: string): string {
  // Prend les 60 premiers caractères comme objet
  const firstLine = content.split("\n")[0].replace(/[*_#]/g, "").trim();
  return firstLine.substring(0, 60) || "Message de votre communauté";
}

function formatEmailContent(payload: PublishPayload, communityName: string): string {
  const contentHtml = payload.content
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${communityName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">${communityName}</h1>
  </div>

  ${payload.mediaUrls?.[0] ? `
  <div style="margin-bottom: 24px;">
    <img src="${payload.mediaUrls[0]}" alt="" style="width: 100%; border-radius: 12px;" />
  </div>
  ` : ""}

  <div style="font-size: 15px; line-height: 1.7; color: #334155;">
    <p>${contentHtml}</p>
  </div>

  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
    Envoyé via <strong>Yad.ia</strong> · Communication communautaire assistée par IA
  </div>
</body>
</html>`;
}
