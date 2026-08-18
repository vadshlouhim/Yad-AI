import type { PlanTier } from "@/lib/billing";
import { tierLabel } from "@/lib/billing";

/**
 * Source de vérité unique des permissions de l'assistant.
 *
 * Modèle de sensibilité (3 niveaux produit) :
 * - READ / SAFE_WRITE  → exécution directe (lectures, mémorisation, brouillons IA).
 * - REVERSIBLE         → suit le mode global CONFIRM/AUTO de la communauté.
 * - IRREVERSIBLE       → validation TOUJOURS requise (PendingAction), même en mode AUTO :
 *                        envois de masse, publications publiques, suppressions, réponses publiques.
 *
 * La surface super-admin (/api/admin/* : templates globaux, presets, facturation
 * plateforme, blog, gestion utilisateurs) n'est PAS représentable ici : aucun outil
 * admin n'existe dans le registre, même pour un super-admin. `isSuperAdmin` ne sert
 * qu'à bypasser les gates billing (sémantique getBillingGate).
 */

export type Sensitivity = "READ" | "SAFE_WRITE" | "REVERSIBLE" | "IRREVERSIBLE";

export type AssistantDomain =
  | "events"
  | "contacts"
  | "content"
  | "publications"
  | "automations"
  | "settings"
  | "comms"
  | "reviews"
  | "channels"
  | "notifications"
  | "memory"
  | "meta";

/** SUPER_ADMIN volontairement absent : aucune capacité admin n'est représentable ici. */
export type CommunityRole = "ADMIN" | "EDITOR" | "VIEWER";
export const ALL_ROLES: CommunityRole[] = ["ADMIN", "EDITOR", "VIEWER"];
/** Rôles autorisés à modifier (préparation future : EDITOR crée/modifie, VIEWER lit). */
const WRITE_ROLES: CommunityRole[] = ["ADMIN", "EDITOR"];
const ADMIN_ONLY: CommunityRole[] = ["ADMIN"];

export type AssistantCardType = "automation" | "setting" | "navigation" | "creation" | "email";

export interface ToolPermission {
  domain: AssistantDomain;
  /** Sensibilité fixe, ou fonction pour les outils polymorphes. */
  sensitivity: Sensitivity | ((args: Record<string, unknown>) => Sensitivity);
  /** Palier exact requis (sémantique assertTierFeature : égalité stricte). */
  requiredTier?: PlanTier;
  /** Réservé aux paliers payants (sémantique gate.isPaid — WhatsApp). */
  paidOnly?: boolean;
  /** Quota TIER_LIMITS vérifié à l'exécution par le handler (informative ici). */
  usageMetric?: "automations" | "socialPublications";
  /** Future application des rôles EDITOR/VIEWER — non appliqué tant que les rôles ne sont pas actifs. */
  allowedRoles: CommunityRole[];
  cardType: AssistantCardType;
}

