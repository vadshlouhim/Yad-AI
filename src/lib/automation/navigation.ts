export interface AutomationNavigationTarget {
  id: string;
  name: string;
  trigger: string;
  triggerConfig?: Record<string, unknown> | null;
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getDedicatedAutomationConfigurationHref(automation: Omit<AutomationNavigationTarget, "id">) {
  const config = automation.triggerConfig ?? {};
  const name = normalized(automation.name);

  if (automation.trigger === "WEEKLY_SHABBAT" || /chabbat|shabbat|horaire/.test(name)) {
    return "/dashboard/shabbat-times-auto";
  }
  if (config.eventReminderCampaign || /j\s*-?\s*(10|5)|rappel.*evenement|evenement.*rappel/.test(name)) {
    return "/dashboard/event-reminders-auto";
  }
  if (config.eventRecapSettings || /recap.*evenement|evenement.*recap/.test(name)) {
    return "/dashboard/event-recap-auto";
  }
  if (config.weeklyImagesSettings || /semaine.*images|images.*semaine/.test(name)) {
    return "/dashboard/weekly-images-auto";
  }
  if (config.monthlyProgramRecapSettings || /programme.*mois|recap.*mois/.test(name)) {
    return "/dashboard/monthly-program-recap-auto";
  }
  if (automation.trigger === "JEWISH_HOLIDAY") return "/dashboard/jewish-holidays-auto";

  return null;
}

export function getAutomationConfigurationHref(automation: AutomationNavigationTarget) {
  const dedicatedHref = getDedicatedAutomationConfigurationHref(automation);
  if (dedicatedHref) return dedicatedHref;

  // Les automatisations génériques n'ont pas d'écran dédié : ouvrir directement leur édition.
  return `/dashboard/automations?edit=${automation.id}`;
}
