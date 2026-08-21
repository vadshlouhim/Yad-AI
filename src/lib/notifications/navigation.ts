/**
 * Choisit une destination utile pour une notification.
 *
 * Une notification ne doit jamais ouvrir l'assistant par défaut : celui-ci est
 * réservé aux actions explicites qui attendent une validation de l'utilisateur.
 * Cette fonction est volontairement sans accès serveur afin d'être utilisable
 * aussi bien par l'interface que par les outils de l'assistant.
 */
export type NotificationNavigationInput = {
  type?: string | null;
  title?: string | null;
  body?: string | null;
  link?: string | null;
  data?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function internalDashboardLink(value: unknown): string | null {
  const link = asString(value);
  return link?.startsWith("/dashboard") ? link : null;
}

function isAssistantLink(link: string | null): boolean {
  return Boolean(link && /^\/dashboard\/assistant(?:[/?#]|$)/.test(link));
}

function inferredAutomationLink(input: NotificationNavigationInput): string | null {
  const text = `${input.title ?? ""} ${input.body ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/chabbat|shabbat|horaire/.test(text)) return "/dashboard/shabbat-times-auto";
  if (/recap.*evenement|evenement.*recap/.test(text)) return "/dashboard/recap-auto";
  if (/cette semaine en images|photos cette semaine/.test(text)) return "/dashboard/weekly-images-auto";
  if (/recap du mois|programme du mois/.test(text)) return "/dashboard/recap-auto";
  if (/rappel.*evenement|evenement.*rappel/.test(text)) return "/dashboard/event-reminders-auto";
  return null;
}

export function resolveNotificationTarget(input: NotificationNavigationInput): string {
  const data = asRecord(input.data);
  const link = internalDashboardLink(input.link);

  // C'est le seul cas qui ouvre volontairement l'assistant : une action métier
  // déjà préparée et qui attend la décision explicite de l'utilisateur.
  const pendingActionId = asString(data?.pendingActionId);
  if (pendingActionId) return `/dashboard/assistant?action=${encodeURIComponent(pendingActionId)}`;

  if (data?.source === "event_today") return "/dashboard/events";
  if (data?.weeklyImages === true) return "/dashboard/weekly-images-auto";
  if (data?.recap === true || data?.monthly === true) return link && !isAssistantLink(link) ? link : "/dashboard/recap-auto";
  if (asString(data?.reminderId)) return "/dashboard/event-reminders-auto";
  if (asString(data?.eventId) && input.type === "EVENT_REMINDER") return "/dashboard/events";

  // Les anciennes alertes pouvaient stocker un lien assistant. On les corrige à
  // la lecture grâce aux métadonnées et au texte, sans migration de données.
  const inferred = inferredAutomationLink(input);
  if (inferred) return inferred;

  if (link && !isAssistantLink(link)) return link;

  switch (input.type) {
    case "PUBLICATION_SUCCESS":
    case "PUBLICATION_FAILED":
    case "PUBLICATION_SCHEDULED":
      return "/dashboard/publications";
    case "EVENT_REMINDER":
      return "/dashboard/events";
    case "CHANNEL_DISCONNECTED":
      return "/dashboard/settings/channels";
    case "SUBSCRIPTION_EXPIRING":
    case "SUBSCRIPTION_RENEWED":
    case "PAYMENT_FAILED":
      return "/dashboard/settings/billing";
    case "AUTOMATION_TRIGGERED":
    case "AUTOMATION_FAILED":
    case "AI_CONTENT_READY":
      return "/dashboard/automations";
    default:
      return "/dashboard/notifications";
  }
}

