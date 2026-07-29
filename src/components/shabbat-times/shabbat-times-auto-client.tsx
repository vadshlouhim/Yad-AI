"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Edit3,
  ImageIcon,
  Info,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Send,
  Settings,
  Sparkles,
  Star,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAVID_IMAGE_URL, DavidAutomationCard, DavidBannerAgent } from "@/components/automations/automation-design-kit";
import { cn } from "@/lib/utils";
import {
  SHABBAT_TEMPLATE_SOURCE_CONFIG,
  type ShabbatCardItem,
  type ShabbatTemplateMode,
} from "@/lib/automation/shabbat-times";
import type { Json } from "@/types/database.types";

type DesignZone = {
  id: string;
  label: string;
  type: string;
  defaultText: string;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subCategory: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  design: DesignZone[];
  isGlobal: boolean;
  isPremium: boolean;
  tags: string[];
  usageCount: number;
};

type Community = {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  timezone: string | null;
  tone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  religiousStream: string | null;
  plan: string;
};

type InitialAutomation = {
  id: string;
  name: string;
  isActive: boolean;
  status: string;
  nextRunAt: string | null;
  triggerConfig: Json;
  updatedAt: string;
} | null;

type SocialChannel = {
  type: "INSTAGRAM" | "FACEBOOK" | string;
  name: string;
  handle: string | null;
  pageId: string | null;
  settings: Json | null;
  isConnected: boolean;
  isActive: boolean;
};

type ShabbatFields = {
  logoUrl: string;
  structureName: string;
  city: string;
  parasha: string;
  entry: string;
  exit: string;
  kiddouch: string;
};

type PosterConfig = {
  selectedTemplateId?: string | null;
  selectedTemplateCategory?: ShabbatTemplateMode | null;
  palette?: string;
  fields?: Partial<ShabbatFields>;
  postText?: string;
  officeTimes?: string;
  notificationDay?: string;
  notificationDayOfWeek?: number;
  notificationTime?: string;
  scheduleMode?: "notification" | "direct";
  channels?: string[];
  configured?: boolean;
  suspended?: boolean;
};

type View = "overview" | "models" | "customize" | "success";
type ScheduleMode = "notification" | "direct";

type AiMessage = { from: "ai" | "user"; text: string };

type Props = {
  templates: Record<ShabbatTemplateMode, Template[]>;
  community: Community;
  shabbat: ShabbatCardItem | null;
  initialAutomation: InitialAutomation;
  socialChannels: SocialChannel[];
};

const paletteOptions = [
  { id: "violet", label: "Violet", classes: "from-violet-950 via-purple-900 to-violet-700", accent: "#f4c76a" },
  { id: "blue", label: "Bleu", classes: "from-slate-950 via-blue-950 to-sky-800", accent: "#d9b36a" },
  { id: "emerald", label: "Émeraude", classes: "from-emerald-950 via-teal-900 to-emerald-700", accent: "#f0d48a" },
  { id: "rose", label: "Rose", classes: "from-rose-950 via-pink-900 to-rose-700", accent: "#ffd0a1" },
  { id: "gold", label: "Or", classes: "from-amber-950 via-yellow-800 to-amber-500", accent: "#2b1b0b" },
  { id: "mono", label: "Monochrome", classes: "from-zinc-950 via-zinc-900 to-zinc-700", accent: "#f8fafc" },
] as const;

const dayOptions = [
  { label: "Dimanche", value: "Dimanche", dayOfWeek: 0 },
  { label: "Lundi", value: "Lundi", dayOfWeek: 1 },
  { label: "Mardi", value: "Mardi", dayOfWeek: 2 },
  { label: "Mercredi", value: "Mercredi", dayOfWeek: 3 },
  { label: "Jeudi", value: "Jeudi", dayOfWeek: 4 },
  { label: "Vendredi", value: "Vendredi", dayOfWeek: 5 },
];

const defaultPostText = "Chabbat Chalom à toute la communauté.\nRetrouvez les horaires de ce Chabbat.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getPosterConfig(automation: InitialAutomation): PosterConfig {
  if (!automation || !isRecord(automation.triggerConfig)) return {};
  const config = automation.triggerConfig.shabbatPoster;
  return isRecord(config) ? (config as PosterConfig) : {};
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatField(value: string | null | undefined) {
  return value && value.trim().length > 0 ? value : "—";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function buildDefaultFields(community: Community, shabbat: ShabbatCardItem | null, saved?: Partial<ShabbatFields>): ShabbatFields {
  return {
    logoUrl: saved?.logoUrl ?? community.logoUrl ?? "",
    structureName: saved?.structureName ?? community.name ?? "",
    city: saved?.city ?? shabbat?.cityName ?? community.city ?? "Paris",
    parasha: saved?.parasha ?? shabbat?.parasha ?? "",
    entry: saved?.entry ?? shabbat?.entry ?? "",
    exit: saved?.exit ?? shabbat?.exit ?? "",
    kiddouch: saved?.kiddouch ?? "",
  };
}

function selectedTemplateFromConfig(
  templates: Record<ShabbatTemplateMode, Template[]>,
  mode: ShabbatTemplateMode,
  templateId: string | null | undefined
) {
  return templates[mode].find((t) => t.id === templateId) ?? templates[mode][0] ?? null;
}

function buildSocialProfileUrl(channels: SocialChannel[], type: "INSTAGRAM" | "FACEBOOK") {
  const channel = channels.find((item) => item.type === type && item.isActive && item.isConnected);
  if (!channel) return null;

  if (type === "INSTAGRAM") {
    return channel.handle ? `https://www.instagram.com/${channel.handle.replace(/^@/, "")}` : null;
  }

  const settings = isRecord(channel.settings) ? channel.settings : {};
  const metaPageId = typeof settings.metaPageId === "string" ? settings.metaPageId : null;
  const pageId = channel.pageId ?? metaPageId;
  return pageId ? `https://www.facebook.com/${pageId}` : null;
}

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="130%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="6" y="6" width="12" height="12" rx="3.5" stroke="white" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" />
      <circle cx="16.6" cy="7.4" r="0.9" fill="white" />
    </svg>
  );
}

