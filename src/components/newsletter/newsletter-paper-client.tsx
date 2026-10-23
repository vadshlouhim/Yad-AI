"use client";
/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { NewsletterDocument, type NewsletterDocumentHandle } from "@/components/newsletter/newsletter-document";
import { NewsletterRevision } from "./newsletter-revision";
import { PhotoCaptions } from "./photo-captions";
import { parseLayoutPreferences, type NewsletterLayoutPreferences, type NewsletterRevision as Revision } from "@/lib/newsletter/revision";
import type { NewsletterComposition, NewsletterDocumentData } from "@/lib/newsletter/document-layout";
import { estimateNewsletterFill } from "@/lib/newsletter/layout-estimate";
import { NEWSLETTER_ERROR_CODES, newsletterErrorCode } from "@/lib/newsletter/errors";
import { inlineNewsletterExportImages, NEWSLETTER_IMAGE_ACCEPT, resolveNewsletterBanner, uploadNewsletterBatch, uploadNewsletterImage } from "@/lib/newsletter/media";
import { createDraftSaveQueue } from "@/lib/newsletter/save-queue";
import { limitNewsletterText, NEWSLETTER_EVENT_INTRO_LIMIT, NEWSLETTER_INTRO_LIMIT, NEWSLETTER_PARASHA_LIMIT, NEWSLETTER_PHOTO_LIMIT, NEWSLETTER_POSTER_LIMIT, NEWSLETTER_RAV_WORD_LIMIT, NEWSLETTER_SEFER_LIMIT, NEWSLETTER_SPECIFIC_EVENT_LIMIT } from "@/lib/newsletter/limits";
import { newsletterLogoImageUrl } from "@/lib/newsletter/media-path";
import { parseNewsletterLabels, resolveNewsletterLabels, type NewsletterLabelKey, type NewsletterLabels } from "@/lib/newsletter/labels";
import { NEWSLETTER_CHALLOT_ICON_URL } from "@/lib/newsletter/kiddush";
import type { NewsletterStudy } from "@/lib/newsletter/shabbat-study";
import {
  BookOpen,
  CalendarDays,
  Cake,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CloudOff,
  Download,
  Eye,
  Gift,
  HandHeart,
  HeartHandshake,
  ImagePlus,
  LayoutList,
  Loader2,
  PenLine,
  Pencil,
  Plus,
  Trash2,
  ArrowUpRight,
  Store,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { outputIntlLocale, parseOutputLocale, type OutputLocale } from "@/lib/ai/output-locale";
import { localizedHebrewDate, localizedParasha } from "@/lib/newsletter/religious-locale";
import { NEWSLETTER_DRAFT_VERSION, resolveNewsletterDraftLocale } from "@/lib/newsletter/draft-locale";

export type NewsletterEvent = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  category: string | null;
};

export type NewsletterBirthday = {
  id: string;
  name: string;
  hebrewDate: string;
  hebrewDateHe?: string;
  gregorianDate: string;
};

export type NewsletterShabbat = {
  date: string;
  hebrewDate: string | null;
  parasha: string | null;
  entry: string | null;
  exit: string | null;
  sourceUrl?: string | null;
};

export type CommunityInfo = {
  id: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  city: string;
  timezone: string;
  donationUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isBethHabad: boolean;
  newsletterLabels?: Partial<NewsletterLabels>;
};

export type ModuleKey = "ravWord" | "photos" | "posters" | "parness" | "birthdays" | "kiddush" | "events" | "specificEvent" | "restaurantAd" | "support" | "shabbat" | "seferHamitsvot";
type EditorStep = "modules" | "content" | "preview";

type ModuleConfig = {
  key: ModuleKey;
  titleKey: string;
  icon: LucideIcon;
  locked?: boolean;
};

export type UploadedPhoto = {
  id: string;
  url: string;
  name: string;
  caption?: string;
  captionGroup?: string;
  groupCaption?: string;
};

export type NewsletterManualBirthday = {
  id: string;
  name: string;
  dateLabel: string;
};

type UploadTarget = "photos" | "posters" | "partnerAds" | "banner";
type UploadQueueItem = {
  id: string;
  file: File;
  target: UploadTarget;
  name: string;
  status: "queued" | "uploading" | "success" | "error";
  error?: string;
};

export type GeneratedNewsletter = {
  title: string;
  subtitle: string;
  intro: string;
  ravWord: string;
  shabbatNote: string;
  eventIntro: string;
  restaurantAd: string;
  proofreadNote: string;
  warnings: string[];
};

export type NewsletterDraft = {
  version: typeof NEWSLETTER_DRAFT_VERSION;
  savedAt: number;
  outputLocale: OutputLocale;
  title: string;
  enabled: Record<ModuleKey, boolean>;
  editorStep: EditorStep;
  mobilePreviewPage: "front" | "back";
  parnessText: string;
  kiddushText: string;
  manualBirthdays: NewsletterManualBirthday[];
  specificEventText: string;
  seferHamitsvotText: string;
  labelOverrides: Partial<NewsletterLabels>;
  partnerAds: UploadedPhoto[];
  donationUrl: string;
  photos: UploadedPhoto[];
  posters: UploadedPhoto[];
  bannerPhotoUrl: string;
  generated: GeneratedNewsletter;
  layout?: NewsletterLayoutPreferences;
  previousRevision?: RevisionSnapshot | null;
};
type RevisionSnapshot = Pick<NewsletterDraft, "generated" | "parnessText" | "kiddushText" | "specificEventText" | "seferHamitsvotText" | "photos" | "posters" | "partnerAds" | "layout" | "outputLocale" | "labelOverrides">;

const MODULES: ModuleConfig[] = [
  { key: "seferHamitsvot", titleKey: "modules.seferHamitsvot", icon: BookOpen },
  { key: "ravWord", titleKey: "modules.ravWord", icon: BookOpen },
  { key: "photos", titleKey: "modules.photos", icon: ImagePlus },
  { key: "posters", titleKey: "modules.posters", icon: ImagePlus },
  { key: "parness", titleKey: "modules.parness", icon: HeartHandshake },
  { key: "birthdays", titleKey: "modules.birthdays", icon: Cake },
  { key: "kiddush", titleKey: "modules.kiddush", icon: Gift },
  { key: "specificEvent", titleKey: "modules.specificEvent", icon: CalendarDays },
  { key: "events", titleKey: "modules.events", icon: CalendarDays },
  { key: "restaurantAd", titleKey: "modules.restaurantAd", icon: Store },
  { key: "support", titleKey: "modules.support", icon: HandHeart },
  { key: "shabbat", titleKey: "modules.shabbat", icon: Clock3 },
];

const ESSENTIAL_MODULE_KEYS = new Set<ModuleKey>(["shabbat", "ravWord", "events", "photos"]);
const ESSENTIAL_MODULES = MODULES.filter((module) => ESSENTIAL_MODULE_KEYS.has(module.key));
const OPTIONAL_MODULES = MODULES.filter((module) => !ESSENTIAL_MODULE_KEYS.has(module.key));

const DEFAULT_ENABLED: Record<ModuleKey, boolean> = {
  seferHamitsvot: false,
  ravWord: true,
  photos: true,
  posters: false,
  parness: true,
  birthdays: true,
  kiddush: true,
  events: true,
  specificEvent: false,
  restaurantAd: false,
  support: true,
  shabbat: true,
};

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(elements: Array<HTMLElement | null>, unavailableMessage: string) {
  const images = elements.flatMap((element) => element ? Array.from(element.querySelectorAll("img")) : []);
  await Promise.all(images.map((image) => {
    const failure = () => new Error(unavailableMessage);
    if (image.complete) return image.naturalWidth > 0 ? Promise.resolve() : Promise.reject(failure());
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
      };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(failure()); };
      const timer = setTimeout(failed, 15_000);
      image.addEventListener("load", loaded, { once: true });
      image.addEventListener("error", failed, { once: true });
    });
  }));
}

function filenamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
}

function initialGenerated(locale: OutputLocale = "fr"): GeneratedNewsletter {
  return {
    title: locale === "he" ? "השבתון" : "Le Chabbat Mag",
    subtitle: locale === "he" ? "דף השבוע של הקהילה" : "Au cœur de notre communauté",
    intro: "",
    ravWord: "",
    shabbatNote: "",
    eventIntro: "",
    restaurantAd: "",
    proofreadNote: locale === "he" ? "מוכן לבדיקה לפני ההדפסה." : "Prêt pour relecture avant impression.",
    warnings: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function draftText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function draftUploads(value: unknown): UploadedPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.url !== "string" || !item.url.trim()) return [];
    return [{
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      url: item.url,
      name: typeof item.name === "string" ? item.name : "Image",
      caption: draftText(item.caption),
      captionGroup: draftText(item.captionGroup),
      groupCaption: draftText(item.groupCaption),
    }];
  });
}

function draftManualBirthdays(value: unknown): NewsletterManualBirthday[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = draftText(item.name).slice(0, 120);
    const dateLabel = draftText(item.dateLabel).slice(0, 80);
    if (!name.trim() && !dateLabel.trim()) return [];
    return [{ id: draftText(item.id, crypto.randomUUID()), name, dateLabel }];
  }).slice(0, 20);
}

