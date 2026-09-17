// Presentation-only tokens shared with the mobile dashboard. No data loaders.
export const MOBILE_HOME_HEADER_CLASS =
  "relative overflow-hidden rounded-b-[46%_2.4rem] bg-[radial-gradient(circle_at_68%_9%,#6822b5_0%,#421388_38%,#210763_100%)] px-5 pb-9 pt-[max(1.2rem,env(safe-area-inset-top))] text-white shadow-[0_18px_35px_rgba(43,8,104,0.2)]";
export const MOBILE_ACTION_CARD_CLASS =
  "relative flex min-h-[118px] items-center gap-2 overflow-hidden rounded-[1.8rem] border border-white/25 px-3 py-5 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),inset_0_-1px_0_rgba(0,0,0,0.12),0_14px_28px_rgba(30,41,59,0.16)] transition-[transform,box-shadow] duration-200 active:scale-[0.975] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_5px_12px_rgba(30,41,59,0.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#36506d]/25 max-[520px]:min-h-[132px] max-[520px]:flex-col max-[520px]:justify-center max-[520px]:gap-2.5 max-[520px]:text-center";
export const MODULE_COLORS = {
  publish: "bg-[#2962ff]",
  newsletter: "bg-[#7b61ff]",
  posters: "bg-[#e84393]",
  automations: "bg-[#2f7e88]",
  torah: "bg-[#80652d]",
  contacts: "bg-[#ff6b5e]",
  targeted: "bg-[#a25064]",
  email: "bg-[#a34d72]",
  reviews: "bg-[#b07b32]",
  whatsapp: "bg-[#357e62]",
  website: "bg-[#426d9e]",
  seo: "bg-[#596d9a]",
  shop: "bg-[#a86639]",
  travel: "bg-[#586c8d]",
} as const;
export const POSTER_HEADER_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_78%_8%,#8037ce_0%,#421388_48%,#210763_100%)] px-5 py-6 text-white shadow-[0_24px_58px_rgba(49,13,108,0.26)] sm:px-8 sm:py-8";
export const NEWSLETTER_HEADER_CLASS =
  "relative overflow-hidden rounded-b-[2.4rem] bg-[radial-gradient(circle_at_82%_0%,#36506d_0%,#17253f_48%,#0f1c2e_100%)] px-5 pb-6 pt-7 text-white shadow-[0_18px_35px_rgba(23,37,63,0.2)] sm:rounded-[2rem] sm:px-8";