function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path d="M13.5 8.5h2V6h-2C11.3 6 10 7.3 10 9.5V11H8.5v2.5H10V21h2.5v-7.5H15l.5-2.5h-3V9.5c0-.55.45-1 1-1z" fill="white" />
    </svg>
  );
}

function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="6" fill="#25D366" />
      <path fillRule="evenodd" clipRule="evenodd" d="M12 4C7.58 4 4 7.58 4 12c0 1.42.38 2.75 1.05 3.9L4 20l4.27-1.12A7.94 7.94 0 0012 20c4.42 0 8-3.58 8-8s-3.58-8-8-8zm3.82 11.25c-.2.55-1.15 1.06-1.58 1.12-.4.06-.9.08-1.45-.1-.34-.1-.77-.26-1.3-.5-2.3-1-3.8-3.33-3.91-3.49-.12-.16-1-1.32-1-2.52s.63-1.79.86-2.03c.22-.24.48-.3.64-.3h.47c.16 0 .37-.06.57.44.2.5.7 1.73.76 1.86.06.12.1.27.01.43-.08.16-.12.25-.24.4-.12.14-.25.3-.36.4-.12.12-.24.25-.1.5.14.24.64 1.05 1.37 1.7.94.84 1.73 1.1 1.98 1.22.24.12.38.1.52-.06.14-.16.62-.72.79-.97.16-.25.32-.2.54-.12.22.08 1.39.66 1.63.78.24.12.4.18.46.28.06.1.06.57-.14 1.12z" fill="white" />
    </svg>
  );
}

const CHANNEL_OPTIONS = [
  { id: "INSTAGRAM", label: "Instagram", Logo: InstagramLogo, activeClass: "border-pink-400 bg-pink-50 ring-2 ring-pink-200", badgeClass: "border-pink-200 bg-pink-50 text-pink-700" },
  { id: "FACEBOOK", label: "Facebook", Logo: FacebookLogo, activeClass: "border-blue-500 bg-blue-50 ring-2 ring-blue-200", badgeClass: "border-blue-200 bg-blue-50 text-blue-700" },
] as const;

function SmartphoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="relative aspect-[12/25] w-full max-w-[315px] rounded-[3rem] border border-[#b9853f] bg-[#f2935a] p-1 shadow-[0_22px_54px_rgba(15,23,42,0.32)]">
        <div className="absolute -left-1 top-24 h-8 w-1 rounded-l-md bg-[#f2935a]" />
        <div className="absolute -left-1 top-40 h-14 w-1 rounded-l-md bg-[#f2935a]" />
        <div className="absolute -right-1 top-44 h-20 w-1 rounded-r-md bg-[#f2935a]" />
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[2.8rem] bg-white">
          <div className="flex h-12 flex-shrink-0 items-center justify-between px-6 pt-2 text-black">
            <span className="text-[13px] font-semibold">9:41</span>
            <span className="h-6 w-24 rounded-full bg-black" />
            <span className="text-[11px] font-bold">5G</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function PosterFallback({
  fields,
  palette,
  mode,
}: {
  fields: ShabbatFields;
  palette: (typeof paletteOptions)[number];
  mode: ShabbatTemplateMode;
}) {
  return (
    <div className={cn("relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-br p-7 text-white", palette.classes)}>
      <div className="absolute inset-3 border border-white/30" />
      <div className="absolute left-6 right-6 top-6 h-12 border-x border-t border-white/40" />
      <div className="relative z-10 flex flex-1 flex-col items-center text-center">
        {fields.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fields.logoUrl} alt="" className="h-16 w-16 rounded-xl object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/40 text-lg font-black">
            {getInitials(fields.structureName) || "EC"}
          </div>
        )}
        <p className="mt-3 max-w-[190px] text-[11px] font-bold uppercase tracking-[0.28em] text-white/90">
          {fields.structureName || "Votre synagogue"}
        </p>
        <div className="my-5 h-px w-36 bg-white/40" />
        <h2 className="text-[34px] font-serif uppercase leading-tight" style={{ color: palette.accent }}>
          Chabbat {fields.parasha || "Chalom"}
        </h2>
        <div className="my-5 h-px w-36 bg-white/40" />
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/80">Entrée</p>
            <p className="mt-2 text-[38px] font-serif leading-none">{fields.entry || "21:39"}</p>
          </div>
          <div className="h-20 w-px bg-white/40" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/80">Sortie</p>
            <p className="mt-2 text-[38px] font-serif leading-none">{fields.exit || "23:01"}</p>
          </div>
        </div>
        {mode === "detailed" && (
          <p className="mt-5 rounded-full border border-white/25 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80">
            Offices inclus
          </p>
        )}
        <div className="mt-auto">
          {fields.kiddouch && (
            <>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/80">Kiddouch offert par</p>
              <p className="mt-2 font-serif text-[24px] italic" style={{ color: palette.accent }}>
                {fields.kiddouch}
              </p>
            </>
          )}
          <p className="mt-5 text-[15px] font-semibold text-white/90">×©×‘×ª ×©×œ×•×</p>
        </div>
      </div>
    </div>
  );
}

function TemplateImage({ template }: { template: Template }) {
  const [imageSource, setImageSource] = useState(template.previewUrl ?? template.thumbnailUrl);
  if (!imageSource) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
        <ImageIcon className="size-10" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSource}
      alt={template.name}
      className="h-full w-full object-cover"
      onError={() => setImageSource(imageSource === template.thumbnailUrl ? null : template.thumbnailUrl)}
    />
  );
}

