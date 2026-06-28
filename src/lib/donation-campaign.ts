export type CampaignStatus = "draft" | "pending_validation" | "active" | "paused" | "completed";
export type StepStatus = "to_prepare" | "ready" | "to_validate" | "scheduled" | "published";
export type AssetStatus = "generated" | "validated" | "to_correct" | "published";
export type AssetType = "square_poster" | "banner" | "whatsapp_text" | "sms_text" | "email_content" | "social_post";
export type PublicationMode = "after_validation" | "automatic";
export type StepType = "launch" | "reminder" | "relay" | "final_push" | "closing" | "thank_you";

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  launch: "Lancement",
  reminder: "Rappel",
  relay: "Relance",
  final_push: "Dernière ligne droite",
  closing: "Clôture",
  thank_you: "Remerciement",
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  to_prepare: "À préparer",
  ready: "Prêt",
  to_validate: "À valider",
  scheduled: "Programmé",
  published: "Publié",
};

export const STEP_STATUS_COLORS: Record<StepStatus, string> = {
  to_prepare: "bg-slate-100 text-slate-600",
  ready: "bg-blue-100 text-blue-700",
  to_validate: "bg-amber-100 text-amber-700",
  scheduled: "bg-violet-100 text-violet-700",
  published: "bg-emerald-100 text-emerald-700",
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  square_poster: "Affiche carrée",
  banner: "Bannière",
  whatsapp_text: "Texte WhatsApp",
  sms_text: "Contenu SMS",
  email_content: "Email",
  social_post: "Publication réseaux sociaux",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  generated: "Généré",
  validated: "Validé",
  to_correct: "À corriger",
  published: "Publié",
};

export const CAMPAIGN_CHANNELS = ["WhatsApp", "Instagram", "Facebook", "Email", "SMS"] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export interface DonationCampaignBrief {
  title?: string;
  slogan?: string;
  theme?: string;
  cause?: string;
  tone?: string;
  objective_amount?: number;
  collected_amount?: number;
  donation_url?: string;
  organization_name?: string;
  rabbi_name?: string;
  channels?: CampaignChannel[];
  publication_mode?: PublicationMode;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface DonationCampaign {
  id: string;
  communityId: string;
  title: string;
  slogan: string | null;
  theme: string | null;
  cause: string | null;
  tone: string | null;
  objective_amount: number | null;
  collected_amount: number | null;
  donation_url: string | null;
  organization_name: string | null;
  rabbi_name: string | null;
  channels: CampaignChannel[];
  publication_mode: PublicationMode;
  email_enabled: boolean;
  sms_enabled: boolean;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignStep {
  id: string;
  campaign_id: string;
  communityId: string;
  step_date: string;
  step_label: string;
  step_type: StepType;
  selected_channels: CampaignChannel[];
  visual_type: AssetType;
  status: StepStatus;
  requires_validation: boolean;
  scheduled_publish_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignAsset {
  id: string;
  campaign_id: string;
  step_id: string | null;
  asset_type: AssetType;
  format: string | null;
  title: string;
  thumbnail_url: string | null;
  full_asset_url: string | null;
  text_content: string | null;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Brouillon",
  pending_validation: "En attente de validation",
  active: "Active",
  paused: "Désactivée",
  completed: "Terminée",
};
