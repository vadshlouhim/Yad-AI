// Template HTML de l'email de notification "action en attente de validation".
// Sobre, professionnel, responsive, avec un bouton CTA cliquable.
// Aucune dépendance de rendu : HTML inline prêt pour Resend.

export interface PendingActionEmailParams {
  appName: string;
  appUrl: string;
  communityName: string;
  actionLabel: string; // ex: "Publier un post sur Instagram"
  summary: string; // résumé lisible de ce que l'assistant veut faire
  ctaUrl: string; // lien profond vers la carte à valider
  recipientName?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPendingActionEmail(params: PendingActionEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { appName, communityName, actionLabel, summary, ctaUrl, recipientName } = params;

  const greeting = recipientName ? `Bonjour ${escapeHtml(recipientName)},` : "Bonjour,";
  const subject = `${actionLabel} — une action attend votre validation`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.08);">
          <!-- En-tête -->
          <tr>
            <td style="background-color:#047857;padding:28px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">${escapeHtml(appName)}</span>
            </td>
          </tr>
          <!-- Corps -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#0f172a;font-size:16px;line-height:1.5;">${greeting}</p>
              <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.6;">
                Votre assistant ${escapeHtml(appName)} a préparé une action pour
                <strong>${escapeHtml(communityName)}</strong> et attend votre feu vert avant de l'exécuter.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 6px;color:#047857;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(actionLabel)}</p>
                    <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(summary)}</p>
                  </td>
                </tr>
              </table>
              <!-- Bouton CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:12px;background-color:#047857;">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">
                      Ouvrir ${escapeHtml(appName)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;text-align:center;">
                Cliquez sur le bouton pour examiner l'action, puis confirmer ou refuser en un clic.
              </p>
            </td>
          </tr>
          <!-- Pied -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                Vous recevez cet email car l'assistant ${escapeHtml(appName)} est configuré en mode validation manuelle.
                Vous pouvez changer ce réglage à tout moment dans les paramètres de l'application.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greeting,
    "",
    `Votre assistant ${appName} a préparé une action pour ${communityName} et attend votre validation :`,
    "",
    `${actionLabel}`,
    summary,
    "",
    `Ouvrir ${appName} pour confirmer ou refuser : ${ctaUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export interface NotificationEmailParams {
  appName: string;
  title: string;
  body: string;
  ctaUrl: string;
  ctaLabel?: string;
  recipientName?: string | null;
}

// Email de notification générique (rappels, automatisations, contenus prêts…).
export function renderNotificationEmail(params: NotificationEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { appName, title, body, ctaUrl, ctaLabel = "Ouvrir l'application", recipientName } = params;
  const greeting = recipientName ? `Bonjour ${escapeHtml(recipientName)},` : "Bonjour,";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.08);">
        <tr><td style="background-color:#047857;padding:24px 32px;"><span style="color:#ffffff;font-size:19px;font-weight:700;">${escapeHtml(appName)}</span></td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 14px;color:#0f172a;font-size:16px;line-height:1.5;">${greeting}</p>
          <p style="margin:0 0 8px;color:#0f172a;font-size:17px;font-weight:700;line-height:1.4;">${escapeHtml(title)}</p>
          <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">${escapeHtml(body)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td align="center" style="border-radius:12px;background-color:#047857;">
              <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;">${escapeHtml(ctaLabel)}</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #f1f5f9;"><p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">Notification automatique de ${escapeHtml(appName)}. Gérez vos préférences dans l'application.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [greeting, "", title, body, "", `${ctaLabel} : ${ctaUrl}`].join("\n");
  return { subject: title, html, text };
}