export function ShabbatTimesAutoClient({
  templates,
  community,
  shabbat,
  initialAutomation,
  socialChannels,
}: Props) {
  const savedConfig = getPosterConfig(initialAutomation);
  const initialMode = savedConfig.selectedTemplateCategory ?? "simple";

  const [view, setView] = useState<View>("overview");
  const [templateMode, setTemplateMode] = useState<ShabbatTemplateMode>(initialMode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    savedConfig.selectedTemplateId ?? selectedTemplateFromConfig(templates, initialMode, null)?.id ?? null
  );
  const [fields, setFields] = useState<ShabbatFields>(() => buildDefaultFields(community, shabbat, savedConfig.fields));
  const [palette] = useState(savedConfig.palette ?? "violet");
  const [postText, setPostText] = useState(savedConfig.postText ?? defaultPostText);
  const [officeTimes, setOfficeTimes] = useState(savedConfig.officeTimes ?? "");
  const [notificationDay, setNotificationDay] = useState(savedConfig.notificationDay ?? "Vendredi");
  const [notificationDayOfWeek, setNotificationDayOfWeek] = useState(savedConfig.notificationDayOfWeek ?? 5);
  const [notificationTime, setNotificationTime] = useState(savedConfig.notificationTime ?? "10:00");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>((savedConfig.scheduleMode ?? "notification") as ScheduleMode);
  const [weeklyOptIn, setWeeklyOptIn] = useState<boolean | null>(savedConfig.configured ? true : null);
  const [channels, setChannels] = useState<string[]>(() => {
    const savedChannels = savedConfig.channels ?? ["INSTAGRAM", "FACEBOOK"];
    const socialChannels = savedChannels.filter((channel) => channel === "INSTAGRAM" || channel === "FACEBOOK");
    return socialChannels.length > 0 ? socialChannels : ["INSTAGRAM", "FACEBOOK"];
  });
  const [automation, setAutomation] = useState(initialAutomation);
  const [configured, setConfigured] = useState(Boolean(savedConfig.configured));
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [error, setError] = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [shabbatInfoOpen, setShabbatInfoOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [publicationSuccessOpen, setPublicationSuccessOpen] = useState(false);
  const [publishedChannels, setPublishedChannels] = useState<string[]>([]);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiDone, setAiDone] = useState(false);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const activeTemplates = templates[templateMode];
  const selectedTemplate = selectedTemplateFromConfig(templates, templateMode, selectedTemplateId);
  const selectedPalette = paletteOptions.find((item) => item.id === palette) ?? paletteOptions[0];
  const isPaid = community.plan !== "FREE_TRIAL";
  const instagramProfileUrl = buildSocialProfileUrl(socialChannels, "INSTAGRAM");
  const facebookProfileUrl = buildSocialProfileUrl(socialChannels, "FACEBOOK");

  const selectedTemplateIndex = activeTemplates.findIndex((t) => t.id === selectedTemplateId);
  const isFreeTemplate = selectedTemplateIndex === 0 || selectedTemplateIndex === -1;
  const aiFieldItems = [
    { key: "structureName", label: "Nom de la structure", icon: Pencil },
    { key: "city", label: "Ville", icon: MapPin },
    { key: "parasha", label: "Paracha", icon: BookOpen },
    { key: "entry", label: "Entrée de Chabbat", icon: Clock },
    { key: "exit", label: "Sortie de Chabbat", icon: Clock },
    ...(templateMode === "detailed" ? [{ key: "kiddouch", label: "Kiddouch offert par", icon: Star }] : []),
  ] as const;

  function startAiMode() {
    setAiDone(false);
    const detailSentence = templateMode === "detailed"
      ? "Comme vous avez choisi un visuel avec offices, indiquez aussi les horaires des offices si vous voulez les afficher."
      : "Comme vous avez choisi une affiche simple, je garde uniquement les informations essentielles.";
    setAiMessages([{
      from: "ai",
      text: `Voici les informations que j'ai : nom de la structure ${fields.structureName || community.name}, ville ${fields.city || community.city || "Paris"}, paracha ${fields.parasha || "à compléter"}, entrée ${fields.entry || shabbat?.entry || "à compléter"}, sortie ${fields.exit || shabbat?.exit || "à compléter"}. ${detailSentence} Validez-les ou modifiez ce qui doit l'être, puis je génère automatiquement l'aperçu.`,
    }]);
  }

  useEffect(() => {
    if (aiMessages.length === 0) {
      startAiMode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  async function validateAiInformation() {
    setAiDone(true);
    setAiMessages((prev) => [
      ...prev,
      { from: "user", text: "Informations validées" },
      { from: "ai", text: "Parfait, je génère automatiquement l'aperçu. Ensuite, choisissez où publier." },
    ]);
    await handleGeneratePreview();
  }

  async function handleGeneratePreview() {
    if (!selectedTemplateId || generatingPreview) return null;
    setGeneratingPreview(true);
    setPreviewError("");
    setPreviewImageUrl(null);
    try {
      const textBlocks = [
        { id: "structure", text: fields.structureName || community.name, role: "organization", priority: "main" },
        { id: "city", text: fields.city || community.city || "Paris", role: "location", priority: "complementary" },
        { id: "parasha", text: fields.parasha || "", role: "parasha", priority: "main" },
        { id: "entry", text: fields.entry || shabbat?.entry || "", role: "entry time", priority: "important" },
        { id: "exit", text: fields.exit || shabbat?.exit || "", role: "exit time", priority: "important" },
        ...(templateMode === "detailed" && fields.kiddouch
          ? [{ id: "kiddouch", text: fields.kiddouch, role: "kiddouch", priority: "complementary" }]
          : []),
        ...(templateMode === "detailed" && officeTimes
          ? [{ id: "offices", text: officeTimes, role: "office times", priority: "complementary" }]
          : []),
      ].filter((block) => block.text.trim().length > 0);

      const renderRes = await fetch("/api/templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId, textBlocks }),
      });
      if (!renderRes.ok) {
        const err = await renderRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Impossible de générer l'affiche.");
      }
      const renderData = await renderRes.json() as { imageUrl?: string };
      if (renderData.imageUrl) {
        setPreviewImageUrl(renderData.imageUrl);
        return renderData.imageUrl;
      }
      else throw new Error("Aucune image retourn?e.");
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Erreur lors de la génération.");
      return null;
    } finally {
      setGeneratingPreview(false);
    }
  }

  async function saveToApi(payload: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/shabbat-times-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible");
      setAutomation(data);
      return data as InitialAutomation;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Enregistrement impossible";
      setError(message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  function currentConfig(): PosterConfig {
    return {
      palette,
      fields,
      postText,
      officeTimes,
      notificationDay,
      notificationDayOfWeek,
      notificationTime,
      scheduleMode,
      channels,
    };
  }

  function toggleChannel(channel: string) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  }

  function handleSelectTemplate(template: Template, index: number) {
    if (!isPaid && index > 0) {
      setPaywallOpen(true);
      return;
    }
    setError("");
    setSelectedTemplateId(template.id);
  }

  async function continueToCustomize() {
    if (!isPaid && !isFreeTemplate) {
      setPaywallOpen(true);
      return;
    }
    if (!selectedTemplateId) return;
    const saved = await saveToApi({
      mode: "save-selection",
      templateId: selectedTemplateId,
      templateMode,
    });
    if (!saved) return;
    setView("customize");
    setAiMessages([]);
    setAiDone(false);
  }

  async function publishShabbatNow() {
    if (channels.length === 0) {
      setError("Sélectionnez au moins un réseau pour publier.");
      return;
    }

    const wantsWeeklyAutomation = weeklyOptIn === true;
    const baseConfig = currentConfig();
    const publishConfig: PosterConfig = { ...baseConfig, scheduleMode: "direct" };
    const weeklyConfig: PosterConfig = { ...baseConfig, scheduleMode: "notification" };

    const saved = await saveToApi({
      mode: "publish-now-config",
      templateId: selectedTemplateId,
      templateMode,
      config: publishConfig,
    });
    if (!saved?.id) return;

    setConfigured(wantsWeeklyAutomation);
    setAutomation(saved);
    setTriggering(true);
    setError("");
    try {
      const imageUrl = previewImageUrl ?? (await handleGeneratePreview());
      if (channels.includes("INSTAGRAM") && !imageUrl) {
        setError("L'aperçu de l'affiche est nécessaire pour publier sur Instagram.");
        return;
      }

      const response = await fetch("/api/shabbat-times-auto/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postText,
          imageUrl,
          channels,
        }),
      });
      const data = await response.json().catch(() => ({})) as {
        error?: string;
        successfulChannels?: string[];
      };
      if (!response.ok) {
        setError(data.error ?? "La publication n'a pas pu être envoyée aux réseaux sélectionnés.");
        return;
      }

      const successfulChannels = Array.isArray(data.successfulChannels) ? data.successfulChannels : [];
      if (successfulChannels.length === 0) {
        setError("La publication n'a pas été confirmée par Instagram ou Facebook.");
        return;
      }

      if (wantsWeeklyAutomation) {
        const weeklyAutomation = await saveToApi({
          mode: "activate",
          templateId: selectedTemplateId,
          templateMode,
          config: weeklyConfig,
        });
        if (weeklyAutomation) {
          setAutomation(weeklyAutomation);
          setConfigured(true);
        }
      } else {
        await saveToApi({ mode: "pause" });
        setConfigured(false);
      }

      setPublishedChannels(successfulChannels);
      setTriggerSuccess(true);
      setPublicationSuccessOpen(true);
      setTimeout(() => setTriggerSuccess(false), 4000);
    } catch {
      setError("Erreur réseau lors du déclenchement.");
    } finally {
      setTriggering(false);
    }
  }

  async function pauseAutomation() {
    const saved = await saveToApi({ mode: "pause" });
    if (saved) {
      setAutomation(saved);
      setConfigured(false);
    }
  }

  async function publishNow() {
    if (!automation?.id) return;
    setTriggering(true);
    setTriggerSuccess(false);
    setError("");
    try {
      const response = await fetch(`/api/automations/${automation.id}/trigger`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Erreur lors du déclenchement.");
      } else {
        setTriggerSuccess(true);
        setPublicationSuccessOpen(true);
        setTimeout(() => setTriggerSuccess(false), 4000);
      }
    } catch {
      setError("Erreur réseau lors du déclenchement.");
    } finally {
      setTriggering(false);
    }
  }

  function updateField(key: keyof ShabbatFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setAiDone(false);
  }

  async function uploadLogo(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Le logo doit être une image.");
      return;
    }
    setLogoUploading(true);
    setLogoUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads/community-logo", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        setLogoUploadError(result.error ?? "Impossible de téléverser le logo.");
        return;
      }
      updateField("logoUrl", result.logoUrl);
    } catch {
      setLogoUploadError("Impossible de téléverser le logo.");
    } finally {
      setLogoUploading(false);
      setLogoDragActive(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  // ??? SUCCESS VIEW ???????????????????????????????????????????????????????????
  if (view === "success") {
    return (
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-28 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-14 text-emerald-600" />
          </div>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">
            Votre automatisation a bien été créée !
          </h1>
          <p className="mt-4 max-w-md text-slate-500 leading-7">
            {scheduleMode === "direct"
              ? `Votre affiche de Chabbat sera publiée automatiquement chaque ${notificationDay} à ${notificationTime}.`
              : `Chaque ${notificationDay} à ${notificationTime}, vous recevrez une notification vous invitant à valider votre affiche avant publication.`}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {CHANNEL_OPTIONS.filter(({ id }) => channels.includes(id)).map(({ id, label, Logo, badgeClass }) => (
              <span key={id} className={cn("flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold", badgeClass)}>
                <Logo className="size-5" /> {label}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-6 py-4 text-sm text-violet-800 max-w-sm">
            {scheduleMode === "direct" ? (
              <p className="flex items-center gap-2"><Zap className="size-4 shrink-0" />Envoi automatique activé, aucune validation requise.</p>
            ) : (
              <p className="flex items-center gap-2"><Mail className="size-4 shrink-0" />Une notification d&apos;approbation vous sera envoyée à chaque cycle.</p>
            )}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {automation?.id && (
              <Button
                type="button"
                size="xl"
                loading={triggering}
                disabled={triggering}
                className={triggerSuccess ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]"}
                onClick={publishNow}
              >
                {triggerSuccess ? <><CheckCircle2 className="size-5" />Envoyé !</> : <><Send className="size-5" />Publier maintenant</>}
              </Button>
            )}
            <Button asChild size="xl" variant={automation?.id ? "outline" : "default"} className={automation?.id ? "" : "bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]"}>
              <Link href="/dashboard/events">
                <Calendar className="size-5" />
                Voir dans l&apos;Agenda IA
              </Link>
            </Button>
            <Button type="button" variant="outline" size="xl" onClick={() => setView("overview")}>
              Tableau de bord
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ??? MODELS VIEW ????????????????????????????????????????????????????????????
  if (view === "models") {
    const selectedModel = activeTemplates.find((t) => t.id === selectedTemplateId) ?? null;

    return (
      <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6 pb-24">
        {/* Header */}
        <div className="relative overflow-visible rounded-[1.4rem] border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-[0_22px_52px_rgba(66,19,136,0.22)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Button type="button" variant="ghost" size="icon" className="border border-white/20 text-white hover:bg-white/10" onClick={() => setView("overview")}>
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Choisissez votre modèle</h1>
                <p className="mt-2 text-sm text-violet-100">Le modèle sélectionné sera utilisé chaque semaine.</p>
              </div>
            </div>
            <DavidBannerAgent
              className="lg:max-w-xl"
              text="Je suis David votre assistant IA, je vous aide à choisir le meilleur modèle pour votre affiche de Chabbat"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          {/* Template grid */}
          <section className="rounded-[1.2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mx-auto mb-5 grid w-full max-w-2xl rounded-xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2">
              {(["simple", "detailed"] as ShabbatTemplateMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTemplateMode(mode)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm font-bold transition",
                    templateMode === mode ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-200" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {SHABBAT_TEMPLATE_SOURCE_CONFIG[mode].visibleLabel}
                </button>
              ))}
            </div>

            {activeTemplates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <ImageIcon className="mx-auto size-9 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-950">Aucun modèle dans cette catégorie</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeTemplates.map((template, index) => {
                  const selected = template.id === selectedTemplateId;
                  const isLocked = !isPaid && index > 0;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectTemplate(template, index)}
                      className={cn(
                        "group relative overflow-hidden rounded-xl border bg-white p-1 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md",
                        selected ? "border-violet-500 ring-2 ring-violet-500" : "border-slate-200"
                      )}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                        <TemplateImage template={template} />
                        {selected && (
                          <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
                            <CheckCircle2 className="size-5" />
                          </span>
                        )}
                        {isLocked && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/60 backdrop-blur-[2px]">
                            <Crown className="size-7 text-amber-400" />
                            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">Abonnement</span>
                          </div>
                        )}
                        {index === 0 && (
                          <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                            Offert
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 px-2 py-3">
                        <span className="text-sm font-bold text-slate-900">{selected ? "Modèle sélectionné" : isLocked ? "Débloquer" : "Choisir ce modèle"}</span>
                        <ArrowRight className="size-4 text-violet-500 transition group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="xl" onClick={() => setView("overview")}>
              Retour
            </Button>
            <Button
              type="button"
              size="xl"
              className="bg-violet-700 px-8 shadow-lg shadow-violet-900/15 hover:bg-violet-800"
              disabled={!selectedModel || saving}
              onClick={() => void continueToCustomize()}
            >
              {saving ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
              Continuer
            </Button>
          </div>
        </div>

        {/* Mobile sticky CTA */}
        {selectedModel && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_32px_rgba(15,23,42,0.12)] backdrop-blur md:p-4 xl:hidden">
            <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Modèle sélectionné</p>
                <p className="truncate text-sm font-bold text-slate-950">{selectedModel.name}</p>
              </div>
              <Button
                type="button"
                size="xl"
                className="bg-violet-700 px-6 hover:bg-violet-800"
                disabled={saving}
                onClick={() => void continueToCustomize()}
              >
                {saving ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Paywall */}
        {paywallOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
              <button type="button" className="ml-auto flex rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => setPaywallOpen(false)}>
                <X className="size-5" />
              </button>
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Calendar className="size-8" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-slate-950">Activez EasyCom IA</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Abonnez-vous pour accéder à tous les modèles et activer l&apos;automatisation hebdomadaire.
              </p>
              <div className="mt-5 space-y-3 text-left text-sm text-slate-700">
                {["Tous les modèles d'affiches Chabbat", "Horaires automatiques selon votre ville", "Publication Facebook, Instagram et WhatsApp", "Rappel chaque vendredi"].map((item) => (
                  <p key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-emerald-500" />
                    {item}
                  </p>
                ))}
              </div>
              <Button asChild className="mt-6 w-full bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]">
                <Link href="/dashboard/settings/billing">
                  <Crown className="size-4" />
                  Découvrir l&apos;abonnement
                </Link>
              </Button>
              <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => setPaywallOpen(false)}>
                Continuer à consulter
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ??? CUSTOMIZE VIEW ??????????????????????????????????????????????????????????
  if (view === "customize") {
    return (
      <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6">
        {/* Header */}
        <div className="relative overflow-visible rounded-[1.4rem] border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-[0_22px_52px_rgba(66,19,136,0.22)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 h-1.5 w-12 rounded-full bg-white/80" />
              <h1 className="text-3xl font-bold tracking-tight">Renseignez votre affiche</h1>
              <p className="mt-2 text-sm text-violet-100">Ces informations seront affichées sur votre affiche chaque semaine.</p>
            </div>
            <DavidBannerAgent
              className="lg:max-w-xl"
              text="Je suis David votre assistant IA, je vous aide à remplir les bonnes informations avant publication"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_460px]">
          <section className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-violet-50 px-4 py-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white p-1 shadow-sm ring-1 ring-violet-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={DAVID_IMAGE_URL} alt="David, agent intelligent" className="h-full w-full object-contain object-bottom" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">David, votre Agent intelligent</p>
                    <p className="text-xs text-slate-500">Je prépare votre affiche à partir des informations connues.</p>
                  </div>
                  {aiDone && (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      Validé
                    </span>
                  )}
                </div>

                <div ref={aiChatRef} className="flex flex-col gap-3 overflow-y-auto p-4 max-h-96">
                  {aiMessages.map((msg, index) => (
                    <div key={index} className={cn("flex", msg.from === "ai" ? "justify-start" : "justify-end")}>
                      {msg.from === "ai" && (
                        <span className="mr-2 mt-1 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-violet-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={DAVID_IMAGE_URL} alt="David" className="h-full w-full object-contain object-bottom" />
                        </span>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6",
                          msg.from === "ai"
                            ? "rounded-tl-sm bg-slate-100 text-slate-800"
                            : "rounded-tr-sm bg-violet-600 text-white"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {aiFieldItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <label key={item.key} className="space-y-1.5 text-sm font-medium text-slate-700">
                          <span className="flex items-center gap-2">
                            <Icon className="size-4 text-violet-600" />
                            {item.label}
                          </span>
                          <input
                            value={fields[item.key as keyof ShabbatFields]}
                            onChange={(event) => updateField(item.key as keyof ShabbatFields, event.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => logoInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          logoInputRef.current?.click();
                        }
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setLogoDragActive(true);
                      }}
                      onDragLeave={() => setLogoDragActive(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        void uploadLogo(event.dataTransfer.files?.[0]);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-violet-400 hover:bg-violet-50/40",
                        logoDragActive && "border-violet-500 bg-violet-50 ring-4 ring-violet-100",
                        logoUploading && "pointer-events-none opacity-75"
                      )}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {fields.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fields.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                        ) : (
                          <Upload className="size-6 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                          {logoUploading ? "Téléversement..." : "Logo de la structure"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Glissez le logo ici ou cliquez pour le charger.</p>
                      </div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={logoUploading}
                        onChange={(event) => void uploadLogo(event.target.files?.[0])}
                      />
                    </div>

                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Texte de la publication
                      <textarea
                        value={postText}
                        onChange={(event) => {
                          setPostText(event.target.value);
                          setAiDone(false);
                        }}
                        className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </label>
                  </div>

                  {templateMode === "detailed" && (
                    <label className="mt-4 block space-y-1.5 text-sm font-medium text-slate-700">
                      Horaires des offices
                      <textarea
                        value={officeTimes}
                        onChange={(event) => setOfficeTimes(event.target.value)}
                        placeholder="Ex: Min'ha : 19 h 30"
                        className="min-h-28 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </label>
                  )}

                  <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
                    <p className="text-sm font-bold text-slate-950">Voulez-vous recevoir chaque semaine les horaires de Chabbat ?</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Si oui, David mémorise ce rendez-vous dans l&apos;Agenda IA et vous notifie au bon moment.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          setWeeklyOptIn(true);
                          setScheduleMode("notification");
                        }}
                        className={cn(
                          "flex items-center justify-center rounded-xl border px-4 py-3 text-center text-sm font-black transition",
                          weeklyOptIn === true ? "border-violet-500 bg-white text-violet-800 ring-2 ring-violet-200" : "border-violet-100 bg-white/70 text-slate-700"
                        )}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWeeklyOptIn(false);
                          setError("");
                          setConfigured(false);
                          if (automation?.id) void pauseAutomation();
                        }}
                        className={cn(
                          "flex items-center justify-center rounded-xl border px-4 py-3 text-center text-sm font-black transition",
                          weeklyOptIn === false ? "border-slate-500 bg-white text-slate-900 ring-2 ring-slate-200" : "border-violet-100 bg-white/70 text-slate-700"
                        )}
                      >
                        Non
                      </button>
                    </div>
                    {weeklyOptIn === true && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Jour
                        <select
                          value={notificationDay}
                          onChange={(event) => {
                            const day = dayOptions.find((item) => item.value === event.target.value) ?? dayOptions[5];
                            setNotificationDay(day.value);
                            setNotificationDayOfWeek(day.dayOfWeek);
                          }}
                          className="mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        >
                          {dayOptions.map((day) => (
                            <option key={day.value} value={day.value}>{day.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Heure
                        <input
                          type="time"
                          value={notificationTime}
                          onChange={(event) => setNotificationTime(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />
                      </label>
                    </div>
                    )}
                  </div>

                  {logoUploadError && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{logoUploadError}</p>
                  )}

                  <Button
                    type="button"
                    size="xl"
                    className="mt-4 bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]"
                    loading={generatingPreview}
                    onClick={() => void validateAiInformation()}
                  >
                    <Sparkles className="size-5" />
                    Créez l&apos;affiche
                  </Button>
                </div>
              </div>

            {/* Preview */}
            <div className="rounded-xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Aperçu de votre affiche</h2>
                  <p className="mt-1 text-sm text-slate-500">David génère cet aperçu automatiquement après validation des informations.</p>
                </div>
                {previewImageUrl && (
                  <a
                    href={previewImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-violet-200 bg-white px-4 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
                  >
                    Télécharger
                  </a>
                )}
              </div>

              {previewError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{previewError}</p>
              )}

              <div className="mt-5">
                <SmartphoneFrame>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                          {getInitials(fields.structureName || community.name)}
                        </div>
                        <p className="truncate text-[12px] font-bold text-slate-900">{(fields.structureName || community.name).toLowerCase().replace(/\s+/g, "")}</p>
                      </div>
                      <span className="text-lg leading-none text-slate-500">...</span>
                    </div>
                    <div className="flex w-full items-center justify-center overflow-hidden bg-slate-100">
                      {generatingPreview ? (
                        <div className="flex min-h-72 w-full flex-col items-center justify-center gap-2 bg-violet-50">
                          <Loader2 className="size-8 animate-spin text-violet-500" />
                          <p className="text-[11px] font-semibold text-violet-700">Génération en cours...</p>
                        </div>
                      ) : previewImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewImageUrl} alt="Aperçu généré" className="h-auto w-full object-contain" />
                      ) : selectedTemplate ? (
                        <TemplateImage template={selectedTemplate} />
                      ) : (
                        <PosterFallback fields={fields} palette={selectedPalette} mode={templateMode} />
                      )}
                    </div>
                    <div className="space-y-2 px-3 py-3 text-[11px] leading-4 text-slate-800">
                      <p>
                        <span className="font-bold">{(fields.structureName || community.name).toLowerCase().replace(/\s+/g, "")}</span>{" "}
                        {postText.split("\n")[0] || "Chabbat Chalom"}
                      </p>
                      <p className="text-slate-400">Voir les commentaires</p>
                    </div>
                  </div>
                </SmartphoneFrame>
              </div>

              <div className="mt-5">
                <h2 className="text-lg font-bold text-slate-950">Où publier ?</h2>
                <p className="mt-1 text-sm text-slate-500">Choisissez les plateformes avant de valider.</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CHANNEL_OPTIONS.map(({ id, label, Logo, activeClass }) => {
                    const active = channels.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleChannel(id)}
                        className={cn(
                          "relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                          active ? activeClass : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {active && (
                          <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-white shadow-sm">
                            <CheckCircle2 className="size-5 text-green-500" />
                          </span>
                        )}
                        <Logo className="size-10" />
                        <span className="text-sm font-black text-slate-900">{label}</span>
                      </button>
                    );
                  })}
                </div>
                {channels.length === 0 && (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Sélectionnez au moins un réseau pour publier.
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  <WhatsAppLogo className="size-8 shrink-0" />
                  <span>Publiez sur WhatsApp depuis la page &quot;WhatsApp&quot;.</span>
                </div>
              </div>
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" size="xl" loading={saving || triggering || generatingPreview} disabled={channels.length === 0} className="bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f] disabled:opacity-50" onClick={() => void publishShabbatNow()}>
                <Sparkles className="size-5" />
                Publiez Maintenant !
              </Button>
              <Button type="button" variant="outline" size="xl" onClick={() => setView("models")}>
                <ArrowLeft className="size-5" />
                Retour
              </Button>
            </div>
          </section>

          {/* Preview aside */}
          <aside className="hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Aperçu de votre affiche</h2>
              {selectedTemplateId && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]"
                  loading={generatingPreview}
                  onClick={() => void handleGeneratePreview()}
                >
                  {!generatingPreview && <Wand2 className="size-3.5" />}
                  {generatingPreview ? "Génération…" : "Générer l'aperçu"}
                </Button>
              )}
            </div>

            {previewError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{previewError}</p>
            )}

            <div>
              <SmartphoneFrame>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                        {getInitials(fields.structureName || community.name)}
                      </div>
                      <p className="truncate text-[12px] font-bold text-slate-900">{(fields.structureName || community.name).toLowerCase().replace(/\s+/g, "")}</p>
                    </div>
                    <span className="text-lg leading-none text-slate-500">...</span>
                  </div>
                  <div className="aspect-square w-full overflow-hidden bg-slate-100">
                    {generatingPreview ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-violet-50">
                        <Loader2 className="size-8 animate-spin text-violet-500" />
                        <p className="text-[11px] font-semibold text-violet-700">Génération en cours?</p>
                      </div>
                    ) : previewImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewImageUrl} alt="Aperçu généré" className="h-full w-full object-cover" />
                    ) : selectedTemplate ? (
                      <TemplateImage template={selectedTemplate} />
                    ) : (
                      <PosterFallback fields={fields} palette={selectedPalette} mode={templateMode} />
                    )}
                  </div>
                  <div className="space-y-2 px-3 py-3 text-[11px] leading-4 text-slate-800">
                    <p>
                      <span className="font-bold">{(fields.structureName || community.name).toLowerCase().replace(/\s+/g, "")}</span>{" "}
                      {postText.split("\n")[0] || "Chabbat Chalom"}
                    </p>
                    <p className="text-slate-400">Voir les commentaires</p>
                  </div>
                </div>
              </SmartphoneFrame>
              {previewImageUrl && !generatingPreview && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                    Rendu r?el généré
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleGeneratePreview()}
                    className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
                  >
                    <Wand2 className="size-3" />
                    Regénérer
                  </button>
                </div>
              )}
              {selectedTemplateId && !previewImageUrl && !generatingPreview && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  Cliquez sur &quot;Générer l&apos;aperçu&quot; pour voir le rendu r?el.
                </p>
              )}
            </div>

            {selectedTemplate && (
              <div className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm text-violet-900">
                <Info className="mr-2 inline size-4" />
                Modèle : {selectedTemplate.name}
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // ??? OVERVIEW VIEW ???????????????????????????????????????????????????????????
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6 pb-16">
      {/* Welcome popup (first visit) */}
      {showWelcomePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Sparkles className="size-7" />
              </div>
              <button type="button" onClick={() => setShowWelcomePopup(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <h2 className="mt-5 text-2xl font-bold leading-tight text-slate-950">
              Découvrez les automatisations pour les horaires de Chabbat
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Chaque semaine, votre affiche est préparée automatiquement avec les bons horaires. Il vous suffit de valider en un clic.
            </p>

            <div className="mt-6 space-y-4">
              {[
                { step: 1, icon: ImageIcon, title: "Choisissez votre modèle d'affiche", desc: "Sélectionnez le design qui correspond à votre structure. Le premier est offert.", color: "bg-sky-100 text-sky-700" },
                { step: 2, icon: Edit3, title: "Validez les informations", desc: "David reprend vos données connues, puis vous pouvez modifier uniquement ce qui doit l'être.", color: "bg-violet-100 text-violet-700" },
                { step: 3, icon: Send, title: "Publiez automatiquement", desc: "Choisissez Instagram ou Facebook, puis lancez la publication.", color: "bg-emerald-100 text-emerald-700" },
              ].map(({ step, title, desc, color }) => (
                <div key={step} className="flex items-start gap-4">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black", color)}>
                    {step}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <DavidAutomationCard
              className="mt-6"
              onCtaClick={() => {
                setShowWelcomePopup(false);
                setView("models");
              }}
            />
            <div className="mt-8 flex flex-col gap-3">
              <Button
                type="button"
                size="xl"
                className="w-full bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]"
                onClick={() => {
                  setShowWelcomePopup(false);
                  setView("models");
                }}
              >
                <Sparkles className="size-5" />
                Publiez les Horaires de Chabbat →
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowWelcomePopup(false)}>
                Découvrir d&apos;abord le tableau de bord
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-visible rounded-[1.4rem] border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-[0_22px_52px_rgba(66,19,136,0.22)]">
        <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
          <div className="rounded-full bg-white/[0.04] p-5">
            <Clock className="size-28 text-white/[0.08]" strokeWidth={1.6} />
          </div>
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="relative">
            <div className="mb-4 h-1.5 w-12 rounded-full bg-white/80" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 items-end gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 pb-2 pt-1.5 shadow-inner shadow-white/10" role="img" aria-label="Trois bougies de Chabbat">
                <span className="relative block h-6 w-2.5 rounded-sm bg-amber-100 shadow-[0_0_12px_rgba(255,215,128,0.72)] before:absolute before:-top-2 before:left-1/2 before:size-2 before:-translate-x-1/2 before:rounded-full before:bg-orange-300" />
                <span className="relative block h-4 w-2 rounded-sm bg-amber-100 shadow-[0_0_10px_rgba(255,215,128,0.66)] before:absolute before:-top-1.5 before:left-1/2 before:size-1.5 before:-translate-x-1/2 before:rounded-full before:bg-orange-300" />
                <span className="relative block h-6 w-2.5 rounded-sm bg-amber-100 shadow-[0_0_12px_rgba(255,215,128,0.72)] before:absolute before:-top-2 before:left-1/2 before:size-2 before:-translate-x-1/2 before:rounded-full before:bg-orange-300" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Horaires de Chabbat</h1>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <DavidBannerAgent
              className="lg:max-w-2xl"
              text="Je suis David, l'agent intelligent dédié aux automatisations. Choisissez simplement un modèle visuel, et je m’occupe de publier automatiquement vos horaires de Chabbat sur tous vos réseaux"
            />
          </div>
        </div>

      </div>

      <DavidAutomationCard
        className="mt-6"
        onCtaClick={() => {
          setView(configured ? "customize" : "models");
        }}
      />

      {/* Steps */}
      <section className="mt-6 rounded-xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { number: 1, icon: ImageIcon, title: "Choisissez votre modèle", text: "Sélectionnez un modèle d'affiche d'horaires de Chabbat.", tone: "border-sky-100 bg-sky-50 text-sky-700" },
            { number: 2, icon: Edit3, title: "Personnalisez l'affiche", text: "Ajoutez votre logo et renseignez les informations à afficher.", tone: "border-violet-100 bg-violet-50 text-violet-700" },
            { number: 3, icon: Send, title: "Validez et publiez", text: "Publiez en un clic sur Facebook, Instagram et WhatsApp.", tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className={cn("rounded-xl border p-4", step.tone)}>
                <div className="flex items-center gap-4">
                  <span className="flex size-10 items-center justify-center rounded-full bg-white text-lg font-black">{step.number}</span>
                  <Icon className="size-6" />
                </div>
                <p className="mt-4 font-bold text-slate-950">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Chabbat info */}
      <div className="mt-6 grid gap-5">
        <section className="rounded-xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
          <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setShabbatInfoOpen((open) => !open)}>
            <h2 className="text-xl font-bold text-slate-950">Chabbat à venir</h2>
            <ChevronDown className={cn("size-5 text-slate-500 transition", shabbatInfoOpen && "rotate-180")} />
          </button>
          {shabbatInfoOpen && (
            <>
              <div className="mt-4 flex items-center gap-3 text-2xl font-bold text-slate-950">
                <MapPin className="size-7 text-violet-700" />
                {formatField(shabbat?.cityName ?? community.city)}
              </div>
              <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="size-7 text-violet-700" />
                  <div>
                    <p className="text-xs text-slate-500">Paracha</p>
                    <p className="font-bold text-slate-950">{formatField(shabbat?.parasha)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-7 text-violet-700" />
                  <div>
                    <p className="text-xs text-slate-500">Entrée</p>
                    <p className="font-bold text-slate-950">{formatField(shabbat?.entry)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-7 text-violet-700" />
                  <div>
                    <p className="text-xs text-slate-500">Sortie</p>
                    <p className="font-bold text-slate-950">{formatField(shabbat?.exit)}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  Horaires à jour · {formatDate(shabbat?.date)}
                </p>
                <Button type="button" variant="outline" onClick={() => setView("customize")}>
                  <Settings className="size-4" />
                  Modifier les informations
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {publicationSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <button type="button" className="ml-auto flex rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => setPublicationSuccessOpen(false)}>
              <X className="size-5" />
            </button>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-9" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-950">Votre publication a bien été publiée</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              David a lancé la publication sur les réseaux sélectionnés.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {publishedChannels.includes("INSTAGRAM") && (
                <Button asChild type="button" variant="outline" className="w-full">
                  <a href={instagramProfileUrl ?? "/dashboard/settings/channels"} target={instagramProfileUrl ? "_blank" : undefined} rel={instagramProfileUrl ? "noreferrer" : undefined}>
                    <InstagramLogo className="size-5" />
                    Voir sur Instagram
                  </a>
                </Button>
              )}
              {publishedChannels.includes("FACEBOOK") && (
                <Button asChild type="button" variant="outline" className="w-full">
                  <a href={facebookProfileUrl ?? "/dashboard/settings/channels"} target={facebookProfileUrl ? "_blank" : undefined} rel={facebookProfileUrl ? "noreferrer" : undefined}>
                    <FacebookLogo className="size-5" />
                    Voir sur Facebook
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}





