"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
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
  MapPin,
  PauseCircle,
  Pencil,
  Send,
  Settings,
  Sparkles,
  Star,
  Upload,
  Wand2,
  X,
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
  configured?: boolean;
  suspended?: boolean;
};

type View = "overview" | "models" | "customize";

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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "À programmer";
  return new Date(value).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
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
  return templates[mode].find((template) => template.id === templateId) ?? templates[mode][0] ?? null;
}

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
  const savedConfig = useMemo(() => getPosterConfig(initialAutomation), [initialAutomation]);
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
  const [automation, setAutomation] = useState(initialAutomation);
  const [configured, setConfigured] = useState(Boolean(savedConfig.configured));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const activeTemplates = templates[templateMode];
  const selectedTemplate = selectedTemplateFromConfig(templates, templateMode, selectedTemplateId);
  const selectedPalette = paletteOptions.find((item) => item.id === palette) ?? paletteOptions[0];
  const isActive = automation?.isActive === true && automation.status === "ACTIVE";
  const isPaid = community.plan !== "FREE_TRIAL";
  const nextNotification = automation?.nextRunAt ?? null;

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

  function currentConfig() {
    return {
      palette,
      fields,
      postText,
      officeTimes,
      notificationDay,
      notificationDayOfWeek,
      notificationTime,
    };
  }

  function handleSelectTemplate(template: Template) {
    if (!isPaid) {
      setPaywallOpen(true);
      return;
    }

    setError("");
    setSelectedTemplateId(template.id);
  }

  async function continueToCustomize() {
    if (!isPaid) {
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
      setView("overview");
    }
  }

  async function pauseAutomation() {
    const saved = await saveToApi({ mode: "pause" });
    if (saved) setStatusOpen(false);
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

  if (view === "models") {
    const selectedModel = activeTemplates.find((template) => template.id === selectedTemplateId) ?? null;

    return (
      <div className="mx-auto max-w-[1500px] space-y-6 pb-24">
        <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 p-5 text-white shadow-[0_22px_52px_rgba(76,29,149,0.26)]">
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
              {["Modèle", "Personnalisation", "Programmation", "Validation"].map((label, index) => (
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

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="rounded-[1.2rem] border border-slate-200 bg-white p-4 shadow-sm">
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
                <p className="mt-1 text-sm text-slate-500">Vérifiez les noms techniques centralisés pour la banque d&apos;affiches.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeTemplates.map((template) => {
                  const selected = template.id === selectedTemplateId;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className={cn(
                        "group overflow-hidden rounded-xl border bg-white p-1 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md",
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
                      </div>
                      <div className="flex items-center justify-between gap-3 px-2 py-3">
                        <span className="text-sm font-bold text-slate-900">{selected ? "Modèle sélectionné" : "Choisir ce modèle"}</span>
                        <ArrowRight className="size-4 text-violet-500 transition group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

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
                    <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                      <CheckCircle2 className="size-4" />
                      Prêt pour l&apos;étape 2
                    </span>
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <Button
                  type="button"
                  size="xl"
                  className="w-full bg-violet-700 shadow-lg shadow-violet-900/15 hover:bg-violet-800"
                  disabled={saving}
                  onClick={() => void continueToCustomize()}
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
                  Continuer vers la personnalisation
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setView("overview")}>
                  Retour au tableau de bord
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

        {!isPaid && paywallOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
              <button type="button" className="ml-auto flex rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => setPaywallOpen(false)}>
                <X className="size-5" />
              </button>
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <Calendar className="size-8" />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-slate-950">Activez EasyCom AI</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Abonnez-vous pour choisir un modèle, générer votre affiche et activer l&apos;automatisation hebdomadaire.
              </p>
              <div className="mt-5 space-y-3 text-left text-sm text-slate-700">
                {["Affiche hebdomadaire personnalisée", "Horaires automatiques selon votre ville", "Publication Facebook, Instagram et WhatsApp", "Rappel chaque vendredi à 10 h"].map((item) => (
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
              <p className="mt-4 text-xs text-slate-400">Déjà abonné ? Actualisez votre accès.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "customize") {
    return (
      <div className="space-y-5">
        <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 p-5 text-white shadow-[0_22px_52px_rgba(76,29,149,0.26)]">
          <div className="mb-6 h-1.5 w-10 rounded-full bg-violet-200" />
          <h1 className="text-3xl font-bold tracking-tight">Personnalisez et activez</h1>
          <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            {["Modèle", "Personnalisation", "Activation"].map((label, index) => (
              <div key={label} className="flex items-center gap-3">
                <span className={cn("flex size-9 items-center justify-center rounded-full border border-white/30", index === 1 ? "bg-white text-violet-900" : "text-white/80")}>
                  {index === 0 ? <CheckCircle2 className="size-4" /> : index + 1}
                </span>
                <span className={cn(index === 1 ? "font-bold text-white" : "text-violet-100")}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_520px]">
          <section className="space-y-4">
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
                                <img src={fields.logoUrl} alt="Logo de la structure" className="h-full w-full object-contain p-2" />
                              ) : (
                                <Upload className="size-7 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900">
                                {logoUploading ? "Téléversement du logo..." : "Glissez le logo ici ou cliquez pour le charger"}
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
                            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                              {logoUploadError}
                            </p>
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
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-slate-950">Texte de la publication</h2>
                <span className="h-6 w-11 rounded-full bg-violet-600 p-0.5">
                  <span className="block size-5 translate-x-5 rounded-full bg-white" />
                </span>
              </div>
              <textarea
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                className="mt-3 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Automatisation hebdomadaire</h2>
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
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
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
              <p className="mt-3 text-sm text-slate-500">Prochaine notification : {formatDateTime(nextNotification)}</p>
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" size="xl" loading={saving} className="bg-violet-700 hover:bg-violet-800" onClick={activateAutomation}>
                <Sparkles className="size-5" />
                Valider et activer l&apos;automatisation
              </Button>
              <Button type="button" variant="outline" size="xl" onClick={() => setView("models")}>
                <ArrowLeft className="size-5" />
                Retour
              </Button>
            </div>
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Aperçu de votre affiche</h2>
            <div className="mt-4">
              <SmartphoneFrame>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                        {getInitials(fields.structureName || community.name)}
                      </div>
                      <p className="truncate text-[12px] font-bold text-slate-900">{fields.structureName.toLowerCase().replace(/\s+/g, "")}</p>
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
                      <span className="font-bold">{fields.structureName.toLowerCase().replace(/\s+/g, "")}</span>{" "}
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
                Modèle d&apos;inspiration : {selectedTemplate.name}
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 p-6 text-white shadow-[0_22px_52px_rgba(76,29,149,0.26)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-6 h-1.5 w-12 rounded-full bg-violet-200" />
            <h1 className="text-4xl font-bold tracking-tight">Horaires de Chabbat</h1>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="text-lg font-serif text-violet-100">{"ב''ה"}</p>
            <div className="flex flex-wrap gap-3">
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
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
                      onClick={() => {
                        if (!configured) setView("models");
                        else void activateAutomation();
                        setStatusOpen(false);
                      }}
                    >
                      <span className="size-2.5 rounded-full bg-emerald-500" />
                      Active
                    </button>
                    <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={pauseAutomation}>
                      <span className="size-2.5 rounded-full bg-slate-300" />
                      Désactivée
                    </button>
                  </div>
                )}
              </div>
              <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                <Link href="/dashboard/automations">
                  <ExternalLink className="size-4" />
                  Toutes mes automatisations programmées
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              number: 1,
              icon: ImageIcon,
              title: "Choisissez votre modèle",
              text: "Sélectionnez un modèle d'affiche d'horaires de Chabbat.",
              tone: "border-sky-100 bg-sky-50 text-sky-700",
            },
            {
              number: 2,
              icon: Edit3,
              title: "Personnalisez l'affiche",
              text: "Ajoutez votre logo et renseignez les informations à afficher.",
              tone: "border-violet-100 bg-violet-50 text-violet-700",
            },
            {
              number: 3,
              icon: Send,
              title: "Validez et publiez",
              text: "Publiez en un clic sur Facebook, Instagram et WhatsApp.",
              tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
            },
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

      <div className="grid gap-5 xl:grid-cols-[1fr_440px]">
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
              Modifier les horaires
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Prochaine notification</h2>
          <div className="mt-5 flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Calendar className="size-7" />
            </span>
            <p className="font-bold text-violet-700">{formatDateTime(nextNotification)}</p>
          </div>
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
            <Button type="button" variant="outline" className="w-full" onClick={() => setScheduleOpen(true)}>
              <Bell className="size-4" />
              Recevoir mon affiche à un autre horaire
            </Button>
            <Button type="button" variant="outline" className="w-full text-slate-700" loading={saving} onClick={pauseAutomation}>
              <PauseCircle className="size-4" />
              Suspendre l&apos;automatisation
            </Button>
          </div>
        </section>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="flex justify-center">
        <Button type="button" size="xl" className="bg-violet-700 px-10 hover:bg-violet-800" onClick={() => setView(configured ? "customize" : "models")}>
          <Wand2 className="size-5" />
          {configured ? "Modifier la configuration" : "Commencer la configuration"}
        </Button>
      </div>

      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Choisir un autre horaire</h2>
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
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
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
