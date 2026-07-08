// Types partagés serveur/client des panneaux interactifs affichés dans le chat
// (event SSE "data_panel"). Types uniquement — aucun import serveur ici.

export type PanelType = "entity_list" | "entity_detail" | "settings_view";

export type PanelEntity =
  | "event"
  | "contact"
  | "draft"
  | "publication"
  | "automation"
  | "review"
  | "notification"
  | "channel"
  | "settings";

export interface PanelField {
  key: string;
  label: string;
  value: string;
  editable?: boolean;
  inputType?: "text" | "textarea" | "date" | "time" | "select";
  options?: string[];
}

export interface PanelAction {
  id: string;
  label: string;
  style?: "default" | "primary" | "danger";
  kind: "execute_tool" | "send_message" | "navigate";
  /** Nom de l'outil à exécuter (kind=execute_tool) via POST /api/ai/action (voie directe). */
  toolKind?: string;
  /** Payload pré-rempli côté serveur (id de l'entité + champs). Les champs édités côté client y sont fusionnés. */
  payload?: Record<string, unknown>;
  href?: string;
  message?: string;
  /** Demande un double-clic "Confirmer ?" inline avant exécution (actions danger). */
  confirm?: boolean;
}

export interface PanelItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
  fields?: PanelField[];
  actions?: PanelAction[];
}

export interface DataPanel {
  id: string;
  panelType: PanelType;
  entity: PanelEntity;
  /** Titre FR affiché en tête de panneau, ex. « Vos 12 prochains événements ». */
  title: string;
  emptyText?: string;
  /** entity_list */
  items?: PanelItem[];
  /** entity_detail / settings_view */
  fields?: PanelField[];
  /** Actions globales du panneau (ex. Enregistrer sur un detail éditable). */
  actions?: PanelAction[];
  meta?: { total?: number; filterLabel?: string };
}
