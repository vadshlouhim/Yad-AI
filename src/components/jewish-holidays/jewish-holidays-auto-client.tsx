"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  Gift,
  ImageIcon,
  MessageSquare,
  Paintbrush,
  AlertTriangle,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAVID_IMAGE_URL, DavidAutomationCard, DavidBannerAgent } from "@/components/automations/automation-design-kit";
import { EmailIcon, FacebookIcon, InstagramIcon, TelegramIcon, WhatsAppIcon } from "@/components/layout/dashboard-nav";
import { cn } from "@/lib/utils";
import {
  DEFAULT_HOLIDAY_NOTIFICATION_DAYS,
  formatDate,
  getDaysUntil,
  getNotificationDate,
  templateMatchesHoliday,
  type HolidayItem,
} from "@/lib/automation/jewish-holidays";
import type { Json } from "@/types/database.types";

const HOLIDAYS_AGENT_IMAGE_URL =
  "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Presatntaion.webp";

const SOCIAL_NETWORKS = [
  { type: "FACEBOOK", label: "Facebook", href: "/dashboard/settings/channels", tone: "text-[#2364d2]", surface: "bg-blue-50", border: "border-blue-200" },
  { type: "INSTAGRAM", label: "Instagram", href: "/dashboard/settings/channels", tone: "text-[#d12d7e]", surface: "bg-pink-50", border: "border-pink-200" },
  { type: "WHATSAPP", label: "WhatsApp", href: "/dashboard/settings/channels", tone: "text-[#128153]", surface: "bg-emerald-50", border: "border-emerald-200" },
] as const;

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subCategory: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  tags: string[];
  isGlobal: boolean;
  isPremium: boolean;
  usageCount: number;
};

type Community = {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  plan: string;
};

type Channel = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  isConnected: boolean;
  settings: Json | null;
  pageId: string | null;
  handle: string | null;
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

