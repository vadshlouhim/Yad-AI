import { formatEuroCents } from "@/lib/billing";
import { SUBSCRIPTION_MONTHLY_CENTS, SUBSCRIPTION_YEARLY_CENTS } from "@/lib/billing/subscription-policy";
import { rememberFact } from "../memory";
import type { AssistantToolDef } from "../types";
import { panelId, resolveGate } from "./shared";

// Outils transverses : mémoire durable, navigation guidée (facturation/OAuth/admin),
// consultation du plan et des quotas.

/** Destinations autorisées pour les cartes de navigation proposées par l'assistant. */
const NAVIGATION_TARGETS: Record<string, { href: string; label: string }> = {
  billing: { href: "/dashboard/settings/billing", label: "Facturation" },
  channels: { href: "/dashboard/settings/channels", label: "Réglages → Canaux" },
  settings: { href: "/dashboard/settings", label: "Paramètres" },
  contacts: { href: "/dashboard/contacts", label: "Contacts" },
  templates: { href: "/dashboard/templates", label: "Banque d'affiches" },
  events: { href: "/dashboard/events", label: "Agenda connecté IA" },
  automations: { href: "/dashboard/automations", label: "Automatisations" },
  publications: { href: "/dashboard/publications", label: "Publications" },
  email: { href: "/dashboard/email", label: "Messagerie Email" },
  reviews: { href: "/dashboard/google-reviews", label: "Avis Google" },
  whatsapp: { href: "/dashboard/whatsapp", label: "WhatsApp" },
  boutique: { href: "/dashboard/boutique", label: "Boutique" },
  help: { href: "/help", label: "Aide & support" },
  contact_support: { href: "/contact", label: "Contacter le support" },
  torah_course: { href: "/dashboard/torah", label: "Cours de Torah IA" },
  torah_library: { href: "/dashboard/community-library", label: "Bibliothèque partagée" },
};

export const remember: AssistantToolDef = {
  name: "remember",
  label: "Mémoriser une préférence",
  summarize: (payload) => `Mémoriser : ${String(payload.key ?? "")}.`,
  schema: {
    type: "function",
    function: {
      name: "remember",
      description:
        "Mémorise un fait durable sur la communauté pour mieux l'aider plus tard (préférence éditoriale, habitude, vocabulaire…).",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["EDITORIAL_PREFERENCE", "EVENT_PATTERN", "CONTENT_STYLE", "CHANNEL_PREFERENCE", "VOCABULARY", "RECURRING_CONTENT", "USER_FEEDBACK"],
          },
          key: { type: "string", description: "Identifiant court du fait (ex: 'ton_prefere')" },
          value: { description: "La valeur à mémoriser (texte ou objet)" },
        },
        required: ["type", "key", "value"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const res = await rememberFact(ctx.admin, ctx.communityId, {
      type: String(payload.type ?? "USER_FEEDBACK"),
      key: String(payload.key ?? ""),
      value: payload.value,
    });
    return { success: res.success, message: res.message };
  },
};

export const suggestNavigation: AssistantToolDef = {
  name: "suggest_navigation",
  label: "Ouvrir une page",
  summarize: (payload) => `Proposer d'ouvrir : ${String(payload.destination ?? "")}.`,
  schema: {
    type: "function",
    function: {
      name: "suggest_navigation",
      description:
        "Affiche un bouton pour ouvrir une page de la plateforme. À utiliser pour tout ce que tu ne peux pas faire toi-même : facturation/changement d'offre (billing), connexion d'un réseau social ou de Gmail (channels), banque d'affiches (templates), boutique, aide (help), administration de la plateforme (contact_support).",
      parameters: {
        type: "object",
        properties: {
          destination: {
            type: "string",
            enum: Object.keys(NAVIGATION_TARGETS),
          },
          reason: { type: "string", description: "Phrase courte expliquant pourquoi (affichée sur la carte)" },
        },
        required: ["destination"],
      },
    },
  },
  read: async (_ctx, args) => {
    const destination = String(args.destination ?? "");
    const target = NAVIGATION_TARGETS[destination];
    if (!target) {
      return { llmResult: { error: `Destination inconnue : ${destination}.` } };
    }
    return {
      llmResult: { ok: true, label: target.label, note: "Bouton affiché à l'utilisateur. Invite-le à cliquer dessus." },
      panel: {
        id: panelId("nav"),
        panelType: "entity_list",
        entity: "settings",
        title: target.label,
        items: [
          {
            id: `nav-${destination}`,
            title: target.label,
            subtitle: typeof args.reason === "string" && args.reason ? args.reason : "Ouvrir la page correspondante.",
            actions: [
              { id: `go-${destination}`, label: `Ouvrir ${target.label}`, style: "primary", kind: "navigate", href: target.href },
            ],
          },
        ],
      },
    };
  },
};

export const getUsageAndPlan: AssistantToolDef = {
  name: "get_usage_and_plan",
  label: "Consulter l'abonnement",
  summarize: () => "Consulter l'état de l'abonnement.",
  schema: {
    type: "function",
    function: {
      name: "get_usage_and_plan",
      description:
        "Affiche l'état de l'abonnement unique EasyCom IA (abonné, essai gratuit en cours, ou lecture seule après l'essai), sans quota : tout est illimité pour les abonnés. Pour s'abonner : suggest_navigation(billing).",
      parameters: { type: "object", properties: {} },
    },
  },
  read: async (ctx) => {
    const gate = await resolveGate(ctx);
    if (!gate) return { llmResult: { error: "Impossible de déterminer l'abonnement." } };
    const status = gate.access === "subscribed" ? "Abonné" : gate.access === "trial" ? "Essai gratuit" : "Lecture seule (essai terminé)";
    const offer = `${formatEuroCents(SUBSCRIPTION_MONTHLY_CENTS)}/mois ou ${formatEuroCents(SUBSCRIPTION_YEARLY_CENTS)}/an`;
    const trialEnd = gate.access === "trial" && gate.trialEndsAt ? new Date(gate.trialEndsAt).toLocaleDateString("fr-FR") : null;

    return {
      llmResult: {
        status,
        offer,
        trialEndsAt: trialEnd,
        note: "Une seule offre, tout inclus et illimité. Pour s'abonner, propose suggest_navigation(billing) — tu ne peux pas déclencher de paiement.",
      },
      panel: {
        id: panelId("plan"),
        panelType: "settings_view",
        entity: "settings",
        title: "Abonnement EasyCom IA",
        fields: [
          { key: "status", label: "État", value: status },
          { key: "offer", label: "Offre", value: offer },
          ...(trialEnd ? [{ key: "trialEnd", label: "Fin de l'essai", value: trialEnd }] : []),
        ],
        actions: [
          { id: "go-billing", label: "Gérer mon offre", style: "primary", kind: "navigate", href: "/dashboard/settings/billing" },
        ],
      },
    };
  },
};

export const metaTools: AssistantToolDef[] = [remember, suggestNavigation, getUsageAndPlan];
