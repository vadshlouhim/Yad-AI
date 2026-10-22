export type FeatureKey =
  | "newsletter"
  | "publish"
  | "posters"
  | "shabbatTimes"
  | "birthdays"
  | "automations"
  | "crm"
  | "torahLessons"
  | "emailReviews"
  | "shop"
  | "assistant"
  | "agenda"
  | "services";

const ENABLED_BY_LOCALE: Record<string, FeatureKey[] | "all"> = {
  fr: "all",
  en: "all",
  he: ["newsletter", "publish"],
};

export function isFeatureEnabled(locale: string, key: FeatureKey) {
  const list = ENABLED_BY_LOCALE[locale] ?? "all";
  return list === "all" || list.includes(key);
}

export type PublishChannel = "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "EMAIL";

// Keep dormant channels in the product without exposing them on the streamlined
// composer. Re-enabling one channel is now a configuration change, not a UI rewrite.
const PUBLISH_CHANNELS_BY_LOCALE: Record<string, PublishChannel[]> = {
  fr: ["FACEBOOK", "INSTAGRAM"],
  en: ["FACEBOOK", "INSTAGRAM"],
  he: ["FACEBOOK", "INSTAGRAM"],
};

export function getPublishChannels(locale: string): PublishChannel[] {
  return PUBLISH_CHANNELS_BY_LOCALE[locale] ?? PUBLISH_CHANNELS_BY_LOCALE.en;
}

const DASHBOARD_ROUTE_FEATURES: Array<[prefix: string, feature: FeatureKey]> = [
  ["/dashboard/newsletter", "newsletter"],
  ["/dashboard/social-networks", "publish"],
  ["/dashboard/publish", "publish"],
  ["/dashboard/publications", "publish"],
  ["/dashboard/instagram", "publish"],
  ["/dashboard/facebook", "publish"],
  ["/dashboard/whatsapp", "publish"],
  ["/dashboard/templates", "posters"],
  ["/dashboard/media-library", "posters"],
  ["/dashboard/weekly-images-auto", "posters"],
  ["/dashboard/shabbat-times-auto", "shabbatTimes"],
  ["/dashboard/hebrew-calendar", "shabbatTimes"],
  ["/dashboard/jewish-holidays-auto", "shabbatTimes"],
  ["/dashboard/jewish-birthdays", "birthdays"],
  ["/dashboard/hayom-yom-sefer-hamitsvot", "automations"],
  ["/dashboard/event-reminders-auto", "automations"],
  ["/dashboard/event-recap-auto", "automations"],
  ["/dashboard/recap-auto", "automations"],
  ["/dashboard/monthly-program-recap-auto", "automations"],
  ["/dashboard/automations", "automations"],
  ["/dashboard/contacts", "crm"],
  ["/dashboard/communication-ciblee", "crm"],
  ["/dashboard/torah", "torahLessons"],
  ["/dashboard/email", "emailReviews"],
  ["/dashboard/google-reviews", "emailReviews"],
  ["/dashboard/boutique", "shop"],
  ["/dashboard/articles", "shop"],
  ["/dashboard/assistant", "assistant"],
  ["/dashboard/daily-assistant", "assistant"],
  ["/dashboard/events", "agenda"],
  ["/dashboard/website", "services"],
  ["/dashboard/referencement", "services"],
  ["/dashboard/assistance-indemnisation-aerienne", "services"],
];

export function dashboardFeatureForPathname(pathname: string): FeatureKey | null {
  return DASHBOARD_ROUTE_FEATURES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null;
}

export function isDashboardPathEnabled(locale: string, pathname: string): boolean {
  if (
    pathname === "/dashboard"
    || pathname === "/dashboard/overview"
    || pathname === "/dashboard/settings"
    || pathname.startsWith("/dashboard/settings/")
  ) return true;
  const feature = dashboardFeatureForPathname(pathname);
  return feature ? isFeatureEnabled(locale, feature) : locale !== "he";
}
