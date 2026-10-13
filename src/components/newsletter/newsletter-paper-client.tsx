"use client";
/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NewsletterDocument, type NewsletterDocumentHandle } from "@/components/newsletter/newsletter-document";
import type { NewsletterDocumentData } from "@/lib/newsletter/document-layout";
import { NEWSLETTER_IMAGE_ACCEPT, uploadNewsletterBatch, uploadNewsletterImage } from "@/lib/newsletter/media";
import { createDraftSaveQueue } from "@/lib/newsletter/save-queue";
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
  Printer,
  PenLine,
  ArrowUpRight,
  Store,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  gregorianDate: string;
};

export type NewsletterShabbat = {
  date: string;
  hebrewDate: string | null;
  parasha: string | null;
  entry: string | null;
  exit: string | null;
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
};

export type ModuleKey = "ravWord" | "photos" | "posters" | "parness" | "birthdays" | "kiddush" | "events" | "restaurantAd" | "support" | "shabbat";
type EditorStep = "modules" | "content" | "preview";

type ModuleConfig = {
  key: ModuleKey;
  title: string;
  icon: LucideIcon;
  locked?: boolean;
};

export type UploadedPhoto = {
  id: string;
  url: string;
  name: string;
};

export type GeneratedNewsletter = {
  title: string;
  intro: string;
  ravWord: string;
  shabbatNote: string;
  eventIntro: string;
  restaurantAd: string;
  proofreadNote: string;
  warnings: string[];
};

type NewsletterDraft = {
  version: 1;
  savedAt: number;
  title: string;
  enabled: Record<ModuleKey, boolean>;
  editorStep: EditorStep;
  mobilePreviewPage: "front" | "back";
  parnessText: string;
  kiddushText: string;
  partnerAds: UploadedPhoto[];
  donationUrl: string;
  photos: UploadedPhoto[];
  posters: UploadedPhoto[];
  bannerPhotoUrl: string;
  generated: GeneratedNewsletter;
};

const MODULES: ModuleConfig[] = [
  { key: "ravWord", title: "Mot du Rav", icon: BookOpen },
  { key: "photos", title: "Photos de la semaine", icon: ImagePlus },
  { key: "posters", title: "Affiches & événements à venir...", icon: ImagePlus },
  { key: "parness", title: "Parness Hayom", icon: HeartHandshake },
  { key: "birthdays", title: "Anniversaires", icon: Cake },
  { key: "kiddush", title: "Kidouch offert", icon: Gift },
  { key: "events", title: "Événements à venir", icon: CalendarDays },
  { key: "restaurantAd", title: "Pub partenaire", icon: Store },
  { key: "support", title: "Nous soutenir", icon: HandHeart },
  { key: "shabbat", title: "Repère Chabbat", icon: Clock3, locked: true },
];

const ESSENTIAL_MODULE_KEYS = new Set<ModuleKey>(["shabbat", "ravWord", "events", "photos"]);
const ESSENTIAL_MODULES = MODULES.filter((module) => ESSENTIAL_MODULE_KEYS.has(module.key));
const OPTIONAL_MODULES = MODULES.filter((module) => !ESSENTIAL_MODULE_KEYS.has(module.key));

const DEFAULT_ENABLED: Record<ModuleKey, boolean> = {
  ravWord: true,
  photos: true,
  posters: false,
  parness: true,
  birthdays: true,
  kiddush: true,
  events: true,
  restaurantAd: false,
  support: true,
  shabbat: true,
};

function nextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(elements: Array<HTMLElement | null>) {
  const images = elements.flatMap((element) => element ? Array.from(element.querySelectorAll("img")) : []);
  await Promise.all(images.map((image) => {
    const failure = () => new Error(`Image indisponible : ${image.alt || "visuel du feuillet"}. Réimportez-la avant l’export.`);
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

function initialGenerated(): GeneratedNewsletter {
  return {
    title: "Le Chabaton",
    intro: "",
    ravWord: "",
    shabbatNote: "",
    eventIntro: "",
    restaurantAd: "",
    proofreadNote: "Pret pour relecture avant impression.",
    warnings: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function draftText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function draftUploads(value: unknown, max: number): UploadedPhoto[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).flatMap((item) => {
    if (!isRecord(item) || typeof item.url !== "string" || !item.url.trim()) return [];
    return [{
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      url: item.url,
      name: typeof item.name === "string" ? item.name : "Image",
    }];
  });
}

function draftRequestError(status: number, loading = false) {
  const action = loading ? "Chargement" : "Sauvegarde";
  if (status === 401) return "Session expirée. Reconnectez-vous pour reprendre votre brouillon.";
  if (status === 403) return `Accès à la communauté indisponible. Vérifiez votre compte.`;
  if (status === 404) return `Service de brouillon introuvable (404). ${action} serveur indisponible ; réessayez après actualisation.`;
  if (status === 413) return `Brouillon trop volumineux pour être synchronisé.`;
  return `${action} serveur indisponible (${status}). ${loading ? "Réessayez le chargement." : "Votre brouillon reste sur cet appareil."}`;
}

function parseNewsletterDraft(value: unknown, donationDefault: string): NewsletterDraft | null {
  if (!isRecord(value) || value.version !== 1) return null;
  const enabledValue = isRecord(value.enabled) ? value.enabled : {};
  const generatedValue = isRecord(value.generated) ? value.generated : {};
  const defaults = initialGenerated();
  const editorStep: EditorStep = value.editorStep === "content" || value.editorStep === "preview" ? value.editorStep : "modules";
  return {
    version: 1,
    savedAt: typeof value.savedAt === "number" ? value.savedAt : 0,
    title: draftText(value.title, defaults.title),
    enabled: Object.fromEntries(MODULES.map((module) => [
      module.key,
      module.locked ? true : typeof enabledValue[module.key] === "boolean" ? enabledValue[module.key] : module.key === "support" ? Boolean(donationDefault) : DEFAULT_ENABLED[module.key],
    ])) as Record<ModuleKey, boolean>,
    editorStep,
    mobilePreviewPage: value.mobilePreviewPage === "back" ? "back" : "front",
    parnessText: draftText(value.parnessText),
    kiddushText: draftText(value.kiddushText),
    partnerAds: draftUploads(value.partnerAds, 3),
    donationUrl: draftText(value.donationUrl, donationDefault),
    photos: draftUploads(value.photos, 9),
    posters: draftUploads(value.posters, 5),
    bannerPhotoUrl: draftText(value.bannerPhotoUrl),
    generated: {
      title: draftText(generatedValue.title, draftText(value.title, defaults.title)),
      intro: draftText(generatedValue.intro, defaults.intro),
      ravWord: draftText(generatedValue.ravWord),
      shabbatNote: draftText(generatedValue.shabbatNote),
      eventIntro: draftText(generatedValue.eventIntro),
      restaurantAd: draftText(generatedValue.restaurantAd),
      proofreadNote: draftText(generatedValue.proofreadNote, defaults.proofreadNote),
      warnings: Array.isArray(generatedValue.warnings) ? generatedValue.warnings.filter((item): item is string => typeof item === "string").slice(0, 10) : [],
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
}: {
  userId: string;
  community: CommunityInfo;
  initialEvents: NewsletterEvent[];
  initialBirthdays: NewsletterBirthday[];
  initialShabbat: NewsletterShabbat | null;
}) {
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
  const [editorStep, setEditorStep] = useState<EditorStep>("modules");
  const [parashaOpen, setParashaOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  // Retain the legacy field so version-1 drafts remain compatible.
  const mobilePreviewPage = "front" as const;
  const [parnessText, setParnessText] = useState("");
  const [kiddushText, setKiddushText] = useState("");
  const [partnerAds, setPartnerAds] = useState<UploadedPhoto[]>([]);
  const [donationUrl, setDonationUrl] = useState(community.donationUrl ?? "");
  const [savingDonationUrl, setSavingDonationUrl] = useState(false);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [posters, setPosters] = useState<UploadedPhoto[]>([]);
  const [bannerPhotoUrl, setBannerPhotoUrl] = useState(community.coverUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [exporting, setExporting] = useState(false);
  const [preparingAction, setPreparingAction] = useState<"preview" | "print" | "pdf" | null>(null);
  const [generated, setGenerated] = useState<GeneratedNewsletter>(() => initialGenerated());
  const [ravSuggestion, setRavSuggestion] = useState("");
  const [ravSuggestionError, setRavSuggestionError] = useState<string | null>(null);
  const [ravSuggestionLoading, setRavSuggestionLoading] = useState(false);
  const ravSuggestionBusyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"restoring" | "saving" | "saved" | "offline" | "error">("restoring");
  const [serverReady, setServerReady] = useState(false);
  const [draftConflict, setDraftConflict] = useState(false);
  const [pendingServerDraft, setPendingServerDraft] = useState<NewsletterDraft | null>(null);
  const [retryLoadCount, setRetryLoadCount] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const activeCount = useMemo(() => Object.values(enabled).filter(Boolean).length, [enabled]);
  const mayContainLegacyCuts = [[generated.intro, 180], [generated.ravWord, 850], [generated.shabbatNote, 620], [generated.eventIntro, 220]].some(([text, limit]) => typeof text === "string" && text.length === limit && !/[.!?…]$/.test(text.trim()));
  const visibleEvents = initialEvents;
  const visiblePhotos = photos.slice(0, 9);
  const visiblePosters = posters.slice(0, 5);
  const visiblePartnerAds = partnerAds.slice(0, 3);
  const previewCommunity = { ...community, donationUrl };
  const outputEnabled = useMemo<Record<ModuleKey, boolean>>(() => ({
    ravWord: enabled.ravWord && Boolean(generated.ravWord.trim()),
    photos: enabled.photos && visiblePhotos.length > 0,
    posters: enabled.posters && visiblePosters.length > 0,
    parness: enabled.parness && Boolean(parnessText.trim()),
    birthdays: enabled.birthdays && initialBirthdays.length > 0,
    kiddush: enabled.kiddush && Boolean(kiddushText.trim()),
    events: enabled.events && visibleEvents.length > 0,
    restaurantAd: enabled.restaurantAd && visiblePartnerAds.length > 0,
    support: enabled.support && Boolean(donationUrl.trim()),
    shabbat: enabled.shabbat && Boolean(initialShabbat),
  }), [donationUrl, enabled, generated.ravWord, initialBirthdays.length, initialShabbat, kiddushText, parnessText, visibleEvents.length, visiblePartnerAds.length, visiblePhotos.length, visiblePosters.length]);
  const documentData: NewsletterDocumentData = {
    community: previewCommunity, enabled: outputEnabled, generated, parnessText, kiddushText,
    photos: visiblePhotos, posters: visiblePosters, partnerAds: visiblePartnerAds,
    events: visibleEvents, birthdays: initialBirthdays, shabbat: initialShabbat, bannerPhotoUrl,
  };
  const localDraftKey = useMemo(() => `easycom.newsletter.draft.${community.id}.${userId}`, [community.id, userId]);
  const draftSnapshot = useMemo<NewsletterDraft>(() => ({
    version: 1,
    savedAt: Date.now(),
    title: generated.title,
    enabled,
    editorStep,
    mobilePreviewPage,
    parnessText,
    kiddushText,
    partnerAds,
    donationUrl,
    photos,
    posters,
    bannerPhotoUrl,
    generated,
  }), [bannerPhotoUrl, donationUrl, editorStep, enabled, generated, kiddushText, mobilePreviewPage, parnessText, partnerAds, photos, posters]);

  const applyDraft = useCallback((draft: NewsletterDraft) => {
    setEnabled(draft.enabled);
    setEditorStep(draft.editorStep);
    setParnessText(draft.parnessText);
    setKiddushText(draft.kiddushText);
    setPartnerAds(draft.partnerAds);
    setDonationUrl(draft.donationUrl);
    setPhotos(draft.photos);
    setPosters(draft.posters);
    setBannerPhotoUrl(draft.bannerPhotoUrl);
    setGenerated(draft.generated);
    setRavSuggestion("");
    setRavSuggestionError(null);
  }, []);

  async function requestRavSuggestion() {
    if (ravSuggestionBusyRef.current) return;
    ravSuggestionBusyRef.current = true;
    setRavSuggestionLoading(true);
    setRavSuggestion("");
    setRavSuggestionError(null);
    try {
      const response = await fetch("/api/newsletter/rav-suggestion", { method: "POST" });
      const payload = await response.json().catch(() => null) as { suggestion?: unknown; error?: unknown } | null;
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Impossible de préparer une proposition pour le moment.");
      if (typeof payload?.suggestion !== "string" || !payload.suggestion.trim()) throw new Error("Aucune proposition reçue. Réessayez.");
      setRavSuggestion(payload.suggestion);
    } catch (requestError) {
      setRavSuggestionError(requestError instanceof Error ? requestError.message : "La proposition IA est indisponible.");
    } finally {
      ravSuggestionBusyRef.current = false;
      setRavSuggestionLoading(false);
    }
  }

  const saveQueue = useMemo(() => createDraftSaveQueue<NewsletterDraft>(async (draft) => {
    if (!serverReadyRef.current || conflictRef.current) return;
    try {
      const response = await fetch("/api/newsletter/draft", {
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
      setError(saveError instanceof Error ? saveError.message : "Sauvegarde serveur indisponible. Votre brouillon reste sur cet appareil.");
    }
  }), []);

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
      localDraft = parseNewsletterDraft(JSON.parse(window.localStorage.getItem(localDraftKey) ?? "null"), community.donationUrl ?? "");
      if (!loadedOnceRef.current && localDraft) applyDraft(localDraft);
    } catch {
      localDraft = null;
    }
    const firstLoad = !loadedOnceRef.current;

    fetch("/api/newsletter/draft", { cache: "no-store", signal: AbortSignal.timeout(15_000) })
      .then(async (response) => {
        if (!response.ok) throw new Error(draftRequestError(response.status, true));
        return response.json() as Promise<{ draft?: unknown; updatedAt?: string }>;
      })
      .then((data) => {
        if (!active) return;
        loadedOnceRef.current = true;
        const serverDraft = parseNewsletterDraft(data?.draft, community.donationUrl ?? "");
        const previousServerRevision = serverUpdatedAtRef.current;
        serverUpdatedAtRef.current = data.updatedAt ?? null;
        if (serverDraft && localDraft && !sameDraftContent(serverDraft, localDraft) && (conflictRef.current || (!firstLoad && data.updatedAt !== previousServerRevision))) {
          setPendingServerDraft(serverDraft);
          setDraftConflict(true);
          conflictRef.current = true;
          setDraftStatus("offline");
          setError("Une version plus récente existe sur un autre appareil. Choisissez la version à conserver.");
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
        setError(loadError instanceof Error ? loadError.message : "Chargement du brouillon indisponible.");
      });

    return () => { active = false; };
  }, [applyDraft, community.donationUrl, localDraftKey, retryLoadCount]);

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
      setError("Stockage local indisponible. Gardez cette page ouverte et libérez de l’espace sur cet appareil avant de continuer.");
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
  }, [draftReady, draftSnapshot, localDraftKey, saveQueue, serverReady, draftConflict]);

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
    if (key === "shabbat") return;
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
          "group flex min-h-[66px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25",
          isActive
            ? "border-emerald-300 bg-[#eaf8f2] text-[#123d39] shadow-[0_8px_20px_rgba(16,100,85,0.07)]"
            : "border-slate-200 bg-white text-slate-700 hover:border-[#8acbbb] hover:bg-[#f5fbf8]"
        )}
      >
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", isActive ? "bg-[#0f766e] text-white" : "bg-[#edf2f4] text-[#46616e]")}>
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-snug">{module.title}</span>
          {module.locked ? <span className="mt-0.5 block text-[11px] font-medium text-slate-500">Toujours inclus</span> : null}
        </span>
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-black", isActive ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-slate-300 bg-white text-transparent")}>
          ✓
        </span>
      </button>
    );
  }

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>, target: "photos" | "posters" | "partnerAds" | "banner") {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (uploadBusyRef.current || !selected.length) return;
    const remaining = target === "photos" ? 9 - photos.length : target === "posters" ? 5 - posters.length : target === "partnerAds" ? 3 - partnerAds.length : 1;
    const files = selected.slice(0, remaining);
    if (!files.length) { setError("Limite atteinte. Retirez une image avant d’en ajouter une autre."); return; }
    uploadBusyRef.current = true;
    setUploading(true);
    setError(null);
    try {
      const errors = await uploadNewsletterBatch(files, uploadNewsletterImage, (uploaded) => {
        if (target === "banner") setBannerPhotoUrl(uploaded.url);
        else if (target === "photos") setPhotos((current) => [...current, uploaded].slice(0, 9));
        else if (target === "posters") setPosters((current) => [...current, uploaded].slice(0, 5));
        else setPartnerAds((current) => [...current, uploaded].slice(0, 3));
      }, (completed, total) => setUploadProgress(`Importation : ${completed}/${total} fichier(s)`));
      if (selected.length > remaining) errors.push(`Seuls les ${remaining} premiers fichiers ont été traités : limite de la rubrique atteinte.`);
      if (errors.length) setError(errors.join("\n"));
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
      const data = await response.json().catch(() => ({})) as { donationUrl?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      setDonationUrl(data.donationUrl ?? "");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Enregistrement impossible.");
    } finally {
      setSavingDonationUrl(false);
    }
  }

  async function exportPdf(pages: HTMLElement[]) {
    if (!generated.title.trim()) {
      setError("Donnez un titre à votre newsletter avant de télécharger le PDF.");
      setEditorStep("modules");
      return;
    }
    if (pages.length === 0) return;
    if (pages.length > 2) throw new Error("Le feuillet est limité à une A4 recto verso (2 pages maximum).");
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
        await waitForImages([page]);
        const printable = page.firstElementChild as HTMLElement | null;
        if (
          page.scrollWidth > exportWidth + 1
          || page.scrollHeight > exportHeight + 1
          || (printable && (printable.scrollWidth > exportWidth + 1 || printable.scrollHeight > exportHeight + 1))
        ) {
          throw new Error(`La page ${index + 1} dépasse le format A4. Réduisez un texte ou retirez une rubrique.`);
        }
        const dataUrl = await toPng(page, {
          cacheBust: true,
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
      setError(pdfError instanceof Error ? pdfError.message : "Export PDF impossible.");
    } finally {
      snapshot.remove();
      setExporting(false);
    }
  }

  async function prepareOutput(action: "preview" | "print" | "pdf") {
    if (preparingAction || exporting || uploading || !draftReady) return;
    if (!generated.title.trim()) {
      setError("Donnez un titre à votre newsletter avant de continuer.");
      setEditorStep("modules");
      return;
    }
    setError(null);
    setPreparingAction(action);
    try {
      setEditorStep("preview");
      await nextPaint();
      const pages = await documentRef.current?.prepare();
      if (!pages?.length) throw new Error("Composition du feuillet impossible.");
      if (pages.length > 2) throw new Error("Le feuillet est limité à une A4 recto verso (2 pages maximum).");
      if (action === "preview") {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      await waitForImages(pages);
      if (action === "print") window.print();
      if (action === "pdf") await exportPdf(pages);
    } catch (outputError) {
      setError(outputError instanceof Error ? outputError.message : "Préparation du feuillet impossible.");
      setEditorStep("content");
    } finally {
      setPreparingAction(null);
    }
  }

  return (
    <fieldset disabled={!draftReady || uploading || preparingAction !== null || exporting} className="mx-auto min-w-0 w-full max-w-7xl space-y-5 overflow-x-clip bg-[#f7faf8] pb-[calc(12rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 md:pb-28">
      <section className="relative overflow-hidden rounded-b-[2.4rem] bg-[radial-gradient(circle_at_82%_10%,#1d8276_0%,#164960_44%,#112b45_100%)] px-5 pb-7 pt-7 text-white shadow-[0_20px_42px_rgba(17,43,69,0.18)] sm:rounded-[2rem] sm:px-8">
        <span className="pointer-events-none absolute -right-14 top-12 size-48 rounded-full bg-[#a2e2c8]/20 blur-3xl" />
        <span className="pointer-events-none absolute -left-10 bottom-0 size-36 rounded-full bg-[#b7dcec]/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b9eee0]">Votre rendez-vous de Chabbat</p>
            <h1 className="mt-2 max-w-2xl break-words text-[clamp(2rem,9vw,3.1rem)] font-black leading-[0.98] tracking-[-0.045em]">Créez votre feuillet <span className="mt-2 inline-flex rounded-xl bg-white px-2.5 py-1 text-[0.38em] tracking-normal text-[#164960] shadow-sm">en 3 étapes</span></h1>
          </div>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-white/20 bg-white/10 text-2xl font-black shadow-lg backdrop-blur-sm">ב&quot;ה</span>
        </div>
      </section>

      <section className="mx-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dce9e5] bg-white px-4 py-2.5 sm:mx-0">
        <p className="text-sm text-slate-700">Communauté : <strong>{community.name}</strong></p>
        <a href="/dashboard/settings?section=community" className="text-sm font-semibold text-[#0b7069] underline underline-offset-2">Modifier</a>
      </section>
      <nav className="mx-4 rounded-[1.7rem] border border-[#dce9e5] bg-white/90 p-2 shadow-[0_14px_35px_rgba(17,43,69,0.07)] sm:mx-0 sm:p-2.5 print:hidden" aria-label="Étapes de création">
        <div className="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
          {([
            ["modules", "01", "Composer", "Choisir les rubriques", LayoutList, "bg-[#164960] text-white shadow-[0_10px_24px_rgba(17,43,69,0.16)]", "border-[#dce9e5] bg-[#f2f8f6] text-[#164960] hover:bg-[#e6f2ed]"],
            ["content", "02", "Personnaliser", "Ajouter vos contenus", PenLine, "bg-[#0f766e] text-white shadow-[0_10px_24px_rgba(15,118,110,0.16)]", "border-[#dce9e5] bg-[#f2f8f6] text-[#164960] hover:bg-[#e6f2ed]"],
            ["preview", "03", "Feuillet", "Vérifier et imprimer", Eye, "bg-[#d7a95b] text-[#2f291d] shadow-[0_10px_24px_rgba(146,105,41,0.16)]", "border-[#dce9e5] bg-[#f2f8f6] text-[#164960] hover:bg-[#e6f2ed]"],
          ] as const).map(([step, number, label, detail, Icon, activeClass, idleClass]) => (
            <button key={step} type="button" aria-current={editorStep === step ? "step" : undefined} onClick={() => step === "preview" ? void prepareOutput("preview") : setEditorStep(step)} disabled={preparingAction !== null} className={cn("group flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.2rem] border border-transparent px-1 py-2 text-center transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:min-h-[78px] sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-left", editorStep === step ? activeClass : idleClass)}>
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
          {draftStatus === "restoring" ? "Reprise du brouillon…" : draftStatus === "saving" ? "Sauvegarde…" : draftStatus === "offline" ? "Sauvegardé sur cet appareil" : draftStatus === "error" ? "Brouillon indisponible" : "Brouillon sauvegardé automatiquement"}
        </span>
      </div>

      {error ? <p role="alert" className="mx-4 whitespace-pre-line rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 sm:mx-0 print:hidden">{error}</p> : null}
      {mayContainLegacyCuts ? <p className="mx-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-0">Certains textes de cet ancien brouillon semblent avoir été coupés lors de leur génération. Relisez-les dans « Personnaliser » pour compléter les phrases. Le nouvel export conserve désormais tout le texte enregistré.</p> : null}
      {!serverReady && !draftConflict ? <a href="/dashboard/newsletter" className="mx-4 inline-block font-bold text-violet-800 underline sm:mx-0">Réessayer le chargement</a> : null}
      {draftConflict && pendingServerDraft ? <div className="mx-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:mx-0">
        <p className="font-bold">Une autre version du brouillon a été enregistrée. Vos modifications restent sur cet appareil.</p>
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
          }} className="min-h-11 rounded-xl bg-white px-3 font-bold text-amber-950 ring-1 ring-amber-300">Utiliser la version serveur</button>
          <button type="button" onClick={() => {
            setPendingServerDraft(null);
            setDraftConflict(false);
            conflictRef.current = false;
            serverReadyRef.current = true;
            setServerReady(true);
            setError(null);
          }} className="min-h-11 rounded-xl bg-[#421388] px-3 font-bold text-white">Conserver ma version</button>
        </div>
      </div> : null}
      {uploading ? <p role="status" className="mx-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 sm:mx-0">{uploadProgress}</p> : null}
      <div className="grid gap-5 px-4 sm:px-0 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <aside className="space-y-4 print:hidden">
          <section className={cn("rounded-[1.8rem] border border-[#dce9e5] bg-white p-4 shadow-[0_14px_34px_rgba(17,43,69,0.06)]", editorStep !== "modules" && "hidden")}>
            <div className="rounded-[1.35rem] bg-[linear-gradient(135deg,#eaf6f0,#f6faf7_72%)] p-4 ring-1 ring-[#d3e9df]">
              <label htmlFor="newsletter-title" className="text-xs font-black uppercase tracking-[0.14em] text-[#164960]">Titre du feuillet</label>
              <input
                id="newsletter-title"
                value={generated.title}
                maxLength={70}
                onChange={(event) => setGenerated((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ex. Les nouvelles de notre communauté"
                className="mt-2 h-12 w-full rounded-2xl border border-[#c4ded5] bg-white px-4 text-base font-black text-slate-950 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-4 focus:ring-emerald-100"
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500">
                <span>Visible sur le feuillet</span>
                <span>{generated.title.length}/70</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">L’essentiel</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">À garder pour cette semaine</p>
              </div>
              <span className="rounded-full bg-[#eaf8f2] px-3 py-1 text-xs font-black text-[#0d675e]">{activeCount} actives</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{ESSENTIAL_MODULES.map(renderModuleToggle)}</div>

            <div className="mt-6">
              <h2 className="text-base font-black text-slate-950">Ajouter si besoin</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{OPTIONAL_MODULES.map(renderModuleToggle)}</div>
            </div>
          </section>

          {editorStep === "content" ? <>
          <section className="rounded-[1.8rem] border border-teal-100 bg-gradient-to-br from-white via-white to-teal-50/50 p-4 shadow-[0_14px_34px_rgba(0,85,114,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#421388]">Votre contenu</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Personnalisez l’essentiel</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Vos textes seront repris tels quels.</p>
            <div className="mt-4 space-y-3">
              <TextArea label="Introduction du feuillet" value={generated.intro} onChange={(intro) => setGenerated((current) => ({ ...current, intro }))} />
              {enabled.ravWord ? (
                <section className="rounded-2xl border border-[#cfe6d9] bg-[#f5fbf7] p-3 text-sm font-bold text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="newsletter-rav-word" className="text-sm font-black text-[#173a40]">Mot du Rav</label>
                    <button
                      type="button"
                      onClick={() => void requestRavSuggestion()}
                      disabled={ravSuggestionLoading || !initialShabbat?.parasha?.trim()}
                      aria-controls="newsletter-rav-suggestion"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#087e55] px-3 py-2 text-xs font-black text-white shadow-[0_7px_16px_rgba(8,126,85,0.18)] transition hover:bg-[#066c49] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {ravSuggestionLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      {ravSuggestionLoading ? "Création…" : "Créer un mot lié à la Paracha avec l’IA"}
                    </button>
                  </div>
                  <textarea
                    id="newsletter-rav-word"
                    value={generated.ravWord}
                    onChange={(event) => setGenerated((current) => ({ ...current, ravWord: event.target.value }))}
                    rows={6}
                    className="mt-3 w-full resize-y rounded-xl border border-[#cfe6d9] bg-white px-3 py-2 text-base font-medium leading-6 outline-none focus:border-[#087e55] focus:ring-4 focus:ring-emerald-100 sm:text-sm"
                  />
                  <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{generated.ravWord.length} caractères</span>
                  <div id="newsletter-rav-suggestion" aria-live="polite">
                    {!initialShabbat?.parasha?.trim() ? <p className="mt-2 text-xs font-medium text-amber-800">La Paracha doit être disponible pour créer une proposition.</p> : null}
                    {ravSuggestionError ? <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{ravSuggestionError}</p> : null}
                    {ravSuggestion ? <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
                      <p className="flex items-center gap-1.5 text-xs font-black text-[#087e55]"><Sparkles className="size-3.5" /> Proposition IA à relire</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-800">{ravSuggestion}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setGenerated((current) => ({ ...current, ravWord: ravSuggestion })); setRavSuggestion(""); }} className="min-h-10 rounded-lg bg-[#087e55] px-3 text-xs font-black text-white transition hover:bg-[#066c49] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">{generated.ravWord.trim() ? "Remplacer mon texte" : "Utiliser ce mot"}</button>
                        <button type="button" onClick={() => setRavSuggestion("")} className="min-h-10 rounded-lg px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">Ignorer</button>
                      </div>
                    </div> : null}
                  </div>
                </section>
              ) : null}
              {enabled.shabbat ? <section className="overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-sm">
                <button type="button" aria-expanded={parashaOpen} aria-controls="newsletter-parasha-panel" onClick={() => setParashaOpen((open) => !open)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800"><BookOpen className="size-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-black text-slate-900">Résumé de la Paracha</span><span className="block text-xs font-medium text-slate-600">{generated.shabbatNote.trim() ? "Texte ajouté · ouvrir pour modifier" : "Facultatif · ouvrir pour ajouter"}</span></span>
                  <ChevronDown className={cn("size-5 shrink-0 text-teal-800 transition-transform", parashaOpen && "rotate-180")} />
                </button>
                <div id="newsletter-parasha-panel" hidden={!parashaOpen} className="border-t border-teal-100 px-4 pb-4 pt-3"><TextArea label="Texte de la Paracha" value={generated.shabbatNote} onChange={(shabbatNote) => setGenerated((current) => ({ ...current, shabbatNote }))} /></div>
              </section> : null}
              {enabled.events ? <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
                <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:px-4">
                  <button type="button" aria-expanded={agendaOpen} aria-controls="newsletter-agenda-panel" onClick={() => setAgendaOpen((open) => !open)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900"><CalendarDays className="size-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-black text-slate-900">Introduction de l’agenda</span><span className="block text-xs font-medium text-slate-600">{initialEvents.length} événement(s) repris depuis Mon Agenda</span></span>
                    <ChevronDown className={cn("size-5 shrink-0 text-amber-800 transition-transform", agendaOpen && "rotate-180")} />
                  </button>
                  <a href="/dashboard/events" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-white px-2 text-[11px] font-black text-amber-900 ring-1 ring-amber-200 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 sm:px-3" aria-label="Ouvrir Mon Agenda dans un nouvel onglet">Mon Agenda <ArrowUpRight className="size-3.5" /></a>
                </div>
                <div id="newsletter-agenda-panel" hidden={!agendaOpen} className="border-t border-amber-100 px-4 pb-4 pt-3"><TextArea label="Texte avant les événements" value={generated.eventIntro} onChange={(eventIntro) => setGenerated((current) => ({ ...current, eventIntro }))} /></div>
              </section> : null}
              {enabled.parness ? <TextInput label="Parness Hayom" value={parnessText} onChange={setParnessText} placeholder="Ex. Leylouy Nichmat..." /> : null}
              {enabled.kiddush ? <TextInput label="Kidouch offert par" value={kiddushText} onChange={setKiddushText} placeholder="Ex. Famille Cohen" /> : null}
              <label className="block text-sm font-bold text-slate-700">
                Lien de la page de dons
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <input value={donationUrl} onChange={(event) => setDonationUrl(event.target.value)} placeholder="https://allodons.fr/..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3] sm:text-sm" />
                  <button type="button" onClick={() => void saveDonationLink()} disabled={savingDonationUrl} className="min-h-10 rounded-xl bg-[#18264d] px-3 text-xs font-black text-white disabled:opacity-60">{savingDonationUrl ? "Enregistrement..." : "Enregistrer"}</button>
                </div>
              </label>
              <section className="text-sm font-bold text-slate-700">
                <p>Photo de bannière (synagogue / Beth Habad)</p>
                <div className="mt-1.5 flex min-w-0 items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2">
                  {bannerPhotoUrl ? <img src={bannerPhotoUrl} alt="Photo de bannière ajoutée" className="size-16 shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-200" /> : <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200"><ImagePlus className="size-6" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-600">{bannerPhotoUrl ? "Photo ajoutée au feuillet" : "Photo optionnelle"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-white px-3 text-xs font-bold text-[#36506d] shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-violet-600">
                        {bannerPhotoUrl ? "Remplacer" : "Choisir"}
                        <input type="file" accept={NEWSLETTER_IMAGE_ACCEPT} className="sr-only" disabled={uploading} onChange={(event) => void uploadMedia(event, "banner")} />
                      </label>
                      {bannerPhotoUrl ? <button type="button" onClick={() => setBannerPhotoUrl("")} className="min-h-10 rounded-lg px-3 text-xs font-bold text-slate-600 underline">Retirer</button> : null}
                    </div>
                  </div>
                </div>
              </section>
              {enabled.restaurantAd ? <section className="text-sm font-bold text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span>Pub partenaire</span>
                  <span className="text-xs font-semibold text-slate-400">{partnerAds.length}/3 visuel(x)</span>
                </div>
                <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  <span className="truncate">Ajouter un visuel</span>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[#36506d] shadow-sm">Televerser</span>
                  <input type="file" accept={NEWSLETTER_IMAGE_ACCEPT} multiple className="sr-only" disabled={uploading || partnerAds.length >= 3} onChange={(event) => void uploadMedia(event, "partnerAds")} />
                </label>
                {partnerAds.length > 0 ? <div className="mt-3 grid grid-cols-3 gap-2">
                  {partnerAds.map((ad) => <div key={ad.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
                    <img src={ad.url} alt={ad.name} className="aspect-square w-full object-contain" />
                    <button type="button" onClick={() => setPartnerAds((current) => current.filter((item) => item.id !== ad.id))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 shadow transition hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-600">Retirer</button>
                  </div>)}
                </div> : null}
              </section> : null}
            </div>
          </section>

          {enabled.photos ? <section className="rounded-[1.65rem] border border-sky-100 bg-gradient-to-br from-white to-sky-50/60 p-4 shadow-[0_12px_28px_rgba(48,25,91,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#005572]">Photos de la semaine</p>
                <p className="mt-1 text-sm text-slate-500">{photos.length}/9 photo(s) ajoutee(s)</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#36506d] px-3 py-2 text-xs font-black text-white transition hover:bg-[#17253f]">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Ajouter
                <input type="file" accept={NEWSLETTER_IMAGE_ACCEPT} multiple className="sr-only" onChange={(event) => void uploadMedia(event, "photos")} disabled={uploading || photos.length >= 9} />
              </label>
            </div>
            {photos.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
                    <img src={photo.url} alt={photo.name} className="aspect-square w-full object-contain" />
                    <button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 shadow transition hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-600">
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">Aucune photo ajoutée</div>
            )}
          </section> : null}

          {enabled.posters ? <section className="rounded-[1.65rem] border border-amber-100 bg-gradient-to-br from-white to-amber-50/60 p-4 shadow-[0_12px_28px_rgba(48,25,91,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-900">Affiches &amp; événements à venir...</p>
                <p className="mt-1 text-sm text-slate-500">{posters.length}/5 affiche(s) ajoutée(s)</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#18264d] px-3 py-2 text-xs font-black text-white transition hover:bg-[#101b37]">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Ajouter
                <input type="file" accept={NEWSLETTER_IMAGE_ACCEPT} multiple className="sr-only" onChange={(event) => void uploadMedia(event, "posters")} disabled={uploading || posters.length >= 5} />
              </label>
            </div>
            {posters.length > 0 ? <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {posters.map((poster) => <div key={poster.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
                <img src={poster.url} alt={poster.name} className="aspect-[3/4] w-full object-contain" />
                <button type="button" onClick={() => setPosters((current) => current.filter((item) => item.id !== poster.id))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 shadow transition hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-600">Retirer</button>
              </div>)}
            </div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">Aucune affiche ajoutée</div>}
          </section> : null}

          {generated.warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {generated.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}

          </> : null}
        </aside>

        <main ref={previewRef} className={cn("min-w-0 rounded-[1.8rem] border border-amber-100 bg-gradient-to-b from-[#fffdf8] to-[#f7f2e7] p-3 shadow-[0_16px_42px_rgba(95,68,22,0.1)] sm:p-5 xl:col-span-2", editorStep !== "preview" && "hidden")}>
          {draftReady ? <NewsletterDocument ref={documentRef} data={documentData} visible={editorStep === "preview"} onError={setError} /> : null}
        </main>
      </div>
      <div className={cn("fixed inset-x-0 bottom-[calc(5.95rem+env(safe-area-inset-bottom))] z-20 border-t border-[#dce9e5] bg-[#f7faf8]/95 px-3 py-2 backdrop-blur print:hidden md:bottom-0 md:z-40 md:py-3", keyboardOpen && "max-md:hidden")}>
        <div className={cn("mx-auto grid max-w-3xl gap-2", editorStep === "preview" ? "grid-cols-3" : "grid-cols-1")}>
          {editorStep === "modules" ? (
            <Button type="button" onClick={() => { if (generated.title.trim()) { setError(null); setEditorStep("content"); } else { setError("Donnez un titre à votre newsletter avant de continuer."); } }} className="min-h-13 rounded-2xl bg-[#164960] px-5 font-black text-white shadow-[0_10px_22px_rgba(17,43,69,0.18)] hover:bg-[#113d50]">
              Continuer <PenLine className="size-4" />
            </Button>
          ) : null}
          {editorStep === "content" ? <Button type="button" onClick={() => void prepareOutput("preview")} loading={preparingAction === "preview"} className="min-h-13 rounded-2xl bg-[#164960] px-5 font-black text-white shadow-[0_10px_22px_rgba(17,43,69,0.18)] hover:bg-[#113d50]">Continuer <Eye className="size-4" /></Button> : null}
          {editorStep === "preview" ? <>
            <Button type="button" variant="outline" onClick={() => setEditorStep("content")} className="min-h-12 rounded-2xl border-violet-200 bg-white px-2 text-xs font-black text-[#421388] sm:text-sm"><PenLine className="size-4" />Modifier</Button>
            <Button type="button" variant="outline" onClick={() => void prepareOutput("print")} loading={preparingAction === "print"} className="min-h-12 rounded-2xl border-violet-200 bg-white px-2 text-xs font-black text-[#421388] sm:text-sm"><Printer className="size-4" />Imprimer</Button>
            <Button type="button" onClick={() => void prepareOutput("pdf")} loading={preparingAction === "pdf" || exporting} className="min-h-12 rounded-2xl bg-[#ffcd32] px-2 text-xs font-black text-[#28104f] hover:bg-[#f2bd16] sm:text-sm"><Download className="size-4" />PDF A4</Button>
          </> : null}
        </div>
      </div>
    </fieldset>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3] sm:text-sm" />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-slate-700">{label}
    <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-violet-100 px-3 py-2 text-base font-medium leading-6 outline-none focus:border-violet-700 focus:ring-2 focus:ring-violet-100 sm:text-sm" />
  </label>;
}
