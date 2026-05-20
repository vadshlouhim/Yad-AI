export const AUTOMATION_PRESETS = {
  WEEKLY_SHABBAT: {
    logo: "🕯️",
    name: "Horaires de Chabbat",
    description: "Prépare automatiquement les horaires de Chabbat chaque semaine.",
    trigger: "WEEKLY_SHABBAT",
    triggerConfig: { day: "friday", dayOfWeek: 5, daysBefore: 1, time: "10:00" },
    contentType: "SHABBAT_TIMES",
    channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
  },
  DAILY_THOUGHT: {
    logo: "✨",
    name: "Pensée du jour",
    description: "Prépare chaque matin une pensée courte adaptée à la communauté.",
    trigger: "DAILY",
    triggerConfig: { time: "09:00" },
    contentType: "DAILY_CONTENT",
    channels: ["WHATSAPP", "INSTAGRAM"],
  },
  WEEKLY_COURSE_REMINDER: {
    logo: "📖",
    name: "Rappel de cours",
    description: "Prépare un rappel hebdomadaire pour les cours réguliers.",
    trigger: "CUSTOM_SCHEDULE",
    triggerConfig: { day: "monday", time: "10:00" },
    contentType: "COURSE_ANNOUNCEMENT",
    channels: ["WHATSAPP", "EMAIL"],
  },
  HOLIDAY_GREETING: {
    logo: "🎉",
    name: "Voeux de fêtes",
    description: "Prépare des voeux avant les prochaines fêtes juives.",
    trigger: "JEWISH_HOLIDAY",
    triggerConfig: { daysBeforeHoliday: 3, time: "10:00" },
    contentType: "HOLIDAY_GREETING",
    channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"],
  },
  DONATION_REMINDER: {
    logo: "💛",
    name: "Rappel de dons",
    description: "Prépare un message de collecte ou de rappel de soutien mensuel.",
    trigger: "CUSTOM_SCHEDULE",
    triggerConfig: { day: "sunday", time: "11:00" },
    contentType: "FUNDRAISING",
    channels: ["WHATSAPP", "EMAIL"],
  },
} as const;

export type AutomationPresetKey = keyof typeof AUTOMATION_PRESETS;

export function buildAutomationActions(params: {
  contentType: string;
  channels: string[];
  requiresValidation?: boolean;
}) {
  return [
    { type: "GENERATE_CONTENT", contentType: params.contentType, channels: params.channels },
    { type: "CREATE_PUBLICATION", requiresValidation: params.requiresValidation ?? true },
  ];
}
