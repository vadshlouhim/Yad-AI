import type { MobileHomeModuleKey } from "@/lib/mobile-dashboard/modules";

// Reuse the Home palette itself, including its mobile gradient variants.
export const DASHBOARD_MODULE_COLORS = {
  publish: "home-tool-publish text-white",
  "newsletter-paper": "home-tool-newsletter text-white",
  visuals: "home-tool-posters text-white",
  automations: "home-tool-automations text-white",
  torah: "home-tool-torah text-white",
  contacts: "home-tool-email text-white",
  targeted: "home-tool-posters text-white",
  email: "home-tool-email text-white",
  reviews: "home-tool-shop text-[#24114f]",
  whatsapp: "home-tool-torah text-white",
  website: "home-tool-publish text-white",
  seo: "home-tool-newsletter text-white",
  shop: "home-tool-shop text-[#24114f]",
  assistance: "home-tool-newsletter text-white",
} satisfies Record<MobileHomeModuleKey, string>;

export const DASHBOARD_MENU_COLORS = DASHBOARD_MODULE_COLORS;
