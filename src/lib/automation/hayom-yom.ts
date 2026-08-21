import type { createAdminClient } from "@/lib/supabase/admin";
import { canAccessAdmin } from "@/lib/admin-access";
import { getBillingConfig } from "@/lib/billing";
import { stripe } from "@/lib/stripe";
import { getNextWeeklyRunAt } from "./shabbat-times";

type Admin = ReturnType<typeof createAdminClient>;

export const HAYOM_YOM_AUTOMATION_NAME = "Hayom Yom et Sefer Hamitsvot";
export const HAYOM_YOM_TIME = "10:00";
export const HAYOM_YOM_SOURCE = "https://www.loubavitch.fr";
export const HAYOM_YOM_ALLOWED_DAYS = [0, 1, 2, 3, 4, 5] as const;

export type HayomYomStatus = "active" | "paused";
export const HAYOM_YOM_CHANNELS = ["FACEBOOK", "INSTAGRAM"] as const;
export type HayomYomChannel = (typeof HAYOM_YOM_CHANNELS)[number];
export type HayomYomSettings = {
  status: HayomYomStatus;
  days: number[];
  time: "10:00";
  timezone: string;
  channels: HayomYomChannel[];
};

export type DailyStudy = {
  dateLabel: string;
  hayomYom: string;
  hayomYomUrl: string;
  seferHamitsvot: string;
  seferHamitsvotUrl: string;
  facebookText: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizeHayomYomDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(Number)))
    .filter((day) => Number.isInteger(day) && HAYOM_YOM_ALLOWED_DAYS.includes(day as never))
    .sort((left, right) => left - right);
}

export function normalizeHayomYomChannels(value: unknown): HayomYomChannel[] {
  if (!Array.isArray(value)) return ["FACEBOOK"];
  const channels = value.filter((channel): channel is HayomYomChannel =>
    typeof channel === "string" && HAYOM_YOM_CHANNELS.includes(channel as HayomYomChannel)
  );
  return Array.from(new Set(channels));
}

export function getHayomYomSettings(triggerConfig: unknown): HayomYomSettings | null {
  if (!isRecord(triggerConfig) || !isRecord(triggerConfig.hayomYomSettings)) return null;
  const value = triggerConfig.hayomYomSettings;
  const days = normalizeHayomYomDays(value.days);
  if (days.length === 0) return null;
  return {
    status: value.status === "paused" ? "paused" : "active",
    days,
    time: HAYOM_YOM_TIME,
    timezone: typeof value.timezone === "string" && value.timezone ? value.timezone : "Europe/Paris",
    channels: normalizeHayomYomChannels(value.channels),
  };
}

export function nextHayomYomRunAt(settings: HayomYomSettings, from = new Date()) {
  const candidates = settings.days.map((dayOfWeek) => getNextWeeklyRunAt({
    dayOfWeek,
    time: HAYOM_YOM_TIME,
    timezone: settings.timezone,
    from,
  }));
  return candidates.sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
}

