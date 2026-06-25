"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Edit3,
  ExternalLink,
  ImageIcon,
  Info,
  Loader2,
  Mail,
  MapPin,
  PauseCircle,
  Pencil,
  Send,
  Settings,
  Sparkles,
  Star,
  Upload,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
type FillMode = "manual" | "ai";
type ScheduleMode = "notification" | "direct";

type AiMessage = { from: "ai" | "user"; text: string };

type Props = {
  templates: Record<ShabbatTemplateMode, Template[]>;
  community: Community;
  shabbat: ShabbatCardItem | null;
  initialAutomation: InitialAutomation;
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

// Calcule le libellé de la prochaine occurrence en fuseau Paris,
// en affichant l'heure TELLE QUE configurée (jamais convertie depuis UTC).
function getNextOccurrenceLabel(dayOfWeek: number, time: string): string {
  if (!time || time === "00:00") return "À programmer";
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "À programmer";

  const now = new Date();
  const TZ = "Europe/Paris";

  // Jour et heure actuels en heure de Paris (indépendant du fuseau serveur/navigateur)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const WEEKDAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const parisDay = WEEKDAY_MAP[byType.weekday ?? ""] ?? 0;
  const parisHour = parseInt(byType.hour ?? "0", 10);
  const parisMin = parseInt(byType.minute ?? "0", 10);

  // Jours jusqu'à la prochaine occurrence
  let daysUntil = (dayOfWeek - parisDay + 7) % 7;
  if (daysUntil === 0 && (h < parisHour || (h === parisHour && m <= parisMin))) {
    daysUntil = 7; // l'heure est déjà passée aujourd'hui → semaine prochaine
  }

  const targetDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
  const datePart = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(targetDate);

  // L'heure est affichée EXACTEMENT comme configurée — pas de conversion UTC
  const timePart = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${datePart} à ${timePart}`;
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

function EmailLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="6" fill="#6366f1" />
      <rect x="4.5" y="7" width="15" height="10" rx="1.5" stroke="white" strokeWidth="1.5" />
      <path d="M4.5 8.5 12 13.5l7.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const CHANNEL_OPTIONS = [
  { id: "INSTAGRAM", label: "Instagram", Logo: InstagramLogo, activeClass: "border-pink-400 bg-pink-50 ring-2 ring-pink-200", badgeClass: "border-pink-200 bg-pink-50 text-pink-700" },
  { id: "FACEBOOK", label: "Facebook", Logo: FacebookLogo, activeClass: "border-blue-500 bg-blue-50 ring-2 ring-blue-200", badgeClass: "border-blue-200 bg-blue-50 text-blue-700" },
  { id: "WHATSAPP", label: "WhatsApp", Logo: WhatsAppLogo, activeClass: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200", badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { id: "EMAIL", label: "E-mail", Logo: EmailLogo, activeClass: "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200", badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700" },
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
          <p className="mt-5 text-[15px] font-semibold text-white/90">שבת שלום</p>
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
}: Props) {
  const savedConfig = getPosterConfig(initialAutomation);
  const initialMode = savedConfig.selectedTemplateCategory ?? "simple";

  const [view, setView] = useState<View>("overview");
  const [templateMode, setTemplateMode] = useState<ShabbatTemplateMode>(initialMode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    savedConfig.selectedTemplateId ?? selectedTemplateFromConfig(templates, initialMode, null)?.id ?? null
  );
  const [fields, setFields] = useState<ShabbatFields>(() => buildDefaultFields(community, shabbat, savedConfig.fields));
  const [palette, setPalette] = useState(savedConfig.palette ?? "violet");
  const [postText, setPostText] = useState(savedConfig.postText ?? defaultPostText);
  const [officeTimes, setOfficeTimes] = useState(savedConfig.officeTimes ?? "");
  const [notificationDay, setNotificationDay] = useState(savedConfig.notificationDay ?? "Vendredi");
  const [notificationDayOfWeek, setNotificationDayOfWeek] = useState(savedConfig.notificationDayOfWeek ?? 5);
  const [notificationTime, setNotificationTime] = useState(savedConfig.notificationTime ?? "10:00");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>((savedConfig.scheduleMode ?? "notification") as ScheduleMode);
  const [channels, setChannels] = useState<string[]>(savedConfig.channels ?? ["INSTAGRAM", "FACEBOOK", "WHATSAPP"]);
  const [automation, setAutomation] = useState(initialAutomation);
  const [configured, setConfigured] = useState(Boolean(savedConfig.configured));
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [error, setError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(!savedConfig.configured && !initialAutomation);

  // Fill mode
  const [fillMode, setFillMode] = useState<FillMode>("manual");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiStep, setAiStep] = useState(0);
  const [aiDone, setAiDone] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const aiChatRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const activeTemplates = templates[templateMode];
  const selectedTemplate = selectedTemplateFromConfig(templates, templateMode, selectedTemplateId);
  const selectedPalette = paletteOptions.find((item) => item.id === palette) ?? paletteOptions[0];
  const isActive = automation?.isActive === true && automation.status === "ACTIVE";
  const isPaid = community.plan !== "FREE_TRIAL";

  const selectedTemplateIndex = activeTemplates.findIndex((t) => t.id === selectedTemplateId);
  const isFreeTemplate = selectedTemplateIndex === 0 || selectedTemplateIndex === -1;

  type AiField = keyof ShabbatFields | "_postText";

  function buildAiQuestions(): { field: AiField; question: string }[] {
    return [
      { field: "structureName", question: `Quel est le nom de votre structure ?` },
      { field: "city", question: `Dans quelle ville êtes-vous ?${shabbat?.cityName ? ` (suggestion : ${shabbat.cityName})` : ""}` },
      { field: "parasha", question: `Quelle est la paracha de ce Chabbat ?${shabbat?.parasha ? ` (suggestion : ${shabbat.parasha})` : ""}` },
      { field: "entry", question: `Heure d'entrée de Chabbat ? (format hh:mm)${shabbat?.entry ? ` (suggestion : ${shabbat.entry})` : ""}` },
      { field: "exit", question: `Heure de sortie de Chabbat ? (format hh:mm)${shabbat?.exit ? ` (suggestion : ${shabbat.exit})` : ""}` },
      { field: "kiddouch", question: `Y a-t-il un kiddouch offert ce Chabbat ? Si oui, par qui ? (Entrée pour passer)` },
      { field: "_postText", question: `Quel texte pour la publication ? (Entrée pour garder le texte par défaut)` },
    ];
  }

  function startAiMode() {
    const questions = buildAiQuestions();
    setAiStep(0);
    setAiDone(false);
    setAiInput("");
    setAiMessages([{ from: "ai", text: questions[0].question }]);
    setTimeout(() => aiInputRef.current?.focus(), 100);
  }

  useEffect(() => {
    if (fillMode === "ai" && aiMessages.length === 0) {
      startAiMode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillMode]);

  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  function handleAiAnswer(rawAnswer: string) {
    const questions = buildAiQuestions();
    const answer = rawAnswer.trim();
    const currentQ = questions[aiStep];

    setAiMessages((prev) => [...prev, { from: "user", text: answer || "(aucune valeur)" }]);

    if (answer) {
      if (currentQ.field === "_postText") {
        setPostText(answer);
      } else {
        setFields((prev) => ({ ...prev, [currentQ.field]: answer }));
      }
    }

    const nextStep = aiStep + 1;
    if (nextStep >= questions.length) {
      setAiDone(true);
      setAiMessages((prev) => [
        ...prev,
        { from: "ai", text: "Parfait ! Votre affiche est configurée. Vous pouvez la prévisualiser à droite et ajuster si nécessaire. Descendez pour choisir l'horaire d'envoi et valider." },
      ]);
    } else {
      setAiStep(nextStep);
      setAiMessages((prev) => [...prev, { from: "ai", text: questions[nextStep].question }]);
    }

    setAiInput("");
    setTimeout(() => aiInputRef.current?.focus(), 100);
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
    setFillMode("manual");
  }

  async function activateAutomation() {
    const saved = await saveToApi({
      mode: "activate",
      templateId: selectedTemplateId,
      templateMode,
      config: currentConfig(),
    });
    if (saved) {
      setConfigured(true);
      setView("success");
    }
  }

  async function pauseAutomation() {
    const saved = await saveToApi({ mode: "pause" });
    if (saved) setStatusOpen(false);
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
        setTimeout(() => setTriggerSuccess(false), 4000);
      }
    } catch {
      setError("Erreur réseau lors du déclenchement.");
    } finally {
      setTriggering(false);
    }
  }

  async function updateSchedule() {
    const saved = await saveToApi({
      mode: isActive ? "activate" : "save-config",
      templateId: selectedTemplateId,
      templateMode,
      config: currentConfig(),
    });
    if (saved) setScheduleOpen(false);
  }

  function updateField(key: keyof ShabbatFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
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

  // ─── SUCCESS VIEW ───────────────────────────────────────────────────────────
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
              : `Chaque ${notificationDay} à ${notificationTime}, vous recevrez un e-mail vous invitant à valider votre affiche avant publication.`}
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
              <p className="flex items-center gap-2"><Zap className="size-4 shrink-0" />Envoi automatique activé — aucune validation requise.</p>
            ) : (
              <p className="flex items-center gap-2"><Mail className="size-4 shrink-0" />Un e-mail d'approbation vous sera envoyé à chaque cycle.</p>
            )}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {automation?.id && (
              <Button
                type="button"
                size="xl"
                loading={triggering}
                disabled={triggering}
                className={triggerSuccess ? "bg-emerald-600 hover:bg-emerald-700" : "bg-violet-700 hover:bg-violet-800"}
                onClick={publishNow}
              >
                {triggerSuccess ? <><CheckCircle2 className="size-5" />Envoyé !</> : <><Send className="size-5" />Publier maintenant</>}
              </Button>
            )}
            <Button asChild size="xl" variant={automation?.id ? "outline" : "default"} className={automation?.id ? "" : "bg-violet-700 hover:bg-violet-800"}>
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

  // ─── MODELS VIEW ────────────────────────────────────────────────────────────
  if (view === "models") {
    const selectedModel = activeTemplates.find((t) => t.id === selectedTemplateId) ?? null;
    const selectedModelIndex = activeTemplates.findIndex((t) => t.id === selectedTemplateId);

    return (
      <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6 pb-24">
        {/* Header */}
        <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 p-5 text-white shadow-[0_22px_52px_rgba(76,29,149,0.26)]">
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
            <div className="grid grid-cols-4 items-start gap-4 text-center text-xs text-violet-100">
              {["Modèle", "Renseignements", "Programmation", "Validation"].map((label, index) => (
                <div key={label} className="min-w-16">
                  <div className={cn("mx-auto flex size-9 items-center justify-center rounded-full border border-white/30", index === 0 ? "bg-white text-violet-900" : "text-white/70")}>
                    {index + 1}
                  </div>
                  <p className="mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
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

          {/* Summary sidebar */}
          <aside className="rounded-[1.2rem] border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:self-start">
            <h2 className="text-lg font-bold text-slate-950">Résumé de votre sélection</h2>
            {selectedModel ? (
              <div className="mt-5 space-y-5">
                <div className="flex gap-4">
                  <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <TemplateImage template={selectedModel} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-950">Modèle sélectionné</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{selectedModel.name}</p>
                    {selectedModelIndex === 0 && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        Inclus gratuitement
                      </span>
                    )}
                    {selectedModelIndex > 0 && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                        <CheckCircle2 className="size-3.5" />
                        Prêt pour l&apos;étape 2
                      </span>
                    )}
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
                )}

                <Button
                  type="button"
                  size="xl"
                  className="w-full bg-violet-700 shadow-lg shadow-violet-900/15 hover:bg-violet-800"
                  disabled={saving}
                  onClick={() => void continueToCustomize()}
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
                  Continuer vers les renseignements
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setView("overview")}>
                  Retour
                </Button>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <ImageIcon className="mx-auto size-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Choisissez une affiche pour continuer.</p>
              </div>
            )}
          </aside>
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
              <Button asChild className="mt-6 w-full bg-violet-700 hover:bg-violet-800">
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

  // ─── CUSTOMIZE VIEW ──────────────────────────────────────────────────────────
  if (view === "customize") {
    return (
      <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6">
        {/* Header */}
        <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 p-5 text-white shadow-[0_22px_52px_rgba(76,29,149,0.26)]">
          <div className="mb-5 grid grid-cols-4 items-start gap-4 text-center text-xs text-violet-100">
            {["Modèle", "Renseignements", "Programmation", "Validation"].map((label, index) => (
              <div key={label} className="min-w-0">
                <div className={cn("mx-auto flex size-9 items-center justify-center rounded-full border border-white/30", index === 1 ? "bg-white text-violet-900" : "text-white/80")}>
                  {index === 0 ? <CheckCircle2 className="size-4" /> : index + 1}
                </div>
                <p className={cn("mt-1 font-medium", index === 1 ? "text-white" : "text-violet-200")}>{label}</p>
              </div>
            ))}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Renseignez votre affiche</h1>
          <p className="mt-2 text-sm text-violet-100">Ces informations seront affichées sur votre affiche chaque semaine.</p>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_460px]">
          <section className="space-y-4">
            {/* Fill mode selector */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-bold text-slate-950">Comment souhaitez-vous renseigner votre affiche ?</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFillMode("manual")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition",
                    fillMode === "manual"
                      ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                      : "border-slate-200 hover:border-violet-300"
                  )}
                >
                  <span className={cn("flex size-10 items-center justify-center rounded-full", fillMode === "manual" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500")}>
                    <User className="size-5" />
                  </span>
                  <span className="text-sm font-bold text-slate-900">Saisie manuelle</span>
                  <span className="text-xs text-slate-500">Je remplis le formulaire moi-même</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFillMode("ai")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition",
                    fillMode === "ai"
                      ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                      : "border-slate-200 hover:border-violet-300"
                  )}
                >
                  <span className={cn("flex size-10 items-center justify-center rounded-full", fillMode === "ai" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500")}>
                    <Bot className="size-5" />
                  </span>
                  <span className="text-sm font-bold text-slate-900">Assistant IA</span>
                  <span className="text-xs text-slate-500">L'IA me pose les questions</span>
                </button>
              </div>
            </div>

            {/* Manual form */}
            {fillMode === "manual" && (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Palette de couleurs</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {paletteOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPalette(option.id)}
                        className={cn("relative rounded-lg border p-2 text-sm font-medium transition", palette === option.id ? "border-violet-600 ring-2 ring-violet-200" : "border-slate-200 hover:border-violet-300")}
                      >
                        <span className={cn("block h-12 rounded-md bg-gradient-to-br", option.classes)} />
                        <span className="mt-2 block text-slate-700">{option.label}</span>
                        {palette === option.id && <CheckCircle2 className="absolute right-1 top-1 size-5 rounded-full bg-violet-600 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Informations affichées</h2>
                  <div className="mt-4 divide-y divide-slate-100">
                    {[
                      { key: "logoUrl", label: "Logo de la structure", icon: Upload },
                      { key: "structureName", label: "Nom de la structure", icon: Pencil },
                      { key: "city", label: "Ville", icon: MapPin },
                      { key: "parasha", label: "Paracha", icon: BookOpen },
                      { key: "entry", label: "Entrée de Chabbat", icon: Clock },
                      { key: "exit", label: "Sortie de Chabbat", icon: Clock },
                      { key: "kiddouch", label: "Kiddouch offert par", icon: Star },
                    ].map((item) => {
                      const Icon = item.icon;
                      if (item.key === "logoUrl") {
                        return (
                          <div key={item.key} className="grid gap-3 py-3 md:grid-cols-[250px_1fr] md:items-start">
                            <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
                              <Icon className="size-5 text-slate-500" />
                              {item.label}
                            </span>
                            <div className="space-y-3">
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
                                  "flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-violet-400 hover:bg-violet-50/40 sm:flex-row sm:items-center",
                                  logoDragActive && "border-violet-500 bg-violet-50 ring-4 ring-violet-100",
                                  logoUploading && "pointer-events-none opacity-75"
                                )}
                              >
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                                  {fields.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={fields.logoUrl} alt="Logo" className="h-full w-full object-contain p-2" />
                                  ) : (
                                    <Upload className="size-7 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold text-slate-900">
                                    {logoUploading ? "Téléversement..." : "Glissez le logo ici ou cliquez pour le charger"}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Conversion automatique en WebP, puis enregistrement dans Supabase au nom de la structure.
                                  </p>
                                </div>
                                <span className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white shadow-sm">
                                  {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                                  {logoUploading ? "Envoi..." : "Choisir"}
                                </span>
                                <input
                                  ref={logoInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  disabled={logoUploading}
                                  onChange={(event) => void uploadLogo(event.target.files?.[0])}
                                />
                              </div>
                              {logoUploadError && (
                                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{logoUploadError}</p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <label key={item.key} className="grid gap-3 py-3 md:grid-cols-[250px_1fr] md:items-center">
                          <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
                            <Icon className="size-5 text-slate-500" />
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
                </div>

                {templateMode === "detailed" && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-950">Horaires des offices</h2>
                    <textarea
                      value={officeTimes}
                      onChange={(event) => setOfficeTimes(event.target.value)}
                      placeholder="Ex: Min'ha : 19 h 30"
                      className="mt-3 min-h-32 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-950">Texte de la publication</h2>
                  <textarea
                    value={postText}
                    onChange={(event) => setPostText(event.target.value)}
                    className="mt-3 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>
              </>
            )}

            {/* AI chat mode */}
            {fillMode === "ai" && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 bg-violet-50">
                  <span className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-white">
                    <Bot className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Assistant IA</p>
                    <p className="text-xs text-slate-500">Je remplis votre affiche question par question</p>
                  </div>
                  {aiDone && (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      Terminé
                    </span>
                  )}
                </div>

                <div ref={aiChatRef} className="flex flex-col gap-3 overflow-y-auto p-4 max-h-96">
                  {aiMessages.map((msg, index) => (
                    <div key={index} className={cn("flex", msg.from === "ai" ? "justify-start" : "justify-end")}>
                      {msg.from === "ai" && (
                        <span className="mr-2 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                          <Bot className="size-3.5" />
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
                  {!aiDone && aiMessages.length > 0 && (
                    <div className="flex justify-start">
                      <span className="mr-2 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                        <Bot className="size-3.5" />
                      </span>
                      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                        <span className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                        <span className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                        <span className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                </div>

                {!aiDone && (
                  <div className="border-t border-slate-100 p-3">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleAiAnswer(aiInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        ref={aiInputRef}
                        type="text"
                        value={aiInput}
                        onChange={(event) => setAiInput(event.target.value)}
                        placeholder="Votre réponse... (Entrée pour envoyer)"
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                      <button
                        type="submit"
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                      >
                        <Send className="size-4" />
                      </button>
                    </form>
                    <p className="mt-2 text-center text-xs text-slate-400">
                      Étape {Math.min(aiStep + 1, buildAiQuestions().length)}/{buildAiQuestions().length} · Appuyez sur Entrée pour passer une question
                    </p>
                  </div>
                )}

                {aiDone && (
                  <div className="border-t border-slate-100 p-4">
                    <p className="text-center text-sm text-slate-500">
                      Aperçu mis à jour à droite. Continuez pour configurer l&apos;horaire d&apos;envoi.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Schedule section */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Automatisation hebdomadaire</h2>
              <p className="mt-1 text-sm text-slate-500">Choisissez comment et quand votre publication doit être préparée.</p>

              {/* Schedule mode */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleMode("notification")}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
                    scheduleMode === "notification"
                      ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                      : "border-slate-200 hover:border-violet-300"
                  )}
                >
                  <span className={cn("flex size-9 items-center justify-center rounded-full", scheduleMode === "notification" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500")}>
                    <Bell className="size-4" />
                  </span>
                  <span className="text-sm font-bold text-slate-900">Approbation requise</span>
                  <span className="text-xs leading-5 text-slate-500">Vous recevez un e-mail pour valider avant publication</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("direct")}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
                    scheduleMode === "direct"
                      ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                      : "border-slate-200 hover:border-amber-300"
                  )}
                >
                  <span className={cn("flex size-9 items-center justify-center rounded-full", scheduleMode === "direct" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500")}>
                    <Zap className="size-4" />
                  </span>
                  <span className="text-sm font-bold text-slate-900">Envoi direct</span>
                  <span className="text-xs leading-5 text-slate-500">Publication automatique sans validation</span>
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Jour
                  <select
                    value={notificationDay}
                    onChange={(event) => {
                      const day = dayOptions.find((item) => item.value === event.target.value) ?? dayOptions[5];
                      setNotificationDay(day.value);
                      setNotificationDayOfWeek(day.dayOfWeek);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    {dayOptions.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Heure
                  <input
                    type="time"
                    value={notificationTime}
                    onChange={(event) => setNotificationTime(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </label>
              </div>

              <div className={cn(
                "mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm",
                scheduleMode === "notification"
                  ? "border-blue-100 bg-blue-50 text-blue-800"
                  : "border-amber-100 bg-amber-50 text-amber-800"
              )}>
                {scheduleMode === "notification" ? (
                  <>
                    <Mail className="size-4 mt-0.5 shrink-0" />
                    <span>Chaque <strong>{notificationDay}</strong> à <strong>{notificationTime}</strong>, vous recevrez un e-mail vous informant qu&apos;une publication attend votre approbation.</span>
                  </>
                ) : (
                  <>
                    <Zap className="size-4 mt-0.5 shrink-0" />
                    <span>La publication sera envoyée automatiquement chaque <strong>{notificationDay}</strong> à <strong>{notificationTime}</strong>, sans validation préalable.</span>
                  </>
                )}
              </div>
            </div>

            {/* Channel selector */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Où publier ?</h2>
              <p className="mt-1 text-sm text-slate-500">Sélectionnez les canaux de diffusion. Vous pouvez en choisir plusieurs.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CHANNEL_OPTIONS.map(({ id, label, Logo, activeClass }) => {
                  const active = channels.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleChannel(id)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition",
                        active ? activeClass : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {active && (
                        <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-white shadow-sm">
                          <CheckCircle2 className="size-4 text-green-500" />
                        </span>
                      )}
                      <Logo className="size-8" />
                      <span className="text-sm font-bold text-slate-900">{label}</span>
                    </button>
                  );
                })}
              </div>
              {channels.length === 0 && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Sélectionnez au moins un canal pour activer l&apos;automatisation.
                </p>
              )}
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" size="xl" loading={saving} disabled={channels.length === 0} className="bg-violet-700 hover:bg-violet-800" onClick={activateAutomation}>
                <Sparkles className="size-5" />
                Valider et activer l&apos;automatisation
              </Button>
              <Button type="button" variant="outline" size="xl" onClick={() => setView("models")}>
                <ArrowLeft className="size-5" />
                Retour
              </Button>
            </div>
          </section>

          {/* Preview aside */}
          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:self-start">
            <h2 className="text-xl font-bold text-slate-950">Aperçu de votre affiche</h2>
            <div className="mt-4">
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
                    {selectedTemplate ? (
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
            {selectedTemplate && (
              <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm text-violet-900">
                <Info className="mr-2 inline size-4" />
                Modèle : {selectedTemplate.name}
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // ─── OVERVIEW VIEW ───────────────────────────────────────────────────────────
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
                { step: 2, icon: Edit3, title: "Renseignez vos informations", desc: "Logo, ville, paracha, horaires… remplissez le formulaire ou laissez l'IA vous guider.", color: "bg-violet-100 text-violet-700" },
                { step: 3, icon: Send, title: "Recevez un e-mail chaque semaine", desc: "Un e-mail vous invite à valider avant publication, ou activez l'envoi automatique.", color: "bg-emerald-100 text-emerald-700" },
              ].map(({ step, icon: Icon, title, desc, color }) => (
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

            <div className="mt-8 flex flex-col gap-3">
              <Button
                type="button"
                size="xl"
                className="w-full bg-violet-700 hover:bg-violet-800"
                onClick={() => {
                  setShowWelcomePopup(false);
                  setView("models");
                }}
              >
                <Sparkles className="size-5" />
                Commencer maintenant
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowWelcomePopup(false)}>
                Découvrir d&apos;abord le tableau de bord
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 p-6 text-white shadow-[0_22px_52px_rgba(76,29,149,0.26)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-4 h-1.5 w-12 rounded-full bg-violet-200" />
            <h1 className="text-4xl font-bold tracking-tight">Horaires de Chabbat</h1>
            <p className="mt-2 text-violet-200 text-sm">Automatisation hebdomadaire de votre affiche</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Modifier la configuration */}
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              onClick={() => setView(configured ? "customize" : "models")}
            >
              <Settings className="size-4" />
              {configured ? "Modifier la configuration" : "Commencer la configuration"}
            </Button>

            {/* Publier maintenant */}
            {automation?.id && configured && (
              <Button
                type="button"
                variant="outline"
                loading={triggering}
                disabled={triggering}
                className={triggerSuccess ? "border-emerald-400/60 bg-emerald-500/20 text-white hover:bg-emerald-500/30 hover:text-white" : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"}
                onClick={publishNow}
              >
                {triggerSuccess ? <><CheckCircle2 className="size-4" />Envoyé !</> : <><Send className="size-4" />Publier maintenant</>}
              </Button>
            )}

            {/* Toutes mes automatisations */}
            <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
              <Link href="/dashboard/automations">
                <ExternalLink className="size-4" />
                Toutes mes automatisations
              </Link>
            </Button>
          </div>
        </div>

        {/* Activer / Désactiver — en bas à droite du bandeau */}
        <div className="mt-6 flex justify-end">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              onClick={() => setStatusOpen((open) => !open)}
            >
              <span className={cn("size-2.5 rounded-full", isActive ? "bg-emerald-400" : "bg-slate-300")} />
              {isActive ? "Active" : "Désactivée"}
              <ChevronDown className="size-4" />
            </Button>
            {statusOpen && (
              <div className="absolute bottom-full right-0 z-20 mb-2 w-48 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => {
                    if (!configured) setView("models");
                    else void activateAutomation();
                    setStatusOpen(false);
                  }}
                >
                  <span className="size-2.5 rounded-full bg-emerald-500" />Active
                </button>
                <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={pauseAutomation}>
                  <span className="size-2.5 rounded-full bg-slate-300" />Désactivée
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

      {/* Chabbat info + Next notification */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_400px]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Chabbat à venir</h2>
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
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Prochaine notification</h2>
          <div className="mt-5 flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Calendar className="size-7" />
            </span>
            <p className="font-bold text-violet-700">
              {isActive
                ? getNextOccurrenceLabel(notificationDayOfWeek, notificationTime)
                : "À programmer"}
            </p>
          </div>
          <div className={cn("mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm", scheduleMode === "notification" ? "border-blue-100 bg-blue-50 text-blue-700" : "border-amber-100 bg-amber-50 text-amber-700")}>
            {scheduleMode === "notification" ? (
              <><Mail className="size-4 mt-0.5 shrink-0" /><span>Un e-mail d&apos;approbation vous sera envoyé avant publication.</span></>
            ) : (
              <><Zap className="size-4 mt-0.5 shrink-0" /><span>Publication automatique sans validation.</span></>
            )}
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" className="w-full" onClick={() => setScheduleOpen(true)}>
              <Bell className="size-4" />
              Modifier l&apos;horaire de notification
            </Button>
          </div>
        </section>
      </div>

      {error && <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {/* Schedule change modal */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Modifier l&apos;horaire</h2>
              <button type="button" className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => setScheduleOpen(false)}>
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-medium text-slate-700">
                Jour de la semaine
                <select
                  value={notificationDay}
                  onChange={(event) => {
                    const day = dayOptions.find((item) => item.value === event.target.value) ?? dayOptions[5];
                    setNotificationDay(day.value);
                    setNotificationDayOfWeek(day.dayOfWeek);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  {dayOptions.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Heure de notification
                <input
                  type="time"
                  value={notificationTime}
                  onChange={(event) => setNotificationTime(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </div>
            <Button type="button" className="mt-6 w-full bg-violet-700 hover:bg-violet-800" loading={saving} onClick={updateSchedule}>
              Enregistrer l&apos;horaire
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
