import type { MobileHomeModuleKey } from "@/lib/mobile-dashboard/modules";

// Reuse the Home palette itself, including its mobile gradient variants.
export const DASHBOARD_MODULE_COLORS = {
  publish: "home-tool-publish text-white",
  "newsletter-paper": "home-tool-newsletter text-white",
  visuals: "home-tool-posters text-white",
  automations: "home-tool-automations text-white",
  "shabbat-times": "home-tool-automations text-white",
  "daily-study": "home-tool-torah text-white",
  "birthdays-yahrzeit": "home-tool-email text-white",
  "event-reminders": "bg-gradient-to-br from-[#7c2d92] to-[#4a044e] text-white",
  "photo-recap": "bg-gradient-to-br from-[#0e7490] to-[#164e63] text-white",
  torah: "bg-gradient-to-br from-[#f59e0b] via-[#ea580c] to-[#c2410c] text-white",
  contacts: "home-tool-email text-white",
  targeted: "bg-gradient-to-br from-[#06b6d4] via-[#0891b2] to-[#155e75] text-white",
  "email-reviews": "bg-gradient-to-br from-[#475569] to-[#0f172a] text-white",
  email: "home-tool-email text-white",
  reviews: "home-tool-shop text-[#24114f]",
  whatsapp: "home-tool-torah text-white",
  website: "home-tool-publish text-white",
  seo: "home-tool-newsletter text-white",
  shop: "home-tool-shop text-[#24114f]",
  assistance: "home-tool-newsletter text-white",
} satisfies Record<MobileHomeModuleKey, string>;

export const DASHBOARD_MENU_COLORS = DASHBOARD_MODULE_COLORS;