export async function getHayomYomAccess(params: {
  admin: Admin;
  communityId: string;
  profile?: { email: string; role: string } | null;
}) {
  if (params.profile && canAccessAdmin(params.profile as never)) {
    return { allowed: true, reason: "super_admin" as const };
  }

  const [{ data: community }, { data: subscription }, billingConfig] = await Promise.all([
    params.admin.from("Community").select("plan").eq("id", params.communityId).maybeSingle(),
    params.admin.from("Subscription").select("stripePriceId, plan, status")
      .eq("communityId", params.communityId)
      .eq("status", "ACTIVE")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getBillingConfig(params.admin),
  ]);

  if (!subscription) return { allowed: false, reason: "inactive_subscription" as const };
  if (community?.plan === "ENTERPRISE" || subscription.plan === "ENTERPRISE") {
    return { allowed: true, reason: "business" as const };
  }
  if (community?.plan !== "PROFESSIONAL" && subscription.plan !== "PROFESSIONAL") {
    return { allowed: false, reason: "wrong_plan" as const };
  }
  if (!subscription.stripePriceId || subscription.stripePriceId.startsWith("manual-")) {
    return { allowed: true, reason: "paid_subscription" as const };
  }

  try {
    const price = await stripe.prices.retrieve(subscription.stripePriceId);
    return price.unit_amount === billingConfig.basePriceCents
      ? { allowed: true, reason: "full_price_pro" as const }
      : { allowed: false, reason: "launch_price" as const };
  } catch (error) {
    console.error("[Hayom Yom] Vérification Stripe impossible:", error);
    return { allowed: false, reason: "stripe_unavailable" as const };
  }
}

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ",
    eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", ugrave: "ù",
    ocirc: "ô", icirc: "î", ccedil: "ç", laquo: "«", raquo: "»",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const hex = code[1]?.toLowerCase() === "x";
      const parsed = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function htmlToText(value: string) {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function classContent(html: string, className: string) {
  const expression = new RegExp(`<div[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
  return htmlToText(expression.exec(html)?.[1] ?? "");
}

function sourceDateLabel(html: string) {
  const match = /<div[^>]+class=["'][^"']*\bdate\b[^"']*\btoday\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);
  return htmlToText(match?.[1] ?? "");
}

function absoluteSourceUrl(path: string) {
  return new URL(decodeHtml(path), HAYOM_YOM_SOURCE).toString();
}

function eventUrl(listHtml: string, slug: "hayom-yom" | "sefer-hamitsvot") {
  const matches = Array.from(listHtml.matchAll(new RegExp(`href=["']([^"']+/\\d+/${slug}(?:\\?[^"']*)?)["']`, "gi")));
  const href = matches.at(-1)?.[1];
  if (!href) throw new Error(`Rubrique ${slug} introuvable pour cette date.`);
  return absoluteSourceUrl(href);
}

async function fetchSource(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "EasyCom-IA/1.0 (+https://easycom-ai.com)" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Source Loubavitch indisponible (${response.status}).`);
  return response.text();
}

export async function fetchDailyStudy(dateISO: string): Promise<DailyStudy> {
  const [year, month, day] = dateISO.split("-");
  if (!year || !month || !day) throw new Error("Date d'étude invalide.");
  const listUrl = `${HAYOM_YOM_SOURCE}/index.php?option=com_jevents&view=day&layout=listevents&Itemid=247&year=${year}&month=${month}&day=${day}`;
  const listHtml = await fetchSource(listUrl);
  const hayomYomUrl = eventUrl(listHtml, "hayom-yom");
  const seferHamitsvotUrl = eventUrl(listHtml, "sefer-hamitsvot");
  const [hayomHtml, seferHtml] = await Promise.all([fetchSource(hayomYomUrl), fetchSource(seferHamitsvotUrl)]);

  const expectedSourceDate = `${month}.${day}.${year}`;
  if (!hayomHtml.includes(expectedSourceDate) || !seferHtml.includes(expectedSourceDate)) {
    throw new Error("Les études récupérées ne correspondent pas à la date demandée.");
  }

  const dateLabel = sourceDateLabel(hayomHtml);
  const hayomParts = [
    classContent(hayomHtml, "jitem-houmach"),
    classContent(hayomHtml, "jitem-hayomyom-tanya"),
    classContent(hayomHtml, "jitem-fulltext"),
  ].filter(Boolean);
  const seferParts = [
    classContent(seferHtml, "event-desc"),
    classContent(seferHtml, "jitem-heading"),
    classContent(seferHtml, "jitem-introtext"),
  ].filter(Boolean);
  if (!dateLabel || hayomParts.length === 0 || seferParts.length === 0) {
    throw new Error("Le contenu des études du jour est incomplet.");
  }

  const hayomYom = hayomParts.join("\n\n");
  const seferHamitsvot = seferParts.join("\n\n");
  const facebookText = [
    "📖 HAYOM YOM",
    dateLabel,
    hayomYom,
    `Lire sur Beth Loubavitch : ${hayomYomUrl}`,
    "",
    "📜 SEFER HAMITSVOT",
    dateLabel,
    seferHamitsvot,
    `Lire sur Beth Loubavitch : ${seferHamitsvotUrl}`,
    "",
    "Source : Beth Loubavitch – loubavitch.fr",
  ].filter((part) => part !== "").join("\n\n");

  return { dateLabel, hayomYom, hayomYomUrl, seferHamitsvot, seferHamitsvotUrl, facebookText };
}