export const TOOL_PERMISSIONS: Record<string, ToolPermission> = {
  // ── Lectures (exécution directe + panneau éventuel) ──
  list_events: { domain: "events", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "creation" },
  list_automations: { domain: "automations", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "automation" },
  check_channels: { domain: "channels", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "setting" },
  list_contacts: { domain: "contacts", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "creation" },
  list_drafts: { domain: "content", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "creation" },
  list_publications: { domain: "publications", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "creation" },
  get_community_settings: { domain: "settings", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "setting" },
  get_daily_routine: { domain: "settings", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "setting" },
  list_notifications: { domain: "notifications", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "setting" },
  list_reviews: { domain: "reviews", sensitivity: "READ", requiredTier: "BUSINESS", allowedRoles: ALL_ROLES, cardType: "email" },
  get_usage_and_plan: { domain: "meta", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "navigation" },
  suggest_navigation: { domain: "meta", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "navigation" },
  generate_torah_course: { domain: "content", sensitivity: "READ", allowedRoles: ALL_ROLES, cardType: "creation" },

  // ── Écritures sans danger (exécution directe) ──
  remember: { domain: "memory", sensitivity: "SAFE_WRITE", allowedRoles: ALL_ROLES, cardType: "setting" },
  generate_content: { domain: "content", sensitivity: "SAFE_WRITE", allowedRoles: WRITE_ROLES, cardType: "creation" },

  // ── Mutations réversibles (mode CONFIRM/AUTO global) ──
  update_community_settings: { domain: "settings", sensitivity: "REVERSIBLE", allowedRoles: ADMIN_ONLY, cardType: "setting" },
  update_user_profile: { domain: "settings", sensitivity: "REVERSIBLE", allowedRoles: ALL_ROLES, cardType: "setting" },
  update_daily_routine: { domain: "settings", sensitivity: "REVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "setting" },
  create_event: { domain: "events", sensitivity: "REVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  update_event: { domain: "events", sensitivity: "REVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  create_contact: { domain: "contacts", sensitivity: "REVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  update_contact: { domain: "contacts", sensitivity: "REVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  update_draft: { domain: "content", sensitivity: "REVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  create_automation: { domain: "automations", sensitivity: "REVERSIBLE", usageMetric: "automations", allowedRoles: WRITE_ROLES, cardType: "automation" },
  update_automation: { domain: "automations", sensitivity: "REVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "automation" },
  toggle_automation: { domain: "automations", sensitivity: "REVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "automation" },
  update_channel: { domain: "channels", sensitivity: "REVERSIBLE", allowedRoles: ADMIN_ONLY, cardType: "setting" },
  mark_notifications_read: { domain: "notifications", sensitivity: "REVERSIBLE", allowedRoles: ALL_ROLES, cardType: "setting" },
  // Exception assumée à la règle « delete ⇒ IRREVERSIBLE » : hygiène de notifications
  // (confirmer la suppression d'une notification par une notification serait absurde).
  delete_notification: { domain: "notifications", sensitivity: "REVERSIBLE", allowedRoles: ALL_ROLES, cardType: "setting" },

  // ── Actions irréversibles ou publiques (validation TOUJOURS requise) ──
  send_email: { domain: "comms", sensitivity: "IRREVERSIBLE", requiredTier: "BUSINESS", allowedRoles: WRITE_ROLES, cardType: "email" },
  email_community: { domain: "comms", sensitivity: "IRREVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "email" },
  send_whatsapp: { domain: "comms", sensitivity: "IRREVERSIBLE", paidOnly: true, allowedRoles: WRITE_ROLES, cardType: "email" },
  publish_content: { domain: "publications", sensitivity: "IRREVERSIBLE", usageMetric: "socialPublications", allowedRoles: WRITE_ROLES, cardType: "creation" },
  retry_publication: { domain: "publications", sensitivity: "IRREVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  delete_publication: { domain: "publications", sensitivity: "IRREVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  delete_event: { domain: "events", sensitivity: "IRREVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  delete_contact: { domain: "contacts", sensitivity: "IRREVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  delete_automation: { domain: "automations", sensitivity: "IRREVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "automation" },
  delete_draft: { domain: "content", sensitivity: "IRREVERSIBLE", allowedRoles: WRITE_ROLES, cardType: "creation" },
  delete_channel: { domain: "channels", sensitivity: "IRREVERSIBLE", allowedRoles: ADMIN_ONLY, cardType: "setting" },
  reply_review: { domain: "reviews", sensitivity: "IRREVERSIBLE", requiredTier: "BUSINESS", allowedRoles: ADMIN_ONLY, cardType: "email" },
};

export function resolveSensitivity(name: string, args: Record<string, unknown> = {}): Sensitivity | null {
  const permission = TOOL_PERMISSIONS[name];
  if (!permission) return null;
  return typeof permission.sensitivity === "function" ? permission.sensitivity(args) : permission.sensitivity;
}

export function requiresConfirmation(sensitivity: Sensitivity, actionMode: "AUTO" | "CONFIRM"): boolean {
  if (sensitivity === "IRREVERSIBLE") return true;
  return sensitivity === "REVERSIBLE" && actionMode === "CONFIRM";
}

export interface ToolAllowContext {
  tier: PlanTier;
  isPaid: boolean;
  isSuperAdmin: boolean;
  /** Future application des rôles — ignoré tant qu'ils ne sont pas actifs. */
  role?: CommunityRole;
}

export type ToolAllowResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Vérifie qu'un outil est utilisable dans le contexte billing courant.
 * `isSuperAdmin` bypasse uniquement les gates billing — jamais de capacités en plus.
 */
export function isToolAllowed(name: string, ctx: ToolAllowContext): ToolAllowResult {
  const permission = TOOL_PERMISSIONS[name];
  if (!permission) return { allowed: false, reason: `Outil inconnu : ${name}.` };
  if (ctx.isSuperAdmin) return { allowed: true };

  if (permission.requiredTier && ctx.tier !== permission.requiredTier) {
    return {
      allowed: false,
      reason: `Cette fonctionnalité est réservée à l'offre ${tierLabel(permission.requiredTier)}. Passez à l'offre supérieure depuis la page Facturation.`,
    };
  }
  if (permission.paidOnly && !ctx.isPaid) {
    return {
      allowed: false,
      reason: "Cette fonctionnalité est réservée aux offres payantes. Passez à l'offre Pro ou Business depuis la page Facturation.",
    };
  }
  return { allowed: true };
}
