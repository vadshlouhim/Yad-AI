"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  ImageIcon,
  MessageSquare,
  PauseCircle,
  Send,
  Settings,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  templates: Template[];
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

function SmartphoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="relative aspect-[12/25] w-full max-w-[315px] rounded-[3rem] border border-violet-200 bg-slate-950 p-1 shadow-[0_22px_54px_rgba(15,23,42,0.28)]">
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

function PosterFallback({ palette, text }: { palette: string; text: string }) {
  const selected = paletteOptions.find((item) => item.id === palette) ?? paletteOptions[0];
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center bg-gradient-to-br p-8 text-center text-white", selected.classes)}>
      <Sparkles className="size-10 text-white/80" />
      <p className="mt-4 text-2xl font-black">Apercu en attente</p>
      <p className="mt-3 max-w-[220px] text-sm leading-6 text-white/80">
        {text || "Decrivez votre affiche avec l'Assistant IA, puis genereez le visuel."}
      </p>
    </div>
  );
}

export function JewishHolidaysAutoClient({
  community,
  holidays,
  nextHoliday,
  templates,
  allTemplates,
  initialAutomation,
  channels,
}: Props) {
  const savedConfig = useMemo(() => getPosterConfig(initialAutomation), [initialAutomation]);
  const initialHoliday =
    holidays.find((holiday) => holiday.id === savedConfig.selectedHolidayId) ?? nextHoliday ?? holidays[0] ?? null;
  const [view, setView] = useState<View>("overview");
  const [automation, setAutomation] = useState(initialAutomation);
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayItem | null>(initialHoliday);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(savedConfig.selectedTemplateId ?? null);
  const [creationMode, setCreationMode] = useState<"template" | "new">(savedConfig.creationMode ?? "template");
  const [daysBefore, setDaysBefore] = useState(savedConfig.daysBefore ?? DEFAULT_HOLIDAY_NOTIFICATION_DAYS);
  const [palette, setPalette] = useState(savedConfig.palette ?? "violet");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(
    savedConfig.assistantMessages?.length
      ? savedConfig.assistantMessages
      : [{
          role: "assistant",
          content: "Indiquez librement tout ce que vous souhaitez afficher : nom de la structure, fete, dates, horaires, offices, message ou toute autre information utile. Je creerai une nouvelle affiche uniquement avec vos informations.",
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
  const [statusOpen, setStatusOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);

  const isPaid = community.plan !== "FREE_TRIAL";
  const isActive = automation?.isActive === true && automation.status === "ACTIVE";
  const configured = Boolean(savedConfig.configured || automation?.status === "ACTIVE");
  const activeTemplates = selectedHoliday
    ? allTemplates.filter((template) => templateMatchesHoliday(template, selectedHoliday))
    : templates;
  const selectedTemplate = activeTemplates.find((template) => template.id === selectedTemplateId) ?? null;
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

  async function pause() {
    if (requirePaid()) return;
    await saveToApi({ mode: "pause" });
    setStatusOpen(false);
  }

  async function resume() {
    if (requirePaid()) return;
    await saveToApi({ mode: "resume" });
    setStatusOpen(false);
  }

  async function chooseTemplate(template: Template | null, mode: "template" | "new") {
    if (requirePaid() || !selectedHoliday) return;
    setSelectedTemplateId(template?.id ?? null);
    setCreationMode(mode);
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
      setError("Ecrivez les informations a afficher avant de generer.");
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
      if (!response.ok) throw new Error(data.error ?? "Generation impossible");
      setGeneratedImageUrl(data.imageUrl);
      setAssistantMessages((current) => [...current, {
        role: "assistant",
        content: "Votre affiche est prete. Verifiez-la avant publication.",
        createdAt: new Date().toISOString(),
      }]);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Generation impossible");
    } finally {
      setGenerating(false);
    }
  }

  async function activate() {
    if (requirePaid()) return;
    const saved = await saveToApi({
      mode: "activate",
      palette,
      assistantMessages,
      postText,
      selectedChannels,
      daysBefore,
    });
    if (saved) setView("overview");
  }

  async function publish() {
    if (requirePaid()) return;
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
      <div className="mx-auto max-w-[1500px] space-y-6 pb-16">
        <div className="rounded-[1.4rem] bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950 p-5 text-white shadow-[0_22px_52px_rgba(76,29,149,0.26)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Button type="button" variant="ghost" size="icon" className="border border-white/20 text-white hover:bg-white/10" onClick={() => setView("overview")}>
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Choisissez votre affiche</h1>
                <p className="mt-2 text-sm text-violet-100">
                  {selectedHoliday ? `${selectedHoliday.officialName} - ${selectedHoliday.dateLabel}` : "Selectionnez une fete depuis la vue d'ensemble."}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 items-start gap-4 text-center text-xs text-violet-100">
              {["Modele", "Personnalisation", "Activation"].map((label, index) => (
                <div key={label} className="min-w-20">
                  <div className={cn("mx-auto flex size-9 items-center justify-center rounded-full border border-white/30", index === 0 ? "bg-white text-violet-900" : "text-white/70")}>
                    {index + 1}
                  </div>
                  <p className="mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {activeTemplates.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {activeTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => void chooseTemplate(template, "template")}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-1 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                  <TemplateImage template={template} />
                </div>
                <div className="space-y-1 px-3 py-3">
                  <p className="line-clamp-2 text-sm font-bold text-slate-950">{template.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">{template.subCategory ?? "Modele lie"}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-violet-700">
                    Choisir ce modele <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </button>
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <ImageIcon className="mx-auto size-12 text-slate-300" />
            <h2 className="mt-4 text-2xl font-bold text-slate-950">Aucun modele disponible pour cette fete</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Aucun modele Supabase directement lie a cette fete n&apos;a ete trouve. Vous pouvez creer une nouvelle affiche independante.
            </p>
            <Button type="button" size="xl" className="mt-6 bg-violet-700 hover:bg-violet-800" onClick={() => void chooseTemplate(null, "new")}>
              <Sparkles className="size-5" />
              Creer une nouvelle affiche
            </Button>
          </section>
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
            {[(creationMode === "new" ? "Creation" : "Modele"), "Personnalisation", "Activation"].map((label, index) => (
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
              <h2 className="text-lg font-bold text-slate-950">Decrivez votre affiche a l&apos;Assistant IA</h2>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {assistantMessages.map((message, index) => (
                  <div key={`${message.createdAt}-${index}`} className={cn("rounded-xl px-4 py-3 text-sm leading-6", message.role === "user" ? "ml-auto max-w-[86%] bg-violet-700 text-white" : "mr-auto max-w-[92%] bg-white text-slate-700 shadow-sm")}>
                    {message.content}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                <textarea
                  value={assistantInput}
                  onChange={(event) => setAssistantInput(event.target.value)}
                  placeholder="Exemple : Beth Habad Centre - Chavouot du 21 au 23 mai - Min'ha a 19 h 30 - ajoute notre logo et indique inscription obligatoire."
                  className="min-h-28 rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
                <Button type="button" className="bg-violet-700 hover:bg-violet-800" onClick={addUserMessage}>
                  <Wand2 className="size-4" />
                  Envoyer
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" size="xl" loading={generating} className="bg-violet-700 hover:bg-violet-800" onClick={() => void generatePoster()}>
                  <Sparkles className="size-5" />
                  {generatedImageUrl ? "Regenerer" : "Generer mon affiche"}
                </Button>
                {generatedImageUrl && (
                  <Button type="button" variant="outline" size="xl" onClick={() => setAssistantInput("Je veux modifier : ")}>
                    <MessageSquare className="size-5" />
                    Modifier avec l&apos;IA
                  </Button>
                )}
              </div>
              {generating && <p className="mt-3 text-sm font-semibold text-violet-700">Creation de votre affiche en cours...</p>}
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

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Notification annuelle</h2>
                <label className="mt-4 block text-sm font-medium text-slate-700">
                  Nombre de jours avant la fete
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={daysBefore}
                    onChange={(event) => setDaysBefore(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </label>
                <p className="mt-3 text-sm text-slate-500">Prochaine notification : {nextNotificationDate ? formatDate(nextNotificationDate) : "A programmer"}</p>
                <p className="mt-2 text-sm font-semibold text-emerald-700">Renouvellement automatique chaque annee</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Reseaux sociaux selectionnes</h2>
                <div className="mt-4 space-y-2">
                  {channels.map((channel) => (
                    <label key={channel.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span>
                        <span className="font-bold text-slate-900">{channel.type}</span>
                        <span className={cn("ml-2 text-xs", channel.isConnected ? "text-emerald-600" : "text-amber-600")}>
                          {channel.isConnected ? "Connecte" : "Non connecte"}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel.type)}
                        onChange={(event) => {
                          setSelectedChannels((current) => event.target.checked
                            ? [...new Set([...current, channel.type])]
                            : current.filter((item) => item !== channel.type));
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" size="xl" loading={saving} className="bg-violet-700 hover:bg-violet-800" onClick={() => void activate()}>
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
            <h2 className="text-xl font-bold text-slate-950">Apercu de votre affiche</h2>
            <div className="mt-4">
              <SmartphoneFrame>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="truncate text-[12px] font-bold text-slate-900">{community.name.toLowerCase().replace(/\s+/g, "")}</p>
                    <span className="text-lg leading-none text-slate-500">...</span>
                  </div>
                  <div className="aspect-square w-full overflow-hidden bg-slate-100">
                    {generatedImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={generatedImageUrl} alt="Affiche generee" className="h-full w-full object-cover" />
                    ) : selectedTemplate ? (
                      <TemplateImage template={selectedTemplate} />
                    ) : (
                      <PosterFallback palette={palette} text={assistantMessages.find((message) => message.role === "user")?.content ?? ""} />
                    )}
                  </div>
                  <div className="space-y-2 px-3 py-3 text-[11px] leading-4 text-slate-800">
                    <p>{postText || assistantMessages.filter((message) => message.role === "user").at(-1)?.content || "Texte de publication a valider."}</p>
                    <p className="text-slate-400">Voir les commentaires</p>
                  </div>
                </div>
              </SmartphoneFrame>
            </div>

            <Button type="button" size="xl" loading={publishing} disabled={!generatedImageUrl} className="mt-5 w-full bg-violet-700 hover:bg-violet-800" onClick={() => void publish()}>
              <Send className="size-5" />
              Publier sur tous mes reseaux selectionnes
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
            <h1 className="text-4xl font-bold tracking-tight">Fetes juives et Hassidiques</h1>
            <p className="mt-2 text-violet-100">Calendrier utilise : {community.country ?? "Pays non renseigne"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Button type="button" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => setStatusOpen((open) => !open)}>
                <span className={cn("size-2.5 rounded-full", isActive ? "bg-emerald-400" : "bg-slate-300")} />
                {isActive ? "Active" : "Desactivee"}
                <ChevronDown className="size-4" />
              </Button>
              {statusOpen && (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-lg">
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => void resume()}>
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    Active
                  </button>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => void pause()}>
                    <span className="size-2.5 rounded-full bg-slate-300" />
                    Desactivee
                  </button>
                </div>
              )}
            </div>
            <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
              <Link href="/dashboard/events">
                <CalendarDays className="size-4" />
                Toutes mes automatisations programmees
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { number: 1, icon: Clock, title: "Choisissez votre delai", text: "Definissez combien de jours avant chaque fete vous souhaitez etre notifie.", tone: "border-sky-100 bg-sky-50 text-sky-700" },
            { number: 2, icon: ImageIcon, title: "Preparez votre affiche", text: "Choisissez un modele lie a la fete ou creez une nouvelle affiche.", tone: "border-violet-100 bg-violet-50 text-violet-700" },
            { number: 3, icon: Send, title: "Validez et publiez", text: "Verifiez le contenu puis publiez sur vos reseaux connectes.", tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
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
          <h2 className="text-xl font-bold text-slate-950">Prochaine fete</h2>
          {nextHoliday ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-xl bg-violet-100 px-4 py-2 text-base font-black text-violet-800">{nextHoliday.categoryLabel}</span>
                <span className="text-sm text-slate-500">Derniere synchronisation : {formatDate(nextHoliday.lastSyncedAt.slice(0, 10))}</span>
              </div>
              <h3 className="mt-4 text-3xl font-black text-slate-950">{nextHoliday.officialName}</h3>
              <p className="mt-2 text-lg font-semibold text-slate-700">{nextHoliday.dateLabel}</p>
              <p className="mt-2 text-sm text-slate-500">Premier soir : {formatDate(nextHoliday.firstEveningDate)}</p>
              <p className="mt-4 rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">
                {nextHoliday.officialName} dans {getDaysUntil(nextHoliday.startDate)} jours
              </p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => setView("customize")}>
                <Settings className="size-4" />
                Modifier exceptionnellement
              </Button>
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Aucune fete disponible dans Supabase pour ce pays.</p>
          )}
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Prochaine notification</h2>
          <div className="mt-5 flex items-start gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Bell className="size-7" />
            </div>
            <div>
              <p className="text-lg font-black text-violet-700">{nextNotificationDate ? formatDate(nextNotificationDate) : "A programmer"}</p>
              <p className="text-sm text-slate-500">{daysBefore} jours avant le premier soir.</p>
            </div>
          </div>
          <label className="mt-5 block text-sm font-bold text-slate-700">
            Modifier mon delai
            <input
              type="number"
              min={1}
              max={90}
              value={daysBefore}
              onChange={(event) => void saveDelay(Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </label>
          <Button type="button" variant="outline" className="mt-4 w-full" onClick={() => void pause()}>
            <PauseCircle className="size-4" />
            Suspendre l&apos;automatisation
          </Button>
        </aside>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-950">Liste annuelle</h2>
          <Button type="button" size="xl" className="bg-violet-700 hover:bg-violet-800" disabled={!nextHoliday} onClick={() => setView("models")}>
            <Sparkles className="size-5" />
            {configured ? "Modifier la configuration" : "Commencer la configuration"}
          </Button>
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          {holidays.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Aucune fete a venir pour le pays configure.</p>
          ) : (
            holidays.map((holiday) => (
              <button
                key={holiday.id}
                type="button"
                onClick={() => {
                  setSelectedHoliday(holiday);
                  setView("models");
                }}
                className="grid w-full gap-2 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 md:grid-cols-[1.2fr_180px_160px_160px]"
              >
                <div>
                  <p className="font-bold text-slate-950">{holiday.officialName}</p>
                  <p className="text-sm font-semibold text-violet-700">{holiday.categoryLabel}</p>
                </div>
                <p className="text-sm text-slate-600">{holiday.dateLabel}</p>
                <p className="text-sm text-slate-600">Premier soir : {formatDate(holiday.firstEveningDate)}</p>
                <p className="text-sm font-semibold text-slate-700">Notification : {formatDate(getNotificationDate(holiday.firstEveningDate, daysBefore))}</p>
              </button>
            ))
          )}
        </div>
      </section>

      {paywallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <button type="button" className="ml-auto flex rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={() => setPaywallOpen(false)}>
              <X className="size-5" />
            </button>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-violet-100 text-violet-700">
              <Sparkles className="size-8" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-950">Activez EasyCom AI</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Abonnez-vous pour configurer, generer et publier les affiches de fetes.</p>
            <Button asChild className="mt-6 w-full bg-violet-700 hover:bg-violet-800">
              <Link href="/dashboard/settings/billing">Decouvrir l&apos;abonnement</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