export function parseNewsletterDraft(
  value: unknown,
  donationDefault: string,
  bannerDefault: string,
  outputLocaleDefault: OutputLocale = "fr",
): NewsletterDraft | null {
  if (!isRecord(value) || ![1, 2, 3, 4].includes(Number(value.version))) return null;
  const enabledValue = isRecord(value.enabled) ? value.enabled : {};
  const generatedValue = isRecord(value.generated) ? value.generated : {};
  // Versions 1 and 2 predate an explicit, trustworthy output-language choice.
  // They are existing French drafts, even if the first i18n build autosaved the
  // current interface locale into outputLocale.
  const storedLocale = resolveNewsletterDraftLocale(value.version, value.outputLocale, outputLocaleDefault);
  if (storedLocale !== outputLocaleDefault) return null;
  const outputLocale = outputLocaleDefault;
  const defaults = initialGenerated(outputLocale);
  const storedTitle = draftText(generatedValue.title, draftText(value.title, defaults.title)).trim();
  const safeTitle = outputLocale === "he" && (storedTitle.length < 3 || !/[\u0590-\u05ff]/.test(storedTitle)) ? defaults.title : storedTitle || defaults.title;
  const previous = isRecord(value.previousRevision) ? parseNewsletterDraft({ ...value.previousRevision, version: NEWSLETTER_DRAFT_VERSION, previousRevision: undefined }, donationDefault, bannerDefault, outputLocale) : null;
  const editorStep: EditorStep = value.editorStep === "content" || value.editorStep === "preview" ? value.editorStep : "modules";
  return {
    version: NEWSLETTER_DRAFT_VERSION,
    layout: parseLayoutPreferences(value.layout),
    previousRevision: previous ? { generated: previous.generated, parnessText: previous.parnessText, kiddushText: previous.kiddushText, specificEventText: previous.specificEventText, seferHamitsvotText: previous.seferHamitsvotText, photos: previous.photos, posters: previous.posters, partnerAds: previous.partnerAds, layout: previous.layout, outputLocale: previous.outputLocale, labelOverrides: previous.labelOverrides } : null,
    savedAt: typeof value.savedAt === "number" ? value.savedAt : 0,
    outputLocale,
    title: draftText(value.title, defaults.title),
    enabled: Object.fromEntries(MODULES.map((module) => [
      module.key,
      module.locked ? true : typeof enabledValue[module.key] === "boolean" ? enabledValue[module.key] : module.key === "support" ? Boolean(donationDefault) : DEFAULT_ENABLED[module.key],
    ])) as Record<ModuleKey, boolean>,
    editorStep,
    mobilePreviewPage: value.mobilePreviewPage === "back" ? "back" : "front",
    parnessText: draftText(value.parnessText),
    kiddushText: draftText(value.kiddushText),
    manualBirthdays: draftManualBirthdays(value.manualBirthdays),
    specificEventText: draftText(value.specificEventText).slice(0, 1200),
    seferHamitsvotText: draftText(value.seferHamitsvotText).slice(0, NEWSLETTER_SEFER_LIMIT),
    labelOverrides: parseNewsletterLabels(value.labelOverrides),
    partnerAds: draftUploads(value.partnerAds),
    donationUrl: draftText(value.donationUrl, donationDefault),
    photos: draftUploads(value.photos),
    posters: draftUploads(value.posters),
    bannerPhotoUrl: resolveNewsletterBanner(value.bannerPhotoUrl, bannerDefault),
    generated: {
      title: safeTitle,
      subtitle: outputLocale === "he" && !/[\u0590-\u05ff]/.test(draftText(generatedValue.subtitle)) ? defaults.subtitle : draftText(generatedValue.subtitle, defaults.subtitle),
      intro: draftText(generatedValue.intro, defaults.intro),
      ravWord: limitNewsletterText(draftText(generatedValue.ravWord), NEWSLETTER_RAV_WORD_LIMIT),
      shabbatNote: draftText(generatedValue.shabbatNote),
      eventIntro: draftText(generatedValue.eventIntro),
      restaurantAd: draftText(generatedValue.restaurantAd),
      proofreadNote: draftText(generatedValue.proofreadNote, defaults.proofreadNote),
      warnings: Array.isArray(generatedValue.warnings) ? generatedValue.warnings.filter((item): item is string => typeof item === "string" && (outputLocale === "fr" || /[\u0590-\u05ff]/.test(item))).slice(0, 10) : [],
    },
  };
}

function sameDraftContent(left: NewsletterDraft, right: NewsletterDraft) {
  return JSON.stringify({ ...left, savedAt: 0 }) === JSON.stringify({ ...right, savedAt: 0 });
}

