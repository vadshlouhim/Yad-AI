import type { LucideIcon } from "lucide-react";
import { BookOpen, Cake, CalendarClock, Camera, Clock3 } from "lucide-react";

export type CommunityAutomationModuleKey =
  | "shabbat-times"
  | "hayom-yom"
  | "jewish-birthdays"
  | "event-reminders"
  | "automatic-recap";

export type CommunityAutomationConfigKey =
  | "hayomYomSettings"
  | "eventReminderCampaign"
  | "eventRecapSettings"
  | "monthlyProgramRecapSettings";

export interface CommunityAutomationModuleDefinition {
  key: CommunityAutomationModuleKey;
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  iconSurfaceClass: string;
  kind: "automation" | "tool";
  trigger?: string;
  configKeys?: readonly CommunityAutomationConfigKey[];
  supportsMultipleCampaigns?: boolean;
}

/**
 * Source unique des modules de communication communautaire.
 * Le menu et le centre « Toutes les automatisations » sont tous les deux
 * construits depuis ce registre afin qu'un futur module apparaisse partout.
 */
export const COMMUNITY_AUTOMATION_MODULES: readonly CommunityAutomationModuleDefinition[] = [
  {
    key: "shabbat-times",
    href: "/dashboard/shabbat-times-auto",
    label: "Horaires de Chabbat",
    shortLabel: "Horaires de Chabbat",
    description: "Personnalisez et programmez les horaires de Chabbat.",
    icon: Clock3,
    iconClass: "text-amber-700",
    iconSurfaceClass: "bg-amber-100",
    kind: "automation",
    trigger: "WEEKLY_SHABBAT",
  },
  {
    key: "hayom-yom",
    href: "/dashboard/hayom-yom-sefer-hamitsvot",
    label: "Hayom Yom et Sefer Hamitsvot",
    shortLabel: "Hayom Yom et Sefer Hamitsvot",
    description: "Publiez fidèlement les études quotidiennes sur Facebook.",
    icon: BookOpen,
    iconClass: "text-teal-700",
    iconSurfaceClass: "bg-teal-100",
    kind: "automation",
    configKeys: ["hayomYomSettings"],
  },
  {
    key: "jewish-birthdays",
    href: "/dashboard/jewish-birthdays",
    label: "Anniversaire juif",
    shortLabel: "Anniversaire juif",
    description: "Préparez un message de Mazal Tov depuis vos contacts CRM.",
    icon: Cake,
    iconClass: "text-rose-700",
    iconSurfaceClass: "bg-rose-100",
    kind: "tool",
  },
  {
    key: "event-reminders",
    href: "/dashboard/event-reminders-auto",
    label: "Automatisation J-10 / J-5",
    shortLabel: "J-10 / J-5",
    description: "Programmez les rappels avant vos événements.",
    icon: CalendarClock,
    iconClass: "text-blue-700",
    iconSurfaceClass: "bg-blue-100",
    kind: "automation",
    configKeys: ["eventReminderCampaign"],
    supportsMultipleCampaigns: true,
  },
  {
    key: "automatic-recap",
    href: "/dashboard/recap-auto",
    label: "Récap automatique",
    shortLabel: "Récap automatique",
    description: "Préparez les récaps de vos événements et du mois terminé.",
    icon: Camera,
    iconClass: "text-fuchsia-700",
    iconSurfaceClass: "bg-fuchsia-100",
    kind: "automation",
    configKeys: ["eventRecapSettings", "monthlyProgramRecapSettings"],
  },
] as const;