type AssistantMessage = {
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

type PosterConfig = {
  configured?: boolean;
  suspended?: boolean;
  notificationsEnabled?: boolean;
  daysBefore?: number;
  selectedHolidayId?: string | null;
  selectedHolidayName?: string | null;
  selectedHolidayCategory?: string | null;
  selectedHolidayDate?: string | null;
  selectedTemplateId?: string | null;
  creationMode?: "template" | "new";
  palette?: string;
  assistantMessages?: AssistantMessage[];
  postText?: string;
  selectedChannels?: string[];
  generatedImageUrl?: string | null;
  publishResults?: Record<string, { success?: boolean; error?: string; fallbackUsed?: boolean }> | null;
};

type View = "overview" | "models" | "customize";

type Props = {
  community: Community;
  holidays: HolidayItem[];
  nextHoliday: HolidayItem | null;
  allTemplates: Template[];
  initialAutomation: InitialAutomation;
  channels: Channel[];
};

const paletteOptions = [
  { id: "violet", label: "Violet", classes: "from-violet-950 via-purple-900 to-violet-700" },
  { id: "blue", label: "Bleu", classes: "from-slate-950 via-blue-950 to-sky-800" },
  { id: "emerald", label: "Emeraude", classes: "from-emerald-950 via-teal-900 to-emerald-700" },
  { id: "rose", label: "Rose", classes: "from-rose-950 via-pink-900 to-rose-700" },
  { id: "gold", label: "Or", classes: "from-amber-950 via-yellow-800 to-amber-500" },
  { id: "mono", label: "Monochrome", classes: "from-zinc-950 via-zinc-900 to-zinc-700" },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isChannelConnected(channel: Channel | undefined) {
  if (!channel) return false;
  return channel.isConnected || (channel.type === "WHATSAPP" && isRecord(channel.settings) && channel.settings.mode === "personal");
}

function getPosterConfig(automation: InitialAutomation): PosterConfig {
  if (!automation || !isRecord(automation.triggerConfig)) return {};
  const config = automation.triggerConfig.holidayPoster;
  return isRecord(config) ? (config as PosterConfig) : {};
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

function TemplateOption({
  template,
  featured = false,
  onSelect,
}: {
  template: Template;
  featured?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group overflow-hidden rounded-xl border bg-white p-1 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        featured ? "border-violet-400 ring-2 ring-violet-200/70" : "border-slate-200 hover:border-violet-400"
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-slate-100">
        <TemplateImage template={template} />
        {featured ? (
          <span className="absolute left-2 top-2 rounded-md bg-violet-700 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm">
            A la une
          </span>
        ) : null}
      </div>
      <div className="space-y-1 px-3 py-3">
        <p className="line-clamp-2 text-sm font-bold text-slate-950">{template.name}</p>
        <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">{template.subCategory ?? "Modèle lié"}</p>
      </div>
    </button>
  );
}

function SmartphoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="relative aspect-[9/19] w-full max-w-[330px] rounded-[2.75rem] bg-slate-950 p-2 shadow-[0_22px_54px_rgba(15,23,42,0.28)]">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[2.2rem] bg-white">
          <div className="flex h-11 flex-shrink-0 items-center justify-between px-5 pt-1 text-black">
            <span className="text-[13px] font-semibold">9:41</span>
            <span className="h-5 w-20 rounded-full bg-black" />
            <span className="text-[11px] font-bold">5G</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ChannelLogo({ type }: { type: string }) {
  const normalized = type.toUpperCase();
  if (normalized === "INSTAGRAM") return <InstagramIcon className="size-5" />;
  if (normalized === "FACEBOOK") return <FacebookIcon className="size-5" />;
  if (normalized === "WHATSAPP") return <WhatsAppIcon className="size-5" />;
  if (normalized === "TELEGRAM") return <TelegramIcon className="size-5" />;
  if (normalized === "EMAIL") return <EmailIcon className="size-5" />;
  return <Send className="size-5 text-slate-500" />;
}

function HolidayAccordion({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 border-l-4 border-l-[#421388] bg-white shadow-sm shadow-[#421388]/5">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <ChevronDown className={cn("size-5 text-violet-700 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && <div className="border-t border-slate-100 p-5">{children}</div>}
    </section>
  );
}

function PosterFallback({ palette, text }: { palette: string; text: string }) {
  const selected = paletteOptions.find((item) => item.id === palette) ?? paletteOptions[0];
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center bg-gradient-to-br p-8 text-center text-white", selected.classes)}>
      <Sparkles className="size-10 text-white/80" />
      <p className="mt-4 text-2xl font-black">Aperçu en attente</p>
      <p className="mt-3 max-w-[220px] text-sm leading-6 text-white/80">
        {text || "Décrivez votre affiche, puis générez le visuel."}
      </p>
    </div>
  );
}

export function JewishHolidaysAutoClient({
  community,
  holidays,
  nextHoliday,
  allTemplates,
  initialAutomation,
  channels,
}: Props) {
  const savedConfig = useMemo(() => getPosterConfig(initialAutomation), [initialAutomation]);
  const initialHoliday =
    holidays.find((holiday) => holiday.id === savedConfig.selectedHolidayId) ?? nextHoliday ?? holidays[0] ?? null;
  const [view, setView] = useState<View>("overview");
  const [, setAutomation] = useState(initialAutomation);
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayItem | null>(initialHoliday);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(savedConfig.selectedTemplateId ?? null);
  const [daysBefore, setDaysBefore] = useState(savedConfig.daysBefore ?? DEFAULT_HOLIDAY_NOTIFICATION_DAYS);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(
    savedConfig.notificationsEnabled ?? (savedConfig.configured && !savedConfig.suspended ? true : null)
  );
  const [palette] = useState(savedConfig.palette ?? "violet");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(
    savedConfig.assistantMessages?.length
      ? savedConfig.assistantMessages
      : [{
          role: "assistant",
          content: "Indiquez librement les informations à afficher.",
          createdAt: new Date().toISOString(),
        }]
  );
  const [assistantInput, setAssistantInput] = useState("");
  const [postText, setPostText] = useState(savedConfig.postText ?? "");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    savedConfig.selectedChannels?.length ? savedConfig.selectedChannels : ["FACEBOOK", "INSTAGRAM", "WHATSAPP"]
  );
  const [generatedImageUrl, setGeneratedImageUrl] = useState(savedConfig.generatedImageUrl ?? "");
  const [publishResults, setPublishResults] = useState(savedConfig.publishResults ?? null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);

  const isPaid = community.plan !== "FREE_TRIAL";
  const [showWelcome, setShowWelcome] = useState(false);
  const channelsByType = useMemo(() => new Map(channels.map((channel) => [channel.type, channel])), [channels]);
  const selectedDisconnectedNetworks = SOCIAL_NETWORKS
    .filter((network) => selectedChannels.includes(network.type) && !isChannelConnected(channelsByType.get(network.type)))
    .map((network) => network.label);
  const orderedTemplates = useMemo(() => {
    return [...allTemplates].sort((left, right) => {
      if (left.usageCount !== right.usageCount) return right.usageCount - left.usageCount;
      return left.name.localeCompare(right.name, "fr");
    });
  }, [allTemplates]);
  const featuredTemplates = useMemo(
    () => nextHoliday ? orderedTemplates.filter((template) => templateMatchesHoliday(template, nextHoliday)) : [],
    [nextHoliday, orderedTemplates]
  );
  const calendarTemplateSections = useMemo(() => {
    const displayedTemplateIds = new Set(featuredTemplates.map((template) => template.id));
    const sections = holidays
      .filter((holiday) => holiday.id !== nextHoliday?.id)
      .map((holiday) => {
        const templates = orderedTemplates.filter((template) =>
          !displayedTemplateIds.has(template.id) && templateMatchesHoliday(template, holiday)
        );
        templates.forEach((template) => displayedTemplateIds.add(template.id));
        return { holiday, templates };
      })
      .filter((section) => section.templates.length > 0);

    return {
      sections,
      otherTemplates: orderedTemplates.filter((template) => !displayedTemplateIds.has(template.id)),
    };
  }, [featuredTemplates, holidays, nextHoliday, orderedTemplates]);
  const selectedTemplate = allTemplates.find((template) => template.id === selectedTemplateId) ?? null;
  const nextNotificationDate = selectedHoliday ? getNotificationDate(selectedHoliday.firstEveningDate, daysBefore) : null;

  function requirePaid() {
    if (isPaid) return false;
    setPaywallOpen(true);
    return true;
  }

  async function saveToApi(payload: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/jewish-holidays-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible");
      setAutomation(data);
      return data as InitialAutomation;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Enregistrement impossible");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveDelay(nextValue: number) {
    if (requirePaid()) return;
    setDaysBefore(nextValue);
    await saveToApi({ mode: "save-delay", daysBefore: nextValue });
  }

  async function saveNotificationPreference(enabled: boolean) {
    if (requirePaid()) return;
    setNotificationsEnabled(enabled);
    await saveToApi({
      mode: "set-notification-preference",
      enabled,
      daysBefore,
      holidayId: selectedHoliday?.id,
      holidayName: selectedHoliday?.officialName,
      holidayCategory: selectedHoliday?.categoryLabel,
      holidayDate: selectedHoliday?.firstEveningDate,
    });
  }

  function openHolidayVisuals(holiday: HolidayItem) {
    setSelectedHoliday(holiday);
    setSelectedTemplateId(null);
    setView("models");
  }

  async function chooseTemplate(template: Template | null, mode: "template" | "new") {
    if (requirePaid() || !selectedHoliday) return;
    setSelectedTemplateId(template?.id ?? null);
    const saved = await saveToApi({
      mode: "save-selection",
      holidayId: selectedHoliday.id,
      holidayName: selectedHoliday.officialName,
      holidayCategory: selectedHoliday.categoryLabel,
      holidayDate: selectedHoliday.firstEveningDate,
      templateId: template?.id ?? null,
      creationMode: mode,
    });
    if (saved) setView("customize");
  }

  function addUserMessage() {
    if (requirePaid()) return;
    const value = assistantInput.trim();
    if (!value) return;
    setAssistantMessages((current) => [...current, { role: "user", content: value, createdAt: new Date().toISOString() }]);
    if (!postText) setPostText(value);
    setAssistantInput("");
  }

  async function generatePoster() {
    if (requirePaid()) return;
    const userText = assistantMessages.filter((message) => message.role === "user").map((message) => message.content).join("\n\n").trim();
    if (!userText) {
      setError("Écrivez les informations à afficher avant de générer.");
      return;
    }

    setGenerating(true);
    setError("");
    try {
      await saveToApi({
        mode: "save-config",
        palette,
        assistantMessages,
        postText,
        selectedChannels,
        daysBefore,
      });
      const response = await fetch("/api/jewish-holidays-auto/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText, palette, selectedTemplateId, holidayId: selectedHoliday?.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Génération impossible");
      setGeneratedImageUrl(data.imageUrl);
      setAssistantMessages((current) => [...current, {
        role: "assistant",
        content: "Votre affiche est prête. Vérifiez-la avant publication.",
        createdAt: new Date().toISOString(),
      }]);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Génération impossible");
    } finally {
      setGenerating(false);
    }
  }

  async function activate() {
    if (requirePaid()) return;
    if (selectedChannels.length === 0) {
      setError("Sélectionnez au moins un réseau avant d'activer l'automatisation.");
      return;
    }
    if (selectedDisconnectedNetworks.length > 0) {
      setError(`Connectez d'abord : ${selectedDisconnectedNetworks.join(", ")}.`);
      return;
    }
    const saved = await saveToApi({
      mode: "activate",
      palette,
      assistantMessages,
      postText,
      selectedChannels,
      daysBefore,
      holidayId: selectedHoliday?.id,
      holidayName: selectedHoliday?.officialName,
      holidayCategory: selectedHoliday?.categoryLabel,
      holidayDate: selectedHoliday?.firstEveningDate,
    });
    if (saved) setView("overview");
  }

  async function beginConfiguration() {
    if (requirePaid()) return;
    setShowWelcome(false);
    await saveToApi({
      mode: "activate",
      palette,
      assistantMessages,
      postText,
      selectedChannels,
      daysBefore,
      holidayId: selectedHoliday?.id,
      holidayName: selectedHoliday?.officialName,
      holidayCategory: selectedHoliday?.categoryLabel,
      holidayDate: selectedHoliday?.firstEveningDate,
    });
    setView("models");
  }

  async function publish() {
    if (requirePaid()) return;
    if (selectedDisconnectedNetworks.length > 0) {
      setError(`Connectez d'abord : ${selectedDisconnectedNetworks.join(", ")}.`);
      return;
    }
    setPublishing(true);
    setError("");
    try {
      await saveToApi({
        mode: "save-config",
        palette,
        assistantMessages,
        postText,
        selectedChannels,
        daysBefore,
      });
      const response = await fetch("/api/jewish-holidays-auto/publish", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Publication impossible");
      setPublishResults(data.results ?? null);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Publication impossible");
    } finally {
      setPublishing(false);
    }
  }

  if (view === "models") {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="relative overflow-visible rounded-[1.4rem] border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-[0_22px_52px_rgba(66,19,136,0.22)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Button type="button" variant="ghost" size="icon" className="border border-white/20 text-white hover:bg-white/10" onClick={() => setView("overview")}>
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Choisissez votre affiche</h1>
                <p className="mt-2 text-sm text-violet-100">
                  {selectedHoliday ? `${selectedHoliday.officialName} - ${selectedHoliday.dateLabel}` : "Sélectionnez une fête depuis la vue d'ensemble."}
                </p>
              </div>
            </div>
            <DavidBannerAgent
              className="lg:max-w-xl"
              text="Je suis David votre assistant IA, je vous aide à choisir le bon visuel pour chaque fête"
            />
          </div>
        </div>

        {orderedTemplates.length > 0 ? (
          <div className="space-y-10">
            <section className="border-y border-violet-200 bg-violet-50/70 px-4 py-6 sm:px-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-violet-700 text-white shadow-sm">
                    <Gift className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-slate-950">Affiches pour la fête à venir</h2>
                    <p className="mt-1 text-sm font-semibold text-violet-800">
                      {nextHoliday ? `${nextHoliday.officialName} - ${nextHoliday.dateLabel}` : "La prochaine fête sera affichée ici."}
                    </p>
                  </div>
                </div>
                {featuredTemplates.length > 0 ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm">
                    {featuredTemplates.length} affiche{featuredTemplates.length > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>

              {featuredTemplates.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {featuredTemplates.map((template) => (
                    <TemplateOption key={template.id} template={template} featured onSelect={() => void chooseTemplate(template, "template")} />
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-600">Aucune affiche n&apos;est encore associée à cette fête. Les autres modèles restent disponibles ci-dessous.</p>
              )}
            </section>

            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-black text-slate-950">Toutes les autres affiches</h2>
                <p className="mt-1 text-sm text-slate-500">Classées selon les prochaines dates du calendrier juif.</p>
              </div>

              {calendarTemplateSections.sections.map(({ holiday, templates }) => (
                <section key={holiday.id} className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-black text-slate-950">{holiday.officialName}</h3>
                    <span className="text-sm font-semibold text-slate-500">{holiday.dateLabel}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {templates.map((template) => (
                      <TemplateOption key={template.id} template={template} onSelect={() => void chooseTemplate(template, "template")} />
                    ))}
                  </div>
                </section>
              ))}

              {calendarTemplateSections.otherTemplates.length > 0 ? (
                <section className="border-t border-slate-200 pt-5">
                  <h3 className="text-lg font-black text-slate-950">Autres affiches</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {calendarTemplateSections.otherTemplates.map((template) => (
                      <TemplateOption key={template.id} template={template} onSelect={() => void chooseTemplate(template, "template")} />
                    ))}
                  </div>
                </section>
              ) : null}
            </section>
          </div>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <ImageIcon className="mx-auto size-12 text-slate-300" />
            <h2 className="mt-4 text-2xl font-bold text-slate-950">Aucune affiche disponible pour le moment</h2>
            <Button asChild type="button" size="xl" className="mt-6 bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]">
              <Link href="/dashboard/templates">
                Voir tous les visuels
              </Link>
            </Button>
          </section>
        )}
      </div>
    );
  }

  if (view === "customize") {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="relative overflow-visible rounded-[1.4rem] border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-[0_22px_52px_rgba(66,19,136,0.22)]">
          <div className="relative">
            <div className="mb-4 h-1.5 w-12 rounded-full bg-white/80" />
            <h1 className="text-3xl font-bold tracking-tight">Personnalisez et activez</h1>
          </div>
          <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 sm:block" aria-hidden="true">
            <div className="flex size-24 items-center justify-center rounded-3xl bg-white p-2 shadow-2xl shadow-[#22084b]/30 ring-1 ring-white/70 animate-install-float">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DAVID_IMAGE_URL} alt="" className="h-full w-full object-contain object-bottom" />
            </div>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
          <h2 className="text-xl font-bold text-slate-950">Aperçu de votre publication</h2>
          <div className="mt-4">
            <SmartphoneFrame>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                  <div className="size-8 overflow-hidden rounded-full bg-slate-100">
                    {community.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={community.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-slate-900">{community.name.toLowerCase().replace(/\s+/g, "")}</p>
                    <p className="text-[10px] text-slate-400">Publication</p>
                  </div>
                  <span className="text-lg leading-none text-slate-500">...</span>
                </div>
                <div className="aspect-square w-full overflow-hidden bg-slate-100">
                  {generatedImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={generatedImageUrl} alt="Affiche générée" className="h-full w-full object-cover" />
                  ) : selectedTemplate ? (
                    <TemplateImage template={selectedTemplate} />
                  ) : (
                    <PosterFallback palette={palette} text={assistantInput || postText} />
                  )}
                </div>
                <div className="space-y-2 px-3 py-3 text-[11px] leading-4 text-slate-800">
                  <p>
                    <span className="font-bold">{community.name.toLowerCase().replace(/\s+/g, "")}</span>{" "}
                    {postText || assistantInput || "Texte de publication à valider."}
                  </p>
                  <p className="text-slate-400">Voir les commentaires</p>
                </div>
              </div>
            </SmartphoneFrame>
          </div>
        </section>

        <div>
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Consignes pour l&apos;affiche</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <textarea
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  placeholder="Exemple : Beth Habad Centre - Chavouot du 21 au 23 mai - Min'ha a 19 h 30 - ajoute notre logo et indique inscription obligatoire."
                  className="min-h-28 rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
                <Button type="button" className="bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]" onClick={addUserMessage}>
                  <Wand2 className="size-4" />
                  Envoyer
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" size="xl" loading={generating} className="bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]" onClick={() => void generatePoster()}>
                  <Sparkles className="size-5" />
                  {generatedImageUrl ? "Régénérer" : "Générer mon affiche"}
                </Button>
                {generatedImageUrl && (
                  <Button type="button" variant="outline" size="xl" onClick={() => setAssistantInput("Je veux modifier : ")}>
                    <MessageSquare className="size-5" />
                    Modifier avec l&apos;IA
                  </Button>
                )}
              </div>
              {generating && <p className="mt-3 text-sm font-semibold text-violet-700">Création de votre affiche en cours...</p>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Texte de la publication</h2>
              <textarea
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                className="mt-3 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                placeholder="Texte valide par vous avant publication."
              />
            </div>

            <div className="grid gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Réseaux sociaux</h2>
                    <p className="mt-1 text-sm text-slate-500">Choisissez les réseaux qui recevront vos visuels de fêtes.</p>
                  </div>
                  <Link href="/dashboard/settings/channels" className="text-xs font-black text-violet-700 transition hover:text-violet-900">
                    Gérer les connexions
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {SOCIAL_NETWORKS.map((network) => {
                    const channel = channelsByType.get(network.type);
                    const connected = isChannelConnected(channel);
                    const selected = selectedChannels.includes(network.type);

                    return (
                      <article
                        key={network.type}
                        className={cn(
                          "overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition",
                          selected ? `${network.border} ${network.surface}` : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className={cn("flex size-10 items-center justify-center rounded-xl bg-white shadow-sm", network.tone)}>
                            <ChannelLogo type={network.type} />
                          </span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              setSelectedChannels((current) => event.target.checked
                                ? [...new Set([...current, network.type])]
                                : current.filter((item) => item !== network.type));
                            }}
                            className="mt-1 size-4 cursor-pointer accent-violet-700"
                            aria-label={`Sélectionner ${network.label}`}
                          />
                        </div>
                        <p className="mt-3 text-sm font-black text-slate-950">{channel?.name || network.label}</p>
                        <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-bold", connected ? "text-emerald-700" : "text-amber-700")}>
                          {connected ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                          {connected ? "Connecté" : "Connexion requise"}
                        </p>
                        <div className="mt-4 border-t border-slate-900/5 pt-3">
                          <Link href={network.href} className={cn("text-xs font-black transition hover:opacity-70", network.tone)}>
                            {connected ? "Paramètres" : "Connecter le compte"}
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" size="xl" loading={saving} className="bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]" onClick={() => void activate()}>
                <Sparkles className="size-5" />
                Valider et activer l&apos;automatisation
              </Button>
              <Button type="button" variant="outline" size="xl" onClick={() => setView("models")}>
                <ArrowLeft className="size-5" />
                Retour
              </Button>
            </div>
          </section>

            <Button type="button" size="xl" loading={publishing} disabled={!generatedImageUrl} className="mt-5 w-full bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]" onClick={() => void publish()}>
              <Send className="size-5" />
              Publier sur tous mes réseaux sélectionnés
            </Button>

            {publishResults && (
              <div className="mt-4 space-y-2">
                {Object.entries(publishResults).map(([channel, result]) => (
                  <div key={channel} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="font-bold text-slate-900">{channel}</span>
                    <span className={cn("font-semibold", result?.success ? "text-emerald-600" : result?.fallbackUsed ? "text-amber-600" : "text-red-600")}>
                      {result?.success ? "Publie" : result?.fallbackUsed ? "Fallback pret" : "Echec"}
                    </span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Sparkles className="size-7" />
              </div>
              <button type="button" onClick={() => setShowWelcome(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <h2 className="mt-5 text-2xl font-bold leading-tight text-slate-950">Fêtes juives et Hassidiques</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Préparez automatiquement vos affiches et messages avant chaque fête juive.
            </p>
            <div className="mt-6 space-y-4">
              {[
                { step: 1, title: "Choisissez un modèle", color: "bg-blue-100 text-blue-700" },
                { step: 2, title: "Validez et publiez", color: "bg-violet-100 text-violet-700" },
              ].map(({ step, title, color }) => (
                <div key={step} className="flex items-start gap-4">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black", color)}>{step}</span>
                  <div>
                    <p className="font-bold text-slate-900">{title}</p>
                  </div>
                </div>
              ))}
            </div>
            <DavidAutomationCard
              className="mt-6"
              disabled={!nextHoliday}
              onCtaClick={() => void beginConfiguration()}
            />
            <div className="mt-8 flex flex-col gap-3">
              <Button type="button" size="xl" className="w-full bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]" disabled={!nextHoliday} onClick={() => void beginConfiguration()}>
                <Sparkles className="size-5" />
                Publiez les Horaires et visuels de fêtes →
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => setShowWelcome(false)}>
                Découvrir d&apos;abord
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-visible rounded-[1.4rem] border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-[0_22px_52px_rgba(66,19,136,0.22)]">
        <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
          <div className="rounded-full bg-white/[0.04] p-5">
            <ImageIcon className="size-28 text-white/[0.08]" strokeWidth={1.6} />
          </div>
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="relative">
            <div className="mb-6 h-1.5 w-12 rounded-full bg-white/80" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 items-end gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 pb-2 pt-1.5 shadow-inner shadow-white/10" role="img" aria-label="Trois bougies de Chabbat et un pinceau">
                <span className="relative block h-6 w-2.5 rounded-sm bg-amber-100 shadow-[0_0_12px_rgba(255,215,128,0.72)] before:absolute before:-top-2 before:left-1/2 before:size-2 before:-translate-x-1/2 before:rounded-full before:bg-orange-300" />
                <span className="relative block h-4 w-2 rounded-sm bg-amber-100 shadow-[0_0_10px_rgba(255,215,128,0.66)] before:absolute before:-top-1.5 before:left-1/2 before:size-1.5 before:-translate-x-1/2 before:rounded-full before:bg-orange-300" />
                <span className="relative block h-6 w-2.5 rounded-sm bg-amber-100 shadow-[0_0_12px_rgba(255,215,128,0.72)] before:absolute before:-top-2 before:left-1/2 before:size-2 before:-translate-x-1/2 before:rounded-full before:bg-orange-300" />
                <Paintbrush className="mb-0.5 ml-0.5 size-4 text-violet-100" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Fêtes juives et Hassidiques</h1>
            </div>
            <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-violet-100">Horaires &amp; visuels de Fêtes</p>
          </div>
          <DavidBannerAgent
            className="lg:max-w-2xl"
            text="Je suis David votre assistant IA, Mon objectif est de préparer les bons visuels pour les Haguim, et publier au bon moment"
          />
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 border-l-4 border-l-[#421388] bg-white p-5 shadow-sm shadow-[#421388]/5">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { number: 1, icon: ImageIcon, title: "Choisissez un modèle", tone: "border-blue-300 text-blue-700" },
            { number: 2, icon: Send, title: "Validez et publiez", tone: "border-violet-300 text-violet-700" },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className={cn("rounded-xl border-2 bg-white p-5 shadow-sm", step.tone)}>
                <div className="flex items-center gap-4">
                  <span className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-lg font-black">{step.number}</span>
                  <Icon className="size-6" />
                </div>
                <p className="mt-4 font-bold text-slate-950">{step.title}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="xl" className="bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]" disabled={!nextHoliday} onClick={() => void beginConfiguration()}>
            <Sparkles className="size-5" />
            Publiez les Horaires et visuels de fêtes →
          </Button>
          <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_14px_30px_rgba(66,19,136,0.18)] ring-1 ring-[#421388]/10 animate-install-float">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HOLIDAYS_AGENT_IMAGE_URL} alt="" className="h-full w-full rounded-[0.85rem] object-cover" />
          </span>
          <p className="max-w-md text-sm font-medium leading-6 text-slate-600">
            nous allons configurer cette automatisation ensemble. <strong className="font-black text-slate-950">Allons-y !</strong>
          </p>
        </div>
      </section>

      <div className="space-y-4">
        <HolidayAccordion title="Prochaine fête" isOpen={openSection === "next"} onToggle={() => setOpenSection(openSection === "next" ? null : "next")}>
          {nextHoliday ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-xl bg-violet-100 px-4 py-2 text-base font-black text-violet-800">{nextHoliday.categoryLabel}</span>
              </div>
              <h3 className="mt-4 text-3xl font-black text-slate-950">{nextHoliday.officialName}</h3>
              <p className="mt-2 text-lg font-semibold text-slate-700">{nextHoliday.dateLabel}</p>
              <p className="mt-2 text-sm text-slate-500">Premier soir : {formatDate(nextHoliday.firstEveningDate)}</p>
              <p className="mt-4 rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">
                {nextHoliday.officialName} dans {getDaysUntil(nextHoliday.startDate)} jours
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Aucune fête future n&apos;est disponible pour le moment.</p>
          )}
        </HolidayAccordion>

        <HolidayAccordion title="Prochaine notification" isOpen={openSection === "notification"} onToggle={() => setOpenSection(openSection === "notification" ? null : "notification")}>
          <div className="mt-5 flex items-start gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Bell className="size-7" />
            </div>
            <div>
              <p className="text-lg font-black text-violet-700">{notificationsEnabled && nextNotificationDate ? formatDate(nextNotificationDate) : "À programmer"}</p>
              <p className="text-sm text-slate-500">{notificationsEnabled ? `${daysBefore} jours avant le premier soir.` : "Choisissez si David doit vous notifier automatiquement."}</p>
            </div>
          </div>
          <p className="mt-5 text-sm font-black text-slate-950">Voulez-vous recevoir automatiquement les affiches avant les Haguim ?</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void saveNotificationPreference(true)}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-black transition",
                notificationsEnabled === true ? "border-violet-500 bg-violet-50 text-violet-800 ring-2 ring-violet-100" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
              )}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => void saveNotificationPreference(false)}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-black transition",
                notificationsEnabled === false ? "border-slate-500 bg-slate-50 text-slate-950 ring-2 ring-slate-100" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              )}
            >
              Non
            </button>
          </div>
          {notificationsEnabled === true && (
            <label className="mt-5 block text-sm font-bold text-slate-700">
              Modifier mon délai
              <input
                type="number"
                min={1}
                max={90}
                value={daysBefore}
                onChange={(event) => void saveDelay(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </label>
          )}
        </HolidayAccordion>

        <HolidayAccordion title="Liste des Haguim à venir →" isOpen={openSection === "annual"} onToggle={() => setOpenSection(openSection === "annual" ? null : "annual")}>
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          {holidays.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Aucune fête à venir pour le pays configuré.</p>
          ) : (
            holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="grid w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 md:grid-cols-[1.25fr_180px_160px_170px]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-950">{holiday.officialName}</p>
                    <button
                      type="button"
                      onClick={() => openHolidayVisuals(holiday)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-50"
                    >
                      <ImageIcon className="size-3.5" />
                      Voir les visuels
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-violet-700">{holiday.categoryLabel}</p>
                </div>
                <p className="text-sm text-slate-600">{holiday.dateLabel}</p>
                <p className="text-sm text-slate-600">Premier soir : {formatDate(holiday.firstEveningDate)}</p>
                <p className="text-sm font-semibold text-slate-700">Notification : {formatDate(getNotificationDate(holiday.firstEveningDate, daysBefore))}</p>
              </div>
            ))
          )}
        </div>
        </HolidayAccordion>
      </div>

      {paywallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <button type="button" className="ml-auto flex rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => setPaywallOpen(false)}>
              <X className="size-5" />
            </button>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Sparkles className="size-8" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-950">Activez EasyCom IA</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Abonnez-vous pour configurer, générer et publier les affiches de fêtes.</p>
            <Button asChild className="mt-6 w-full bg-[#421388] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#35106f]">
              <Link href="/dashboard/settings/billing">Découvrir l&apos;abonnement</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