export function NewsletterPaperClient({
  userId,
  community,
  initialEvents,
  initialBirthdays,
  initialShabbat,
  initialSeferHamitsvot = null,
}: {
  userId: string;
  community: CommunityInfo;
  initialEvents: NewsletterEvent[];
  initialBirthdays: NewsletterBirthday[];
  initialShabbat: NewsletterShabbat | null;
  initialSeferHamitsvot?: NewsletterStudy | null;
}) {
  const router = useRouter();
  const interfaceLocale = parseOutputLocale(useLocale());
  const t = useTranslations("newsletter");
  const localizedError = useCallback((error: unknown, fallback: string) => {
    const code = newsletterErrorCode(error);
    return code ? t(`errorCodes.${code}` as never) : fallback;
  }, [t]);
  const draftRequestError = useCallback((status: number, loading = false) => {
    const action = t(loading ? "errors.loadAction" : "errors.saveAction");
    if (status === 401) return t("errors.sessionExpired");
    if (status === 403) return t("errors.communityUnavailable");
    if (status === 404) return t("errors.draftNotFound", { action });
    if (status === 413) return t("errors.draftTooLarge");
    return t("errors.serverUnavailable", {
      action,
      status,
      detail: t(loading ? "errors.retryLoad" : "errors.keptLocal"),
    });
  }, [t]);
  const documentRef = useRef<NewsletterDocumentHandle>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadBusyRef = useRef(false);
  const latestDraftRef = useRef<NewsletterDraft | null>(null);
  const mountedRef = useRef(false);
  const serverUpdatedAtRef = useRef<string | null>(null);
  const serverReadyRef = useRef(false);
  const conflictRef = useRef(false);
  const loadedOnceRef = useRef(false);
  const [enabled, setEnabled] = useState<Record<ModuleKey, boolean>>(() => ({ ...DEFAULT_ENABLED, support: Boolean(community.donationUrl) }));
  const outputLocale = interfaceLocale;
  const [editorStep, setEditorStep] = useState<EditorStep>("modules");
  const [parashaOpen, setParashaOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [seferHamitsvotOpen, setSeferHamitsvotOpen] = useState(false);
  const [studyRetrying, startStudyRetry] = useTransition();
  // Retain the legacy field so version-1 drafts remain compatible.
  const mobilePreviewPage = "front" as const;
  const [parnessText, setParnessText] = useState("");
  const [kiddushText, setKiddushText] = useState("");
  const [manualBirthdays, setManualBirthdays] = useState<NewsletterManualBirthday[]>([]);
  const [specificEventText, setSpecificEventText] = useState("");
  const [seferHamitsvotText, setSeferHamitsvotText] = useState(initialSeferHamitsvot?.text ?? "");
  const [communityLabelDefaults] = useState<Partial<NewsletterLabels>>(community.newsletterLabels ?? {});
  const [labelOverrides, setLabelOverrides] = useState<Partial<NewsletterLabels>>({});
  const [partnerAds, setPartnerAds] = useState<UploadedPhoto[]>([]);
  const [donationUrl, setDonationUrl] = useState(community.donationUrl ?? "");
  const [savingDonationUrl, setSavingDonationUrl] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [posters, setPosters] = useState<UploadedPhoto[]>([]);
  const [bannerPhotoUrl, setBannerPhotoUrl] = useState(community.logoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [exporting, setExporting] = useState(false);
  const [preparingAction, setPreparingAction] = useState<"preview" | "print" | "pdf" | null>(null);
  const [generated, setGenerated] = useState<GeneratedNewsletter>(() => initialGenerated(interfaceLocale));
  const [ravSuggestion, setRavSuggestion] = useState("");
  const [ravSuggestionError, setRavSuggestionError] = useState<string | null>(null);
  const [ravSuggestionLoading, setRavSuggestionLoading] = useState(false);
  const [generationLoading, setGenerationLoading] = useState(false);
  const ravSuggestionBusyRef = useRef(false);
  const [layout, setLayout] = useState<NewsletterLayoutPreferences>({});
  const [previousRevision, setPreviousRevision] = useState<RevisionSnapshot | null>(null);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [shorteningField, setShorteningField] = useState<"intro" | "ravWord" | "shabbatNote" | "eventIntro" | "specificEventText" | null>(null);
  const [preparedRevision, setPreparedRevision] = useState<{ key: string; pages: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"restoring" | "saving" | "saved" | "offline" | "error">("restoring");
  const [serverReady, setServerReady] = useState(false);
  const [draftConflict, setDraftConflict] = useState(false);
  const [pendingServerDraft, setPendingServerDraft] = useState<NewsletterDraft | null>(null);
  const [retryLoadCount, setRetryLoadCount] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  // Set only when the content does not fit even after automatic tightening.
  const [needsMorePages, setNeedsMorePages] = useState(false);
  const [compositionReport, setCompositionReport] = useState({ pageCount: 2, omittedMedia: 0, flowFallback: false, oversizedBlocks: [] as string[] });
  const [overflowShortening, setOverflowShortening] = useState(false);

  const activeCount = useMemo(() => Object.values(enabled).filter(Boolean).length, [enabled]);
  const mayContainLegacyCuts = [[generated.intro, 180], [generated.ravWord, 850], [generated.shabbatNote, 620], [generated.eventIntro, 220]].some(([text, limit]) => typeof text === "string" && text.length === limit && !/[.!?…]$/.test(text.trim()));
  const visibleEvents = initialEvents;
  const deferredIds = useMemo(() => new Set(layout.deferredMediaIds ?? []), [layout.deferredMediaIds]);
  const visiblePhotos = useMemo(() => photos.filter(item => !deferredIds.has(item.id)), [deferredIds, photos]);
  const visiblePosters = useMemo(() => posters.filter(item => !deferredIds.has(item.id)), [deferredIds, posters]);
  const visiblePartnerAds = useMemo(() => partnerAds.filter(item => !deferredIds.has(item.id)), [deferredIds, partnerAds]);
  const communityResolvedLabels = useMemo(() => resolveNewsletterLabels(communityLabelDefaults, undefined, outputLocale), [communityLabelDefaults, outputLocale]);
  const resolvedLabels = useMemo(() => resolveNewsletterLabels(communityLabelDefaults, labelOverrides, outputLocale), [communityLabelDefaults, labelOverrides, outputLocale]);
  const localizedShabbat = useMemo<NewsletterShabbat | null>(() => initialShabbat ? ({
    ...initialShabbat,
    parasha: localizedParasha(initialShabbat.date, outputLocale, initialShabbat.parasha ?? ""),
    hebrewDate: localizedHebrewDate(initialShabbat.date, outputLocale, initialShabbat.hebrewDate ?? ""),
  }) : null, [initialShabbat, outputLocale]);
  const localizedStudy = useMemo<NewsletterStudy | null>(() => initialSeferHamitsvot ? ({
    ...initialSeferHamitsvot,
    dateLabel: new Intl.DateTimeFormat(outputIntlLocale(outputLocale), { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${initialSeferHamitsvot.date}T12:00:00Z`)),
    text: seferHamitsvotText,
  }) : null, [initialSeferHamitsvot, outputLocale, seferHamitsvotText]);
  const previewCommunity = { ...community, donationUrl };
  const outputEnabled = useMemo<Record<ModuleKey, boolean>>(() => ({
    seferHamitsvot: enabled.seferHamitsvot,
    ravWord: enabled.ravWord && Boolean(generated.ravWord.trim()),
    photos: enabled.photos && visiblePhotos.length > 0,
    posters: enabled.posters && visiblePosters.length > 0,
    parness: enabled.parness && Boolean(parnessText.trim()),
    birthdays: enabled.birthdays && (initialBirthdays.length > 0 || manualBirthdays.some((birthday) => birthday.name.trim())),
    kiddush: enabled.kiddush && Boolean(kiddushText.trim()),
    events: enabled.events && visibleEvents.length > 0,
    specificEvent: enabled.specificEvent && Boolean(specificEventText.trim()),
    restaurantAd: enabled.restaurantAd && visiblePartnerAds.length > 0,
    support: enabled.support && Boolean(donationUrl.trim()),
    shabbat: enabled.shabbat && Boolean(localizedShabbat),
  }), [donationUrl, enabled, generated.ravWord, initialBirthdays.length, localizedShabbat, kiddushText, manualBirthdays, parnessText, specificEventText, visibleEvents.length, visiblePartnerAds.length, visiblePhotos.length, visiblePosters.length]);
  const baseDocumentData: NewsletterDocumentData = {
    community: previewCommunity, enabled: outputEnabled, generated, parnessText, kiddushText,
    photos: visiblePhotos, posters: visiblePosters, partnerAds: visiblePartnerAds,
    events: visibleEvents, birthdays: initialBirthdays, manualBirthdays, specificEventText, labels: resolvedLabels, shabbat: localizedShabbat, bannerPhotoUrl: newsletterLogoImageUrl(bannerPhotoUrl),
    seferHamitsvot: localizedStudy,
    studyUnavailableMessage: t(initialSeferHamitsvot?.unavailableReason === "translation" ? "studyTranslationFailed" : "studyUnavailable"),
    outputLocale,
    layout,
  };
  const fillEstimate = estimateNewsletterFill(baseDocumentData);
  const pageLimit = layout.pageLimit ?? 2;
  const documentData: NewsletterDocumentData = {
    ...baseDocumentData,
    layout: {
      ...layout,
      density: layout.density ?? (fillEstimate.percent > 100 ? "compact" : "auto"),
    },
  };
  const showOverflow = useCallback(() => setNeedsMorePages(true), []);
  const reportedFallback = useRef("");
  const handleComposed = useCallback((report: NewsletterComposition) => {
    setNeedsMorePages(false);
    const summary = { pageCount: report.pages.length, omittedMedia: report.omittedMediaIds.length, flowFallback: Boolean(report.flowFallback), oversizedBlocks: report.oversizedBlocks ?? [] };
    setCompositionReport(current => JSON.stringify(current) === JSON.stringify(summary) ? current : summary);
    // Let the team know when the safety net was needed; never blocks the user.
    const signature = JSON.stringify(summary);
    if ((summary.flowFallback || summary.omittedMedia) && reportedFallback.current !== signature) {
      reportedFallback.current = signature;
      void fetch("/api/newsletter/layout-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...summary, outputLocale }) }).catch(() => undefined);
    }
  }, [outputLocale]);
  const compositionNote = compositionReport.pageCount > pageLimit
    ? t("overflow.extraPages", { count: compositionReport.pageCount })
    : compositionReport.flowFallback
      ? t("overflow.continued")
      : compositionReport.omittedMedia
        ? t("overflow.omitted", { count: compositionReport.omittedMedia })
        : null;
  const localDraftKey = useMemo(() => `easycom.newsletter.draft.${community.id}.${userId}.${outputLocale}`, [community.id, outputLocale, userId]);
  const draftSnapshot = useMemo<NewsletterDraft>(() => ({
    version: NEWSLETTER_DRAFT_VERSION,
    savedAt: Date.now(),
    outputLocale,
    title: generated.title,
    layout, previousRevision,
    enabled,
    editorStep,
    mobilePreviewPage,
    parnessText,
    kiddushText,
    manualBirthdays,
    specificEventText,
    seferHamitsvotText,
    labelOverrides,
    partnerAds,
    donationUrl,
    photos,
    posters,
    bannerPhotoUrl,
    generated,
  }), [bannerPhotoUrl, donationUrl, editorStep, enabled, generated, kiddushText, labelOverrides, manualBirthdays, mobilePreviewPage, outputLocale, parnessText, partnerAds, photos, posters, layout, previousRevision, seferHamitsvotText, specificEventText]);

  const applyDraft = useCallback((draft: NewsletterDraft) => {
    setLayout(draft.layout ?? {});
    setPreviousRevision(draft.previousRevision ?? null);
    setPreparedRevision(null);
    setEnabled(draft.enabled);
    setEditorStep(draft.editorStep);
    setParnessText(draft.parnessText);
    setKiddushText(draft.kiddushText);
    setManualBirthdays(draft.manualBirthdays);
    setSpecificEventText(draft.specificEventText);
    setSeferHamitsvotText(draft.seferHamitsvotText || initialSeferHamitsvot?.text || "");
    setLabelOverrides(draft.labelOverrides);
    setPartnerAds(draft.partnerAds);
    setDonationUrl(draft.donationUrl);
    setPhotos(draft.photos);
    setPosters(draft.posters);
    setBannerPhotoUrl(draft.bannerPhotoUrl);
    setGenerated(draft.generated);
    setRavSuggestion("");
    setRavSuggestionError(null);
  }, [initialSeferHamitsvot?.text]);

  function applyRevision(revision: Revision, pages: string[], key: string) {
    setPreviousRevision({ generated, parnessText, kiddushText, specificEventText, seferHamitsvotText, photos, posters, partnerAds, layout, outputLocale, labelOverrides });
    const { parnessText: parness, kiddushText: kiddush, ...texts } = revision.changes;
    setGenerated(current => ({
      ...current,
      ...texts,
      ...(texts.ravWord !== undefined ? { ravWord: limitNewsletterText(texts.ravWord, NEWSLETTER_RAV_WORD_LIMIT) } : {}),
    }));
    if (parness !== undefined) setParnessText(parness);
    if (kiddush !== undefined) setKiddushText(kiddush);
    setLayout(current => ({ ...current, ...revision.layout }));
    setPreparedRevision({ pages, key });
    setError(null);
  }

  function undoRevision() {
    if (!previousRevision) return;
    setGenerated(previousRevision.generated);
    setParnessText(previousRevision.parnessText);
    setKiddushText(previousRevision.kiddushText);
    setSpecificEventText(previousRevision.specificEventText);
    setSeferHamitsvotText(previousRevision.seferHamitsvotText);
    setPhotos(previousRevision.photos);
    setPosters(previousRevision.posters);
    setPartnerAds(previousRevision.partnerAds);
    setLayout(previousRevision.layout ?? {});
    setLabelOverrides(previousRevision.labelOverrides);
    setPreparedRevision(null);
    setPreviousRevision(null);
    setError(null);
  }

  async function requestRavSuggestion() {
    if (ravSuggestionBusyRef.current) return;
    ravSuggestionBusyRef.current = true;
    setRavSuggestionLoading(true);
    setRavSuggestion("");
    setRavSuggestionError(null);
    try {
      const response = await fetch("/api/newsletter/rav-suggestion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outputLocale }) });
      const payload = await response.json().catch(() => null) as { suggestion?: unknown; error?: unknown } | null;
      if (!response.ok) throw new Error(t("errors.ravUnavailable"));
      if (typeof payload?.suggestion !== "string" || !payload.suggestion.trim()) throw new Error(t("errors.ravEmpty"));
      setRavSuggestion(limitNewsletterText(payload.suggestion, NEWSLETTER_RAV_WORD_LIMIT));
    } catch (requestError) {
      setRavSuggestionError(requestError instanceof Error ? requestError.message : t("errors.ravUnavailable"));
    } finally {
      ravSuggestionBusyRef.current = false;
      setRavSuggestionLoading(false);
    }
  }

  async function generateEditorialContent() {
    if (generationLoading) return;
    setGenerationLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/newsletter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(65_000),
        body: JSON.stringify({ title: generated.title, modules: enabled, parnessText, kiddushText, photoCount: photos.length, outputLocale }),
      });
      const payload = await response.json().catch(() => null) as Partial<GeneratedNewsletter> & { error?: unknown } | null;
      if (!response.ok || !payload) throw new Error(t("generate.error"));
      setPreviousRevision({ generated, parnessText, kiddushText, specificEventText, seferHamitsvotText, photos, posters, partnerAds, layout, outputLocale, labelOverrides });
      setGenerated((current) => ({
        ...current,
        ...payload,
        title: current.title,
        subtitle: typeof payload.subtitle === "string" ? payload.subtitle : current.subtitle,
        intro: limitNewsletterText(typeof payload.intro === "string" ? payload.intro : current.intro, NEWSLETTER_INTRO_LIMIT),
        ravWord: limitNewsletterText(typeof payload.ravWord === "string" ? payload.ravWord : current.ravWord, NEWSLETTER_RAV_WORD_LIMIT),
        shabbatNote: limitNewsletterText(typeof payload.shabbatNote === "string" ? payload.shabbatNote : current.shabbatNote, NEWSLETTER_PARASHA_LIMIT),
        eventIntro: limitNewsletterText(typeof payload.eventIntro === "string" ? payload.eventIntro : current.eventIntro, NEWSLETTER_EVENT_INTRO_LIMIT),
        warnings: Array.isArray(payload.warnings) ? payload.warnings.map(warning => t(`warningCodes.${warning}` as never)) : current.warnings,
      }));
      setPreparedRevision(null);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : t("generate.error"));
    } finally {
      setGenerationLoading(false);
    }
  }

  async function shortenText(field: "intro" | "ravWord" | "shabbatNote" | "eventIntro" | "specificEventText", maxLength: number) {
    if (shorteningField) return;
    const source = field === "specificEventText" ? specificEventText : generated[field];
    if (!source.trim()) return;
    setShorteningField(field);
    setError(null);
    try {
      const response = await fetch("/api/newsletter/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(65_000),
        body: JSON.stringify({ text: source, maxLength: Math.floor(maxLength * 0.72), outputLocale }),
      });
      const payload = await response.json().catch(() => null) as { text?: unknown; error?: unknown } | null;
      if (!response.ok || typeof payload?.text !== "string") throw new Error(t("shorten.error"));
      setPreviousRevision({ generated, parnessText, kiddushText, specificEventText, seferHamitsvotText, photos, posters, partnerAds, layout, outputLocale, labelOverrides });
      if (field === "specificEventText") setSpecificEventText(payload.text);
      else setGenerated((current) => ({ ...current, [field]: payload.text as string }));
      setPreparedRevision(null);
    } catch (shortenError) {
      setError(shortenError instanceof Error ? shortenError.message : t("shorten.error"));
    } finally {
      setShorteningField(null);
    }
  }

  const saveQueue = useMemo(() => createDraftSaveQueue<NewsletterDraft>(async (draft) => {
    if (!serverReadyRef.current || conflictRef.current) return;
    try {
      const response = await fetch(`/api/newsletter/draft?locale=${outputLocale}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, expectedUpdatedAt: serverUpdatedAtRef.current }),
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 409) {
        conflictRef.current = true;
        serverReadyRef.current = false;
        setServerReady(false);
        setDraftConflict(true);
        setRetryLoadCount((count) => count + 1);
        return;
      }
      if (!response.ok) throw new Error(draftRequestError(response.status));
      const result = await response.json() as { updatedAt?: string };
      serverUpdatedAtRef.current = result.updatedAt ?? null;
      if (mountedRef.current && latestDraftRef.current === draft) setDraftStatus("saved");
    } catch (saveError) {
      if (!mountedRef.current) return;
      serverReadyRef.current = false;
      setServerReady(false);
      setDraftStatus("offline");
      setError(saveError instanceof Error ? saveError.message : t("errors.saveOffline"));
    }
  }), [draftRequestError, outputLocale, t]);

  useEffect(() => {
    mountedRef.current = true;
    const retry = () => setRetryLoadCount((count) => count + 1);
    window.addEventListener("online", retry);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", retry);
      // The local copy is written synchronously on every edit and pagehide.
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboard = () => {
      const focused = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      setKeyboardOpen(focused && window.innerHeight - viewport.height > 120);
    };
    viewport.addEventListener("resize", updateKeyboard);
    document.addEventListener("focusin", updateKeyboard);
    document.addEventListener("focusout", updateKeyboard);
    return () => {
      viewport.removeEventListener("resize", updateKeyboard);
      document.removeEventListener("focusin", updateKeyboard);
      document.removeEventListener("focusout", updateKeyboard);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let localDraft: NewsletterDraft | null = null;
    try {
      localDraft = parseNewsletterDraft(
        JSON.parse(window.localStorage.getItem(localDraftKey) ?? "null"),
        community.donationUrl ?? "",
            community.logoUrl ?? "",
            interfaceLocale,
      );
      if (!loadedOnceRef.current && localDraft) applyDraft(localDraft);
    } catch {
      localDraft = null;
    }
    const firstLoad = !loadedOnceRef.current;

    fetch(`/api/newsletter/draft?locale=${outputLocale}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) })
      .then(async (response) => {
        if (!response.ok) throw new Error(draftRequestError(response.status, true));
        return response.json() as Promise<{ draft?: unknown; updatedAt?: string }>;
      })
      .then((data) => {
        if (!active) return;
        loadedOnceRef.current = true;
        const serverDraft = parseNewsletterDraft(
          data?.draft,
          community.donationUrl ?? "",
          community.logoUrl ?? "",
          interfaceLocale,
        );
        const previousServerRevision = serverUpdatedAtRef.current;
        serverUpdatedAtRef.current = data.updatedAt ?? null;
        if (serverDraft && localDraft && !sameDraftContent(serverDraft, localDraft) && (conflictRef.current || (!firstLoad && data.updatedAt !== previousServerRevision))) {
          setPendingServerDraft(serverDraft);
          setDraftConflict(true);
          conflictRef.current = true;
          setDraftStatus("offline");
          setError(t("errors.newerDraft"));
        } else {
          if (firstLoad && serverDraft && (!localDraft || serverDraft.savedAt > localDraft.savedAt)) applyDraft(serverDraft);
          setPendingServerDraft(null);
          setDraftConflict(false);
          conflictRef.current = false;
          serverReadyRef.current = true;
          setServerReady(true);
          setDraftStatus(localDraft && (!serverDraft || localDraft.savedAt > serverDraft.savedAt) ? "saving" : "saved");
          setError(null);
        }
        setDraftReady(true);
      })
      .catch((loadError) => {
        if (!active) return;
        loadedOnceRef.current = true;
        serverReadyRef.current = false;
        setServerReady(false);
        setDraftReady(Boolean(localDraft) || Boolean(latestDraftRef.current));
        setDraftStatus(localDraft ? "offline" : "error");
        setError(loadError instanceof Error ? loadError.message : t("errors.loadUnavailable"));
      });

    return () => { active = false; };
  }, [applyDraft, community.donationUrl, community.logoUrl, draftRequestError, interfaceLocale, localDraftKey, outputLocale, retryLoadCount, t]);

  useEffect(() => {
    if (!draftReady) return;
    latestDraftRef.current = draftSnapshot;
    const serialized = JSON.stringify(draftSnapshot);
    let savedLocally = false;
    try {
      window.localStorage.setItem(localDraftKey, serialized);
      savedLocally = true;
    } catch {
      setDraftStatus("error");
      setError(t("errors.localStorage"));
    }
    if (!savedLocally) return;
    setDraftStatus(serverReadyRef.current && !conflictRef.current ? "saving" : "offline");
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    if (serverReadyRef.current && !conflictRef.current) {
      draftSaveTimerRef.current = setTimeout(() => { void saveQueue.push(draftSnapshot); }, 700);
    }

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [draftReady, draftSnapshot, localDraftKey, saveQueue, serverReady, draftConflict, t]);

  useEffect(() => {
    if (!draftReady) return;
    const saveBeforeLeaving = () => {
      try {
        window.localStorage.setItem(localDraftKey, JSON.stringify(draftSnapshot));
      } catch {
        // Storage can be disabled or full; the autosave status reports this.
      }
      // The local copy is durable. Avoid racing an in-flight server save with
      // an unordered keepalive write (which is also limited to 64 KB).
    };
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => window.removeEventListener("pagehide", saveBeforeLeaving);
  }, [draftReady, draftSnapshot, localDraftKey]);

  function toggleModule(key: ModuleKey) {
    setEnabled((current) => ({ ...current, [key]: !current[key] }));
  }

  function renderModuleToggle(module: ModuleConfig) {
    const Icon = module.icon;
    const isActive = enabled[module.key];

    return (
      <button
        key={module.key}
        type="button"
        onClick={() => toggleModule(module.key)}
        aria-pressed={isActive}
        className={cn(
          "group flex min-h-[66px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-start transition active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25",
          isActive
            ? "border-emerald-300 bg-[#eaf8f2] text-[#123d39] shadow-[0_8px_20px_rgba(16,100,85,0.07)]"
            : "border-slate-200 bg-white text-slate-700 hover:border-[#8acbbb] hover:bg-[#f5fbf8]"
        )}
      >
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", isActive ? "bg-[#0f766e] text-white" : "bg-[#edf2f4] text-[#46616e]")}>
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-snug">{t(module.titleKey)}</span>
          {module.locked ? <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{t("alwaysIncluded")}</span> : null}
        </span>
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-black", isActive ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-slate-300 bg-white text-transparent")}>
          ✓
        </span>
      </button>
    );
  }

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>, target: UploadTarget) {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (uploadBusyRef.current || !selected.length) return;
    const remaining = Math.max(0, target === "photos" ? NEWSLETTER_PHOTO_LIMIT - photos.length : target === "posters" ? NEWSLETTER_POSTER_LIMIT - posters.length : target === "partnerAds" ? 3 - partnerAds.length : 1);
    const files = selected.slice(0, remaining);
    if (!files.length) { setError(t("errors.limitReached")); return; }
    const queueItems: UploadQueueItem[] = files.map((file) => ({ id: crypto.randomUUID(), file, target, name: file.name, status: "queued" }));
    setUploadQueue(queueItems);
    uploadBusyRef.current = true;
    setUploading(true);
    setError(null);
    try {
      const errors = await uploadNewsletterBatch(files, async (file) => {
        const item = queueItems.find((queued) => queued.file === file)!;
        setUploadQueue((current) => current.map((queued) => queued.id === item.id ? { ...queued, status: "uploading", error: undefined } : queued));
        try {
          const uploaded = await uploadNewsletterImage(file, target === "banner" ? "logo" : "image");
          setUploadQueue((current) => current.map((queued) => queued.id === item.id ? { ...queued, status: "success", error: undefined } : queued));
          return uploaded;
        } catch (uploadError) {
          const message = localizedError(uploadError, t("errors.uploadUnavailable"));
          setUploadQueue((current) => current.map((queued) => queued.id === item.id ? { ...queued, status: "error", error: message } : queued));
          throw uploadError;
        }
      }, (uploaded) => {
        if (target === "banner") setBannerPhotoUrl(uploaded.url);
        else if (target === "photos") setPhotos((current) => [...current, uploaded]);
        else if (target === "posters") setPosters((current) => [...current, uploaded]);
        else setPartnerAds((current) => [...current, uploaded]);
      }, (completed, total) => setUploadProgress(t("errors.uploadProgress", { completed, total })));
      if (selected.length > remaining) errors.push(t("errors.uploadLimited", { count: remaining }));
      if (errors.length) setError(errors.map(item => {
        const match = item.match(/^(.*) : ([A-Z_]+)$/);
        if (!match || !Object.values(NEWSLETTER_ERROR_CODES).includes(match[2] as never)) return item;
        return `${match[1]} : ${t(`errorCodes.${match[2]}` as never)}`;
      }).join("\n"));
    } finally {
      uploadBusyRef.current = false;
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function retryUpload(item: UploadQueueItem) {
    if (uploadBusyRef.current || item.status !== "error") return;
    const remaining = item.target === "photos" ? NEWSLETTER_PHOTO_LIMIT - photos.length : item.target === "posters" ? NEWSLETTER_POSTER_LIMIT - posters.length : item.target === "partnerAds" ? 3 - partnerAds.length : 1;
    if (item.target !== "banner" && remaining <= 0) {
      setError(t("errors.sectionFull"));
      return;
    }
    uploadBusyRef.current = true;
    setUploading(true);
    setError(null);
    setUploadProgress(t("errors.retryUpload", { name: item.name }));
    setUploadQueue((current) => current.map((queued) => queued.id === item.id ? { ...queued, status: "uploading", error: undefined } : queued));
    try {
      const uploaded = await uploadNewsletterImage(item.file, item.target === "banner" ? "logo" : "image");
      if (item.target === "banner") setBannerPhotoUrl(uploaded.url);
      else if (item.target === "photos") setPhotos((current) => [...current, uploaded]);
      else if (item.target === "posters") setPosters((current) => [...current, uploaded]);
      else setPartnerAds((current) => [...current, uploaded]);
      setUploadQueue((current) => current.map((queued) => queued.id === item.id ? { ...queued, status: "success", error: undefined } : queued));
    } catch (uploadError) {
      const message = localizedError(uploadError, t("errors.uploadUnavailable"));
      setUploadQueue((current) => current.map((queued) => queued.id === item.id ? { ...queued, status: "error", error: message } : queued));
      setError(`${item.name} : ${message}`);
    } finally {
      uploadBusyRef.current = false;
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function saveDonationLink() {
    setSavingDonationUrl(true);
    setError(null);
    try {
      const response = await fetch("/api/newsletter/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationUrl }),
      });
      const data = await response.json().catch(() => ({})) as { donationUrl?: string | null; code?: string };
      if (!response.ok) throw new Error(t("errors.saveUnavailable"));
      setDonationUrl(data.donationUrl ?? "");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("errors.saveUnavailable"));
    } finally {
      setSavingDonationUrl(false);
    }
  }

  function addManualBirthday() {
    setManualBirthdays((current) => current.length >= 20 ? current : [...current, { id: crypto.randomUUID(), name: "", dateLabel: "" }]);
  }

  function resetLabelOverride(key: keyof NewsletterLabels) {
    setLabelOverrides((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function exportPdf(pages: HTMLElement[]) {
    if (!generated.title.trim()) {
      setError(t("errors.titlePdf"));
      setEditorStep("modules");
      return;
    }
    if (pages.length === 0) return;
    setExporting(true);
    setError(null);
    const snapshot = document.createElement("div");
    Object.assign(snapshot.style, { position: "fixed", left: "-30000px", top: "0", width: "794px", pointerEvents: "none" });
    for (const page of pages) snapshot.append(page.cloneNode(true));
    document.body.append(snapshot);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const exportWidth = 794;
      const exportHeight = 1123;
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const stablePages = Array.from(snapshot.children) as HTMLElement[];
      for (const [index, page] of stablePages.entries()) {
        // Rasterize each sheet at the same origin; off-viewport stacked sheets
        // can produce clipped headers in Chromium's SVG/foreignObject capture.
        snapshot.replaceChildren(page);
        await nextPaint();
        await inlineNewsletterExportImages(page);
        await waitForImages([page], t("errors.imageUnavailable"));
        const printable = page.firstElementChild as HTMLElement | null;
        if (
          page.scrollWidth > exportWidth + 1
          || page.scrollHeight > exportHeight + 1
          || (printable && (printable.scrollWidth > exportWidth + 1 || printable.scrollHeight > exportHeight + 1))
        ) {
          throw new Error(t("errors.pageOverflow", { number: index + 1 }));
        }
        const dataUrl = await toPng(page, {
          cacheBust: true,
          includeQueryParams: true,
          pixelRatio: 2,
          width: exportWidth,
          height: exportHeight,
          backgroundColor: "#faf7f0",
          style: {
            boxSizing: "border-box",
            width: `${exportWidth}px`,
            minWidth: `${exportWidth}px`,
            maxWidth: `${exportWidth}px`,
            height: `${exportHeight}px`,
            minHeight: `${exportHeight}px`,
            margin: "0",
          },
        });
        if (index > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }
      pdf.save(`${filenamePart(generated.title) || "newsletter"}-${filenamePart(community.name) || "communaute"}.pdf`);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : t("errors.pdfUnavailable"));
    } finally {
      snapshot.remove();
      setExporting(false);
    }
  }

  async function prepareOutput(action: "preview" | "print" | "pdf") {
    if (preparingAction || exporting || uploading || !draftReady) return;
    if (!generated.title.trim()) {
      setError(t("errors.titleContinue"));
      setEditorStep("modules");
      return;
    }
    setError(null);
    setPreparingAction(action);
    try {
      setEditorStep("preview");
      await nextPaint();
      const pages = await documentRef.current?.prepare();
      if (!pages?.length) throw new Error(t("errors.compositionUnavailable"));
      if (action === "preview") {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      await waitForImages(pages, t("errors.imageUnavailable"));
      if (action === "print") window.print();
      if (action === "pdf") await exportPdf(pages);
    } catch (outputError) {
      if ([NEWSLETTER_ERROR_CODES.layoutOverflow, NEWSLETTER_ERROR_CODES.printableOverflow].includes(newsletterErrorCode(outputError) as never)) {
        setNeedsMorePages(true);
        setEditorStep("preview");
        setError(null);
      } else {
        setError(outputError instanceof Error ? outputError.message : t("errors.preparationUnavailable"));
        setEditorStep("content");
      }
    } finally {
      setPreparingAction(null);
    }
  }

  /** Applied directly (no before/after screen): "Annuler" restores the previous version. */
  async function shortenTextsAutomatically() {
    if (overflowShortening) return;
    setOverflowShortening(true);
    setError(null);
    try {
      const shorten = async (text: string) => {
        if (!text.trim()) return text;
        const response = await fetch("/api/newsletter/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(65_000),
          body: JSON.stringify({ text, maxLength: Math.max(80, Math.floor(text.length * 0.75)), outputLocale }),
        });
        const payload = await response.json().catch(() => null) as { text?: unknown } | null;
        if (!response.ok || typeof payload?.text !== "string") throw new Error(t("shorten.error"));
        return payload.text;
      };
      const [intro, ravWord, shabbatNote] = await Promise.all([
        shorten(generated.intro), shorten(generated.ravWord), shorten(generated.shabbatNote),
      ]);
      setPreviousRevision({ generated, parnessText, kiddushText, specificEventText, seferHamitsvotText, photos, posters, partnerAds, layout, outputLocale, labelOverrides });
      setGenerated(current => ({ ...current, intro, ravWord, shabbatNote }));
      setLayout(current => ({ ...current, density: "compact" }));
      setNeedsMorePages(false);
    } catch (shortenError) {
      setError(shortenError instanceof Error ? shortenError.message : t("shorten.error"));
    } finally {
      setOverflowShortening(false);
    }
  }

  function addThirdPage() {
    setLayout(current => ({ ...current, pageLimit: 3 }));
    setNeedsMorePages(false);
  }

  const sectionTitle = (key: NewsletterLabelKey, className?: string) => (
    <span className="inline-flex flex-wrap items-center gap-2"><EditableSectionTitle
      label={resolvedLabels[key]}
      defaultLabel={communityResolvedLabels[key]}
      modified={Object.prototype.hasOwnProperty.call(labelOverrides, key)}
      editLabel={t("labels.editOne", { label: resolvedLabels[key] })}
      resetLabel={t("labels.resetLink")}
      className={className}
      onChange={(value) => setLabelOverrides((current) => ({ ...current, [key]: value }))}
      onReset={() => resetLabelOverride(key)}
    />{fillEstimate.sections.find(section => section.key === key) ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{t("fill.section", { percent: fillEstimate.sections.find(section => section.key === key)?.percent ?? 0 })}</span> : null}</span>
  );

  return (
    <fieldset dir={interfaceLocale === "he" ? "rtl" : "ltr"} disabled={!draftReady || uploading || preparingAction !== null || exporting || revisionBusy} className="mx-auto min-w-0 w-full max-w-7xl space-y-5 overflow-x-clip bg-[#f7faf8] pb-[calc(12rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-28">
      <section className="relative overflow-hidden rounded-b-[2.4rem] bg-[radial-gradient(circle_at_82%_10%,#1d8276_0%,#164960_44%,#112b45_100%)] px-5 pb-7 pt-7 text-white shadow-[0_20px_42px_rgba(17,43,69,0.18)] sm:rounded-[2rem] sm:px-8">
        <span className="pointer-events-none absolute -end-14 top-12 size-48 rounded-full bg-[#a2e2c8]/20 blur-3xl" />
        <span className="pointer-events-none absolute -start-10 bottom-0 size-36 rounded-full bg-[#b7dcec]/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b9eee0]">{t("hero.eyebrow")}</p>
            <h1 className="mt-2 max-w-2xl break-words text-[clamp(2rem,9vw,3.1rem)] font-black leading-[0.98] tracking-[-0.045em]">{t("hero.title")} <span className="mt-2 inline-flex rounded-xl bg-white px-2.5 py-1 text-[0.38em] tracking-normal text-[#164960] shadow-sm">{t("hero.steps")}</span></h1>
          </div>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-white/20 bg-white/10 text-2xl font-black shadow-lg backdrop-blur-sm">ב&quot;ה</span>
        </div>
      </section>

      <section className="mx-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dce9e5] bg-white px-4 py-2.5 sm:mx-0">
        <p className="text-sm text-slate-700">{t("community")} : <strong>{community.name}</strong></p>
        <a href="/dashboard/settings?section=community" className="text-sm font-semibold text-[#0b7069] underline underline-offset-2">{t("edit")}</a>
      </section>
      <nav className="mx-4 rounded-[1.7rem] border border-[#dce9e5] bg-white/90 p-2 shadow-[0_14px_35px_rgba(17,43,69,0.07)] sm:mx-0 sm:p-2.5 print:hidden" aria-label={t("steps.aria")}>
        <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
          {([
            ["modules", "01", t("steps.compose"), t("steps.composeDetail"), LayoutList, "bg-[#164960] text-white shadow-[0_10px_24px_rgba(17,43,69,0.16)]", "border-[#dce9e5] bg-[#f2f8f6] text-[#164960] hover:bg-[#e6f2ed]"],
            ["content", "02", t("steps.customize"), t("steps.customizeDetail"), PenLine, "bg-[#0f766e] text-white shadow-[0_10px_24px_rgba(15,118,110,0.16)]", "border-[#dce9e5] bg-[#f2f8f6] text-[#164960] hover:bg-[#e6f2ed]"],
            ["preview", "03", t("steps.leaflet"), t("steps.leafletDetail"), Eye, "bg-[#d7a95b] text-[#2f291d] shadow-[0_10px_24px_rgba(146,105,41,0.16)]", "border-[#dce9e5] bg-[#f2f8f6] text-[#164960] hover:bg-[#e6f2ed]"],
          ] as const).map(([step, number, label, detail, Icon, activeClass, idleClass]) => (
            <button key={step} type="button" aria-current={editorStep === step ? "step" : undefined} onClick={() => step === "preview" ? void prepareOutput("preview") : setEditorStep(step)} disabled={preparingAction !== null} className={cn("group flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.2rem] border border-transparent px-1 py-2 text-center transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:min-h-[78px] sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-start", editorStep === step ? activeClass : idleClass)}>
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/85 text-[10px] font-black shadow-sm sm:size-10 sm:rounded-xl sm:text-sm", editorStep === step && step !== "preview" ? "text-[#164960]" : "text-current")}>{number}</span>
              <span className="min-w-0 sm:flex-1"><span className="block text-[10px] font-black leading-tight sm:text-sm">{label}</span><span className="mt-1 hidden text-[11px] font-medium opacity-80 sm:block">{detail}</span></span>
              <Icon className="hidden size-4 shrink-0 opacity-75 lg:block" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#e3eee9]" aria-hidden="true"><div className="h-full rounded-full bg-gradient-to-r from-[#164960] via-[#0f766e] to-[#d7a95b] transition-[width] duration-300" style={{ width: editorStep === "modules" ? "33.33%" : editorStep === "content" ? "66.67%" : "100%" }} /></div>
      </nav>

      <div className="mx-4 flex min-h-8 items-center justify-end sm:mx-0 print:hidden" aria-live="polite">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
          draftStatus === "offline" || draftStatus === "error" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
        )}>
          {draftStatus === "restoring" || draftStatus === "saving" ? <Loader2 className="size-3.5 animate-spin" /> : draftStatus === "offline" || draftStatus === "error" ? <CloudOff className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
          {t(`draft.${draftStatus}`)}
        </span>
      </div>

      {error ? <p role="alert" className="mx-4 whitespace-pre-line rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 sm:mx-0 print:hidden">{error}</p> : null}
      {mayContainLegacyCuts ? <p className="mx-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-0">{t("legacyWarning")}</p> : null}
      {!serverReady && !draftConflict && (draftStatus === "error" || draftStatus === "offline") ? <button type="button" onClick={() => setRetryLoadCount((count) => count + 1)} className="mx-4 inline-block font-bold text-violet-800 underline sm:mx-0">{t("retryLoading")}</button> : null}
      {draftConflict && pendingServerDraft ? <div className="mx-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:mx-0">
        <p className="font-bold">{t("conflict.message")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => {
            try { window.localStorage.setItem(`${localDraftKey}.backup.${Date.now()}`, JSON.stringify(latestDraftRef.current)); } catch { /* Current local draft remains in memory. */ }
            applyDraft(pendingServerDraft);
            setPendingServerDraft(null);
            setDraftConflict(false);
            conflictRef.current = false;
            serverReadyRef.current = true;
            setServerReady(true);
            setError(null);
          }} className="min-h-11 rounded-xl bg-white px-3 font-bold text-amber-950 ring-1 ring-amber-300">{t("conflict.server")}</button>
          <button type="button" onClick={() => {
            setPendingServerDraft(null);
            setDraftConflict(false);
            conflictRef.current = false;
            serverReadyRef.current = true;
            setServerReady(true);
            setError(null);
          }} className="min-h-11 rounded-xl bg-[#421388] px-3 font-bold text-white">{t("conflict.local")}</button>
        </div>
      </div> : null}
      {uploading ? <p role="status" className="mx-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 sm:mx-0">{uploadProgress}</p> : null}
      {uploadQueue.length ? <section className="mx-4 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm sm:mx-0 print:hidden" aria-label={t("uploads.title")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#005572]">{t("uploads.title")}</p>
          {!uploading ? <button type="button" onClick={() => setUploadQueue([])} className="text-xs font-bold text-slate-500 underline">{t("hide")}</button> : null}
        </div>
        <div className="mt-2 space-y-2">
          {uploadQueue.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
            {item.status === "uploading" ? <Loader2 className="size-4 shrink-0 animate-spin text-sky-700" /> : item.status === "success" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-700" /> : item.status === "error" ? <CloudOff className="size-4 shrink-0 text-red-600" /> : <Clock3 className="size-4 shrink-0 text-slate-500" />}
            <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-800">{item.name}</span>{item.error ? <span className="block text-red-700">{item.error}</span> : null}</span>
            <span className="shrink-0 font-bold text-slate-500">{t(`uploads.${item.status}`)}</span>
            {item.status === "error" ? <button type="button" onClick={() => void retryUpload(item)} className="min-h-9 shrink-0 rounded-lg bg-[#164960] px-2 font-black text-white">{t("retry")}</button> : null}
          </div>)}
        </div>
      </section> : null}
      <div className="grid gap-5 px-4 sm:px-0 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <aside className="space-y-4 print:hidden">
          <section className={cn("rounded-[1.8rem] border border-[#dce9e5] bg-white p-4 shadow-[0_14px_34px_rgba(17,43,69,0.06)]", editorStep !== "modules" && "hidden")}>
            <div className="rounded-[1.35rem] bg-[linear-gradient(135deg,#eaf6f0,#f6faf7_72%)] p-4 ring-1 ring-[#d3e9df]">
              <label htmlFor="newsletter-title" className="text-xs font-black uppercase tracking-[0.14em] text-[#164960]">{t("title.label")}</label>
              <input
                id="newsletter-title"
                value={generated.title}
                maxLength={70}
                onChange={(event) => setGenerated((current) => ({ ...current, title: event.target.value }))}
                placeholder={t("title.placeholder")}
                className="mt-2 h-12 w-full rounded-2xl border border-[#c4ded5] bg-white px-4 text-base font-black text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-100"
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500">
                <span>{t("title.visible")}</span>
                <span>{generated.title.length}/70</span>
              </div>
              <label htmlFor="newsletter-subtitle" className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-[#164960]">{t("title.subtitleLabel")}</label>
              <input id="newsletter-subtitle" value={generated.subtitle} maxLength={100} onChange={(event) => setGenerated((current) => ({ ...current, subtitle: event.target.value }))} placeholder={t("title.subtitlePlaceholder")} className="mt-2 h-11 w-full rounded-xl border border-[#c4ded5] bg-white px-4 text-base font-semibold text-slate-950 outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-100" />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">{t("sections.essential")}</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">{t("sections.essentialHelp")}</p>
              </div>
              <span className="rounded-full bg-[#eaf8f2] px-3 py-1 text-xs font-black text-[#0d675e]">{t("activeCount", { count: activeCount })}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{ESSENTIAL_MODULES.map(renderModuleToggle)}</div>

            <div className="mt-6">
              <h2 className="text-base font-black text-slate-950">{t("sections.optional")}</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{OPTIONAL_MODULES.map(renderModuleToggle)}</div>
            </div>
          </section>

          {editorStep === "content" ? <>
          <section className="rounded-[1.8rem] border border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/50 p-4 shadow-[0_14px_34px_rgba(0,85,114,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#421388]">{t("content.eyebrow")}</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{t("content.title")}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{t("content.help")}</p>
            <div className={cn("mt-4 rounded-2xl border p-3", fillEstimate.percent < 90 ? "border-emerald-200 bg-emerald-50" : fillEstimate.percent <= 100 ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50")} data-newsletter-fill-gauge>
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span>{t("fill.label", { percent: fillEstimate.percent })}</span>
                <span aria-hidden="true">{fillEstimate.percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80"><div className={cn("h-full rounded-full transition-[width]", fillEstimate.percent < 90 ? "bg-emerald-600" : fillEstimate.percent <= 100 ? "bg-amber-500" : "bg-red-600")} style={{ width: `${Math.min(100, fillEstimate.percent)}%` }} /></div>
              <p className="mt-2 text-xs font-semibold opacity-80">{t(fillEstimate.percent > 100 ? "fill.over" : fillEstimate.percent >= 90 ? "fill.close" : "fill.comfortable", { pages: pageLimit })}</p>
              {pageLimit > 2 ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3" data-newsletter-page-format>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#164960] ring-1 ring-slate-200">{t("fill.format", { pages: pageLimit, sheets: Math.ceil(pageLimit / 2) })}</span>
                <button type="button" onClick={() => setLayout(current => ({ ...current, pageLimit: 2 }))} className="min-h-9 rounded-xl px-3 text-xs font-black text-[#164960] underline-offset-2 hover:underline">{t("fill.backToTwo")}</button>
              </div> : null}
            </div>
            {(layout.deferredMediaIds?.length ?? 0) > 0 ? <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-bold">{t("overflow.deferHelp")}</p>
              <div className="mt-2 flex flex-wrap gap-2">{[...photos, ...posters, ...partnerAds].filter(item => deferredIds.has(item.id)).map(item => <button key={item.id} type="button" onClick={() => setLayout(current => ({ ...current, deferredMediaIds: (current.deferredMediaIds ?? []).filter(id => id !== item.id) }))} className="rounded-full bg-white px-3 py-1.5 font-bold text-[#164960] ring-1 ring-slate-200">{t("add")} · {item.name}</button>)}</div>
            </div> : null}
            <button type="button" onClick={() => void generateEditorialContent()} disabled={generationLoading} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 text-sm font-black text-white shadow-md disabled:opacity-60">{generationLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{t(generationLoading ? "generate.loading" : "generate.action")}</button>
            <div className="mt-4 space-y-3">
              {enabled.seferHamitsvot ? <section className="overflow-hidden rounded-2xl border border-teal-100 bg-teal-50">
                <div className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-900"><BookOpen className="size-5" aria-hidden="true" /></span>
                  <h3 className="min-w-0 flex-1">{sectionTitle("seferHamitsvot", "text-sm font-black text-teal-900")}</h3>
                  <button type="button" aria-expanded={seferHamitsvotOpen} aria-controls="newsletter-sefer-hamitsvot-panel" onClick={() => setSeferHamitsvotOpen((open) => !open)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2 text-xs font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                    <span className="hidden sm:inline">{t(seferHamitsvotOpen ? "content.closeText" : "content.openText")}</span>
                    <ChevronDown aria-hidden="true" className={cn("size-5 shrink-0 text-teal-800 transition-transform", seferHamitsvotOpen && "rotate-180")} />
                  </button>
                </div>
                <div id="newsletter-sefer-hamitsvot-panel" hidden={!seferHamitsvotOpen} className="border-t border-teal-100 px-4 pb-4 pt-3">
                {localizedStudy ? <>
                  <p className="mt-1 text-xs font-bold text-teal-800">{localizedStudy.dateLabel}{localizedShabbat?.hebrewDate ? ` · ${localizedShabbat.hebrewDate}` : ""}</p>
                  {localizedStudy.unavailable ? <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p>{t(localizedStudy.unavailableReason === "translation" ? "studyTranslationFailed" : "studyUnavailable")}</p>
                    <button type="button" disabled={studyRetrying} onClick={() => startStudyRetry(() => router.refresh())} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-900 px-3 py-2 text-xs font-black text-white disabled:opacity-60">
                      {studyRetrying ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                      {t(studyRetrying ? "studyRetrying" : "studyRetry")}
                    </button>
                    <p className="mt-2 text-xs font-semibold text-amber-800">{t("studyManualHelp")}</p>
                  </div> : null}
                  <TextArea label={t("fields.seferHamitsvotText")} value={seferHamitsvotText} onChange={(value) => setSeferHamitsvotText(value)} maxLength={NEWSLETTER_SEFER_LIMIT} />
                  <a className="mt-2 inline-block text-xs underline" href={localizedStudy.sourceUrl} target="_blank" rel="noreferrer">{localizedStudy.sourceLabel}</a>
                </> : <p className="mt-2 text-sm text-amber-800">{t("studyUnavailable")}</p>}
                </div>
              </section> : null}
              <TextArea label={t("fields.intro")} value={generated.intro} onChange={(intro) => setGenerated((current) => ({ ...current, intro }))} maxLength={NEWSLETTER_INTRO_LIMIT} onShorten={() => void shortenText("intro", NEWSLETTER_INTRO_LIMIT)} shortening={shorteningField === "intro"} shortenLabel={t("shorten.action")} />
              {enabled.ravWord ? (
                <section className="rounded-2xl border border-[#cfe6d9] bg-[#f5fbf7] p-3 text-sm font-bold text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {sectionTitle("ravWord", "text-sm font-black text-[#173a40]")}
                    <button
                      type="button"
                      onClick={() => void requestRavSuggestion()}
                      disabled={ravSuggestionLoading || !localizedShabbat?.parasha?.trim()}
                      aria-controls="newsletter-rav-suggestion"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#087e55] px-3 py-2 text-xs font-black text-white shadow-[0_7px_16px_rgba(8,126,85,0.18)] transition hover:bg-[#066c49] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {ravSuggestionLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      {t(ravSuggestionLoading ? "rav.creating" : "rav.create")}
                    </button>
                  </div>
                  <textarea
                    id="newsletter-rav-word"
                    value={generated.ravWord}
                    onChange={(event) => setGenerated((current) => ({ ...current, ravWord: event.target.value }))}
                    maxLength={NEWSLETTER_RAV_WORD_LIMIT}
                    rows={6}
                    className="mt-3 w-full resize-y rounded-xl border border-[#cfe6d9] bg-white px-3 py-2 text-base font-medium leading-6 outline-none focus:border-[#087e55] focus:ring-4 focus:ring-emerald-100 sm:text-sm"
                  />
                  <span className="mt-1 block text-end text-[10px] font-bold text-slate-500">{generated.ravWord.length}/{NEWSLETTER_RAV_WORD_LIMIT} {t("charactersMaximum")}</span>
                  {generated.ravWord.length > NEWSLETTER_RAV_WORD_LIMIT * 0.8 ? <button type="button" onClick={() => void shortenText("ravWord", NEWSLETTER_RAV_WORD_LIMIT)} disabled={Boolean(shorteningField)} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-100 px-3 text-xs font-black text-violet-900 disabled:opacity-60">{shorteningField === "ravWord" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{t("shorten.action")}</button> : null}
                  <div id="newsletter-rav-suggestion" aria-live="polite">
                    {!localizedShabbat?.parasha?.trim() ? <p className="mt-2 text-xs font-medium text-amber-800">{t("rav.parashaRequired")}</p> : null}
                    {ravSuggestionError ? <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{ravSuggestionError}</p> : null}
                    {ravSuggestion ? <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
                      <p className="flex items-center gap-1.5 text-xs font-black text-[#087e55]"><Sparkles className="size-3.5" /> {t("rav.review")}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-800">{ravSuggestion}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setGenerated((current) => ({ ...current, ravWord: ravSuggestion })); setRavSuggestion(""); }} className="min-h-10 rounded-lg bg-[#087e55] px-3 text-xs font-black text-white transition hover:bg-[#066c49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">{t(generated.ravWord.trim() ? "rav.replace" : "rav.use")}</button>
                        <button type="button" onClick={() => setRavSuggestion("")} className="min-h-10 rounded-lg px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">{t("rav.ignore")}</button>
                      </div>
                    </div> : null}
                  </div>
                </section>
              ) : null}
              {enabled.shabbat ? <section className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-sm">
                <div className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800"><BookOpen className="size-5" /></span>
                  <div className="min-w-0 flex-1">{sectionTitle("parasha", "text-sm font-black text-slate-900")}<span className="block text-xs font-medium text-slate-600">{t(generated.shabbatNote.trim() ? "content.added" : "content.optional")}</span></div>
                  <button type="button" aria-expanded={parashaOpen} aria-controls="newsletter-parasha-panel" onClick={() => setParashaOpen((open) => !open)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                    <ChevronDown className={cn("size-5 shrink-0 text-teal-800 transition-transform", parashaOpen && "rotate-180")} />
                  </button>
                </div>
                <div id="newsletter-parasha-panel" hidden={!parashaOpen} className="border-t border-teal-100 px-4 pb-4 pt-3"><TextArea label={t("fields.parashaText")} value={generated.shabbatNote} onChange={(shabbatNote) => setGenerated((current) => ({ ...current, shabbatNote }))} maxLength={NEWSLETTER_PARASHA_LIMIT} onShorten={() => void shortenText("shabbatNote", NEWSLETTER_PARASHA_LIMIT)} shortening={shorteningField === "shabbatNote"} shortenLabel={t("shorten.action")} /></div>
              </section> : null}
              {enabled.events ? <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
                <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:px-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900"><CalendarDays className="size-5" /></span>
                  <div className="min-w-0 flex-1">{sectionTitle("agenda", "text-sm font-black text-slate-900")}<span className="block text-xs font-medium text-slate-600">{t("agenda.count", { count: initialEvents.length })}</span></div>
                  <button type="button" aria-expanded={agendaOpen} aria-controls="newsletter-agenda-panel" onClick={() => setAgendaOpen((open) => !open)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
                    <ChevronDown className={cn("size-5 shrink-0 text-amber-800 transition-transform", agendaOpen && "rotate-180")} />
                  </button>
                  <a href="/dashboard/events" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-white px-2 text-[11px] font-black text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 sm:px-3" aria-label={t("agenda.open")}>{t("agenda.name")} <ArrowUpRight className="size-3.5 rtl:-scale-x-100" /></a>
                </div>
                <div id="newsletter-agenda-panel" hidden={!agendaOpen} className="border-t border-amber-100 px-4 pb-4 pt-3"><TextArea label={t("fields.eventsIntro")} value={generated.eventIntro} onChange={(eventIntro) => setGenerated((current) => ({ ...current, eventIntro }))} maxLength={NEWSLETTER_EVENT_INTRO_LIMIT} onShorten={() => void shortenText("eventIntro", NEWSLETTER_EVENT_INTRO_LIMIT)} shortening={shorteningField === "eventIntro"} shortenLabel={t("shorten.action")} /></div>
              </section> : null}
              {enabled.birthdays ? <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>{sectionTitle("birthdays", "text-sm font-black text-slate-900")}<p className="text-xs text-slate-600">{t("birthdays.automatic", { count: initialBirthdays.length })}</p></div>
                  <button type="button" onClick={addManualBirthday} disabled={manualBirthdays.length >= 20} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-rose-700 px-3 text-xs font-black text-white disabled:opacity-50"><Plus className="size-4" />{t("birthdays.add")}</button>
                </div>
                {initialBirthdays.length ? <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-rose-100">{initialBirthdays.map((birthday) => <p key={birthday.id}><strong>{birthday.name}</strong> · {(outputLocale === "he" ? birthday.hebrewDateHe : birthday.hebrewDate) || birthday.gregorianDate}</p>)}</div> : <p className="mt-3 text-xs font-medium text-slate-600">{t("birthdays.none")}</p>}
                {manualBirthdays.length ? <div className="mt-3 space-y-2">{manualBirthdays.map((birthday, index) => <div key={birthday.id} className="grid gap-2 rounded-xl bg-white p-2 ring-1 ring-rose-100 sm:grid-cols-[1fr_0.8fr_auto]">
                  <input aria-label={t("birthdays.nameAria", { number: index + 1 })} value={birthday.name} maxLength={120} onChange={(event) => setManualBirthdays((current) => current.map((item) => item.id === birthday.id ? { ...item, name: event.target.value } : item))} placeholder={t("birthdays.name")} className="min-h-10 rounded-lg border border-slate-200 px-3 text-base outline-none focus:border-rose-500 sm:text-sm" />
                  <input aria-label={t("birthdays.dateAria", { number: index + 1 })} value={birthday.dateLabel} maxLength={80} onChange={(event) => setManualBirthdays((current) => current.map((item) => item.id === birthday.id ? { ...item, dateLabel: event.target.value } : item))} placeholder={t("birthdays.date")} className="min-h-10 rounded-lg border border-slate-200 px-3 text-base outline-none focus:border-rose-500 sm:text-sm" />
                  <button type="button" onClick={() => setManualBirthdays((current) => current.filter((item) => item.id !== birthday.id))} aria-label={t("birthdays.remove", { name: birthday.name || String(index + 1) })} className="flex min-h-10 items-center justify-center rounded-lg px-3 text-red-700 hover:bg-red-50"><Trash2 className="size-4" /></button>
                </div>)}</div> : null}
              </section> : null}
              {enabled.specificEvent ? <section className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-3">
                {sectionTitle("specificEvent", "text-sm font-black text-slate-900")}
                <TextArea label={t("fields.specificEventText")} value={specificEventText} onChange={(value) => setSpecificEventText(value)} maxLength={NEWSLETTER_SPECIFIC_EVENT_LIMIT} onShorten={() => void shortenText("specificEventText", NEWSLETTER_SPECIFIC_EVENT_LIMIT)} shortening={shorteningField === "specificEventText"} shortenLabel={t("shorten.action")} />
                <p className="mt-1 text-xs text-slate-600">{t("specificEventHelp")}</p>
              </section> : null}
              {enabled.parness || enabled.kiddush ? <div className="rounded-2xl border border-violet-100 bg-white p-3">{sectionTitle("community", "text-sm font-black text-slate-900")}</div> : null}
              {enabled.parness ? <TextInput label={sectionTitle("parness")} value={parnessText} onChange={setParnessText} placeholder={t("fields.parnessPlaceholder")} /> : null}
              {enabled.kiddush ? <TextInput label={sectionTitle("kiddush")} iconSrc={NEWSLETTER_CHALLOT_ICON_URL} value={kiddushText} onChange={setKiddushText} placeholder={t("fields.kiddushPlaceholder")} /> : null}
              <label className="block text-sm font-bold text-slate-700">
                {sectionTitle("support")}
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <input value={donationUrl} onChange={(event) => setDonationUrl(event.target.value)} placeholder="https://allodons.fr/..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3] sm:text-sm" />
                  <button type="button" onClick={() => void saveDonationLink()} disabled={savingDonationUrl} className="min-h-10 rounded-xl bg-[#18264d] px-3 text-xs font-black text-white disabled:opacity-60">{t(savingDonationUrl ? "saving" : "save")}</button>
                </div>
              </label>
              <section className="text-sm font-bold text-slate-700">
                <p>{t("banner.title")}</p>
                <div className="mt-1.5 flex min-w-0 items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2">
                  {bannerPhotoUrl ? <img src={newsletterLogoImageUrl(bannerPhotoUrl)} alt={t("banner.alt")} className="size-24 shrink-0 object-contain drop-shadow-sm" /> : <span className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-slate-400 ring-1 ring-slate-200"><ImagePlus className="size-7" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-600">{t(bannerPhotoUrl === community.logoUrl && community.logoUrl ? "banner.default" : bannerPhotoUrl ? "banner.custom" : "banner.none")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-white px-3 text-xs font-bold text-[#36506d] shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-violet-600">
                        {t(bannerPhotoUrl ? "banner.replace" : "banner.choose")}
                        <input type="file" accept={NEWSLETTER_IMAGE_ACCEPT} className="sr-only" disabled={uploading} onChange={(event) => void uploadMedia(event, "banner")} />
                      </label>
                      {community.logoUrl && bannerPhotoUrl !== community.logoUrl ? <button type="button" onClick={() => setBannerPhotoUrl(community.logoUrl ?? "")} className="min-h-10 rounded-lg px-3 text-xs font-bold text-slate-600 underline">{t("banner.reset")}</button> : null}
                    </div>
                  </div>
                </div>
              </section>
              {enabled.restaurantAd ? <section className="text-sm font-bold text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  {sectionTitle("partners")}
                  <span className="text-xs font-semibold text-slate-400">{t("media.visualCount", { count: partnerAds.length })}</span>
                </div>
                <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  <span className="truncate">{t("media.addVisual")}</span>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[#36506d] shadow-sm">{t("media.upload")}</span>
                  <input type="file" accept={NEWSLETTER_IMAGE_ACCEPT} multiple className="sr-only" disabled={uploading || partnerAds.length >= 3} onChange={(event) => void uploadMedia(event, "partnerAds")} />
                </label>
                {partnerAds.length > 0 ? <div className="mt-3 grid grid-cols-3 gap-2">
                  {partnerAds.map((ad) => <div key={ad.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
                    <img src={ad.url} alt={ad.name} className="aspect-square w-full object-contain" />
                    <button type="button" onClick={() => setPartnerAds((current) => current.filter((item) => item.id !== ad.id))} className="absolute end-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 shadow transition hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-600">{t("remove")}</button>
                  </div>)}
                </div> : null}
              </section> : null}
            </div>
          </section>

          {enabled.photos ? <section className="rounded-[1.65rem] border border-sky-100 bg-gradient-to-br from-white to-sky-50/60 p-4 shadow-[0_12px_28px_rgba(48,25,91,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                {sectionTitle("photos", "text-xs font-black uppercase tracking-[0.14em] text-[#005572]")}
                <p className="mt-1 text-sm text-slate-500">{t("media.photoLimit", { count: photos.length, limit: NEWSLETTER_PHOTO_LIMIT })}</p>
                {photos.length > NEWSLETTER_PHOTO_LIMIT ? <p className="mt-1 text-sm text-amber-700">{t("media.photoOverflow")}</p> : null}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#36506d] px-3 py-2 text-xs font-black text-white transition hover:bg-[#17253f]">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {t("add")}
                <input type="file" accept={NEWSLETTER_IMAGE_ACCEPT} multiple className="sr-only" onChange={(event) => void uploadMedia(event, "photos")} disabled={uploading || photos.length >= NEWSLETTER_PHOTO_LIMIT} />
              </label>
            </div>
            {photos.length > 0 ? (
              <PhotoCaptions photos={photos} onChange={setPhotos} />
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">{t("media.noPhotos")}</div>
            )}
          </section> : null}

          {enabled.posters ? <section className="rounded-[1.65rem] border border-amber-100 bg-gradient-to-br from-white to-amber-50/60 p-4 shadow-[0_12px_28px_rgba(48,25,91,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                {sectionTitle("posters", "text-xs font-black uppercase tracking-[0.14em] text-amber-900")}
                <p className="mt-1 text-sm text-slate-500">{t("media.posterLimit", { count: posters.length, limit: NEWSLETTER_POSTER_LIMIT })}</p>
                {posters.length > NEWSLETTER_POSTER_LIMIT ? <p className="mt-1 text-sm text-amber-700">{t("media.posterOverflow")}</p> : null}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#18264d] px-3 py-2 text-xs font-black text-white transition hover:bg-[#101b37]">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {t("add")}
                <input type="file" accept={NEWSLETTER_IMAGE_ACCEPT} multiple className="sr-only" onChange={(event) => void uploadMedia(event, "posters")} disabled={uploading || posters.length >= NEWSLETTER_POSTER_LIMIT} />
              </label>
            </div>
            {posters.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {posters.map((poster) => <div key={poster.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
                <img src={poster.url} alt={poster.name} className="aspect-[3/4] w-full object-contain" />
                <button type="button" onClick={() => setPosters((current) => current.filter((item) => item.id !== poster.id))} className="absolute end-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 shadow transition hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-600">{t("remove")}</button>
              </div>)}
            </div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">{t("media.noPosters")}</div>}
          </section> : null}

          {generated.warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {generated.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}

          </> : null}
        </aside>

        <main ref={previewRef} className={cn("min-w-0 rounded-[1.8rem] border border-amber-100 bg-gradient-to-b from-[#fffdf8] to-[#f7f2e7] p-3 shadow-[0_16px_42px_rgba(95,68,22,0.1)] sm:p-5 xl:col-span-2", editorStep !== "preview" && "hidden")}>
          {draftReady ? <NewsletterRevision data={documentData} onApply={applyRevision} onUndo={undoRevision} canUndo={Boolean(previousRevision)} onBusy={setRevisionBusy} /> : null}
          {needsMorePages && pageLimit === 2 ? <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 print:hidden" role="status" data-newsletter-overflow-banner>
            <p className="font-black text-amber-950">{t("overflow.bannerTitle")}</p>
            <p className="mt-1 text-sm text-amber-900">{t("overflow.bannerHelp")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button type="button" onClick={addThirdPage} className="min-h-11 rounded-xl bg-amber-500 px-4 text-sm font-black text-amber-950 shadow-sm hover:bg-amber-400" data-newsletter-add-page>{t("overflow.addThirdPage")}</button>
              <button type="button" onClick={() => void shortenTextsAutomatically()} disabled={overflowShortening} className="min-h-11 text-sm font-bold text-amber-900 underline underline-offset-2 disabled:opacity-60">{overflowShortening ? t("overflow.shortening") : t("overflow.shortenInstead")}</button>
            </div>
          </div> : null}
          {!needsMorePages && compositionNote ? <p className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 print:hidden" role="status" data-newsletter-composition-note>{compositionNote}</p> : null}
          {draftReady ? <NewsletterDocument prepared={preparedRevision} ref={documentRef} data={documentData} visible={editorStep === "preview"} onError={setError} onOverflow={showOverflow} onComposed={handleComposed} /> : null}
        </main>
      </div>
      <div className={cn("fixed inset-x-0 bottom-[calc(5.95rem+env(safe-area-inset-bottom))] z-20 border-t border-[#dce9e5] bg-[#f7faf8]/95 px-3 py-2 backdrop-blur print:hidden md:bottom-0 md:z-40 md:py-3", keyboardOpen && "max-md:hidden")}>
        <div className={cn("mx-auto grid max-w-3xl gap-2", "grid-cols-1")}>
          {editorStep === "modules" ? (
            <Button type="button" onClick={() => { if (generated.title.trim()) { setError(null); setEditorStep("content"); } else { setError(t("errors.titleContinue")); } }} className="min-h-13 rounded-2xl bg-[#164960] px-5 font-black text-white shadow-[0_10px_22px_rgba(17,43,69,0.18)] hover:bg-[#113d50]">
              {t("continue")} <PenLine className="size-4" />
            </Button>
          ) : null}
          {editorStep === "content" ? <Button type="button" onClick={() => void prepareOutput("preview")} loading={preparingAction === "preview"} className="min-h-13 rounded-2xl bg-[#164960] px-5 font-black text-white shadow-[0_10px_22px_rgba(17,43,69,0.18)] hover:bg-[#113d50]">{t("continue")} <Eye className="size-4" /></Button> : null}
          {editorStep === "preview" ? <>
            <Button type="button" onClick={() => void prepareOutput("pdf")} loading={preparingAction === "pdf" || exporting} className="min-h-12 rounded-2xl bg-[#ffcd32] px-2 text-xs font-black text-[#28104f] hover:bg-[#f2bd16] sm:text-sm"><Download className="size-4" />PDF A4</Button>
          </> : null}
        </div>
      </div>
    </fieldset>
  );
}

function TextInput({ label, iconSrc, value, onChange, placeholder }: { label: ReactNode; iconSrc?: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span className="inline-flex items-center gap-2">
        {iconSrc ? <img src={iconSrc} alt="" className="h-8 w-10 object-contain" /> : null}
        {label}
      </span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3] sm:text-sm" />
    </label>
  );
}

function EditableSectionTitle({ label, defaultLabel, modified, editLabel, resetLabel, className, onChange, onReset }: {
  label: string;
  defaultLabel: string;
  modified: boolean;
  editLabel: string;
  resetLabel: string;
  className?: string;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const cancelled = useRef(false);
  const beginEditing = () => {
    cancelled.current = false;
    setValue(label);
    setEditing(true);
  };
  const commit = () => {
    if (cancelled.current) { cancelled.current = false; return; }
    const clean = value.trim().slice(0, 80);
    if (clean) onChange(clean);
    setEditing(false);
  };
  if (editing) return <span className="block" onClick={(event) => event.stopPropagation()}>
    <input autoFocus value={value} maxLength={80} onChange={(event) => setValue(event.target.value)} onBlur={commit} onKeyDown={(event) => {
      if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === "Escape") { event.preventDefault(); cancelled.current = true; setValue(label); setEditing(false); }
    }} className="min-h-9 w-full min-w-0 rounded-lg border border-violet-300 bg-white px-2 text-base font-bold text-slate-900 outline-none ring-violet-100 focus:ring-4" />
  </span>;
  return <span className="block">
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span>{label}</span>
      <span role="button" tabIndex={0} aria-label={editLabel} title={editLabel} onClick={(event) => { event.stopPropagation(); beginEditing(); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); beginEditing(); } }} className="inline-flex size-7 items-center justify-center rounded-lg text-violet-700 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500"><Pencil className="size-3.5" /></span>
    </span>
    {modified && label !== defaultLabel ? <button type="button" onClick={(event) => { event.stopPropagation(); onReset(); }} className="mt-0.5 block text-[10px] font-semibold text-violet-700 underline">{resetLabel}</button> : null}
  </span>;
}

function TextArea({ label, value, onChange, maxLength, onShorten, shortening = false, shortenLabel }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number; onShorten?: () => void; shortening?: boolean; shortenLabel?: string }) {
  return <label className="block text-sm font-bold text-slate-700">{label}
    <textarea value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-violet-100 px-3 py-2 text-base font-medium leading-6 outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100 sm:text-sm" />
    {maxLength ? <span className="mt-1 block text-end text-[10px] font-bold text-slate-500">{value.length}/{maxLength}</span> : null}
    {onShorten && maxLength && value.length > maxLength * 0.8 ? <button type="button" onClick={onShorten} disabled={shortening} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-violet-100 px-3 text-xs font-black text-violet-900 disabled:opacity-60">{shortening ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}{shortenLabel}</button> : null}
  </label>;
}
