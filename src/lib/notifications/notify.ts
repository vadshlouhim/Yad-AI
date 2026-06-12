import { Resend } from "resend";
import type { createAdminClient } from "@/lib/supabase/admin";
import { renderPendingActionEmail, renderNotificationEmail } from "./pending-action-email";
import { sendPushToUser } from "./push";
import { actionLabelFor } from "@/lib/ai/assistant/actions";

type Admin = ReturnType<typeof createAdminClient>;

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.replace(/^"|"$/g, "") ?? "EasyCom IA";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

interface PendingActionRecord {
  id: string;
  communityId: string;
  userId: string | null;
  kind: string;
  summary: string;
  token: string;
}

// Notifie l'utilisateur qu'une action de l'assistant attend sa validation.
// 3 canaux en parallèle : email Resend + push web + notification in-app.
export async function notifyPendingAction(
  admin: Admin,
  action: PendingActionRecord,
  communityName: string
): Promise<void> {
  const actionLabel = actionLabelFor(action.kind);
  const ctaUrl = `${APP_URL}/dashboard/assistant?action=${action.id}`;

  // Récupère le destinataire (email + nom) depuis profiles.
  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  if (action.userId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("email, name")
      .eq("id", action.userId)
      .maybeSingle();
    recipientEmail = (profile as { email?: string } | null)?.email ?? null;
    recipientName = (profile as { name?: string } | null)?.name ?? null;
  }

  await Promise.allSettled([
    // 1. Notification in-app (cloche)
    admin.from("Notification").insert({
      id: crypto.randomUUID(),
      userId: action.userId,
      communityId: action.communityId,
      type: "AI_CONTENT_READY",
      title: `${actionLabel} à valider`,
      body: action.summary,
      link: `/dashboard/assistant?action=${action.id}`,
      data: { pendingActionId: action.id, kind: action.kind },
    }),

    // 2. Email Resend
    sendPendingActionEmail({ recipientEmail, recipientName, communityName, actionLabel, summary: action.summary, ctaUrl }),

    // 3. Push web
    action.userId
      ? sendPushToUser(admin, action.userId, {
          title: `${actionLabel} à valider`,
          body: action.summary,
          url: `/dashboard/assistant?action=${action.id}`,
          tag: `pending-action-${action.id}`,
        })
      : Promise.resolve(),
  ]);
}

// Notifie un utilisateur (email + push) pour un événement générique
// (rappel, automatisation, contenu prêt…). L'in-app Notification est gérée à part.
export async function notifyUser(
  admin: Admin,
  userId: string,
  params: { title: string; body: string; link: string }
): Promise<void> {
  const ctaUrl = `${APP_URL}${params.link.startsWith("/") ? "" : "/"}${params.link}`;

  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  const { data: profile } = await admin.from("profiles").select("email, name").eq("id", userId).maybeSingle();
  recipientEmail = (profile as { email?: string } | null)?.email ?? null;
  recipientName = (profile as { name?: string } | null)?.name ?? null;

  await Promise.allSettled([
    // Email
    (async () => {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey || !recipientEmail) return;
      const { subject, html, text } = renderNotificationEmail({
        appName: APP_NAME,
        title: params.title,
        body: params.body,
        ctaUrl,
        ctaLabel: `Ouvrir ${APP_NAME}`,
        recipientName,
      });
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: process.env.EMAIL_FROM?.replace(/^"|"$/g, "") ?? `${APP_NAME} <noreply@easycom-ai.com>`,
          to: recipientEmail,
          subject,
          html,
          text,
        });
      } catch (error) {
        console.error("[Notify] Échec email notifyUser:", (error as Error).message);
      }
    })(),
    // Push
    sendPushToUser(admin, userId, { title: params.title, body: params.body, url: params.link }),
  ]);
}

async function sendPendingActionEmail(params: {
  recipientEmail: string | null;
  recipientName: string | null;
  communityName: string;
  actionLabel: string;
  summary: string;
  ctaUrl: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !params.recipientEmail) {
    if (!params.recipientEmail) console.warn("[Notify] Pas d'email destinataire — email ignoré.");
    return;
  }

  const { subject, html, text } = renderPendingActionEmail({
    appName: APP_NAME,
    appUrl: APP_URL,
    communityName: params.communityName,
    actionLabel: params.actionLabel,
    summary: params.summary,
    ctaUrl: params.ctaUrl,
    recipientName: params.recipientName,
  });

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.EMAIL_FROM?.replace(/^"|"$/g, "") ?? `${APP_NAME} <noreply@easycom-ai.com>`,
      to: params.recipientEmail,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("[Notify] Échec envoi email Resend:", (error as Error).message);
  }
}
