"use client";

import { CommunityLogoPicker } from "@/components/templates/community-logo-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Gift,
  ImageIcon,
  Loader2,
  MapPin,
  MessageSquareText,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { DAVID_AUTOMATION_IMAGE_URL } from "@/components/automations/automation-design-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database.types";
import { ScheduleHubNav } from "@/components/templates/schedule-hub-nav";
import { formatOfficeLines, parseOfficeText, serializeOfficeLines, type OfficeLine } from "@/lib/religious/office-times";
import { OfficeTimesEditor } from "@/components/shabbat-times/office-times-editor";
import { inferShabbatTimesVariant } from "@/lib/templates/taxonomy";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { parseOutputLocale, type OutputLocale } from "@/lib/ai/output-locale";
import { hasCommunityAccess } from "@/lib/billing/subscription-policy";
import {
  PosterResultActions,
  OutputLocalePicker,
  SchedulePosterDialogHeader,
  SchedulePosterPreview,
  CanvaCustomizeLink,
  ScheduleSubscribeDialog,
  ScheduleTemplateGallery,
  type ScheduleTemplate,
} from "@/components/religious-schedule/poster-workflow";

type Template = ScheduleTemplate;

type Community = {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  plan: string;
  createdAt?: string | null;
};

type Shabbat = {
  parasha: string | null;
  date: string;
  entry: string | null;
  exit: string | null;
} | null;

type SocialChannel = {
  type: string;
  isConnected: boolean;
  isActive: boolean;
};

type InitialAutomation = {
  id: string;
  isActive: boolean;
  status: string;
  triggerConfig: Json;
} | null;

type FormState = {
  structureName: string;
  city: string;
  parasha: string;
  entry: string;
  exit: string;
  kiddouch: string;
  aiInstructions: string;
  logoUrl: string;
};

type PublishResult = {
  channelType: "FACEBOOK" | "INSTAGRAM";
  success: boolean;
  externalUrl: string | null;
  error?: string | null;
};

type Props = {
  templates: Template[];
  community: Community;
  shabbat: Shabbat;
  initialAutomation: InitialAutomation;
  socialChannels: SocialChannel[];
  initialPoster?: { id: string; imageUrl: string } | null;
  interfaceLocale: OutputLocale;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function savedPosterFields(automation: InitialAutomation) {
  if (!automation || !isRecord(automation.triggerConfig)) return {};
  const poster = automation.triggerConfig.shabbatPoster;
  if (!isRecord(poster) || !isRecord(poster.fields)) return {};
  return poster.fields as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function buildCaption(fields: FormState, locale: OutputLocale, offices: string[] = []) {
  if (locale === "he") return [
    `שבת שלום מאת ${fields.structureName}.`,
    fields.parasha ? `פרשת השבוע: ${fields.parasha}` : "",
    `כניסת שבת: ${fields.entry}`,
    `יציאת שבת: ${fields.exit}`,
    fields.kiddouch ? `קידוש בחסות: ${fields.kiddouch}` : "",
    ...offices,
    fields.city ? `📍 ${fields.city}` : "",
  ].filter(Boolean).join("\n") + "\n\n#שבתשלום";
  const lines = [
    `Chabbat Chalom de la part de ${fields.structureName}.`,
    fields.parasha ? `Paracha : ${fields.parasha}` : "",
    `Entrée de Chabbat : ${fields.entry}`,
    `Sortie de Chabbat : ${fields.exit}`,
    fields.kiddouch ? `Kiddouch offert par : ${fields.kiddouch}` : "",
    ...offices,
    fields.city ? `📍 ${fields.city}` : "",
  ];
  return `${lines.filter(Boolean).join("\n")}\n\n#ChabbatChalom`;
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M13.6 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.5c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.3H6.7V13h3.1v9h3.8Z" />
    </svg>
  );
}

function InstagramMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.7" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function IphonePosterPreview({ template, imageUrl }: { template: Template; imageUrl?: string | null }) {
  return (
    <div className="mx-auto flex w-full justify-center py-2">
      <div className="relative aspect-[12/25] w-full max-w-[315px] rounded-[3.5rem] border-[1.5px] border-[#b0853e] bg-[#f2935a] p-[4px] shadow-[0_22px_54px_rgba(15,23,42,0.34)]">
        <div className="absolute -left-[5px] top-[110px] h-[30px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -left-[5px] top-[160px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -left-[5px] top-[230px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -right-[5px] top-[180px] h-[85px] w-[5px] rounded-r-md border-y border-r border-[#b0853e] bg-[#f2935a]" />
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[3.2rem] bg-white">
          <div className="flex h-12 w-full shrink-0 items-center justify-between px-6 pt-2 text-black">
            <span className="w-1/3 pl-1 text-[14px] font-semibold">9:41</span>
            <span className="mt-1 h-[29px] w-[105px] rounded-full bg-black" />
            <span className="flex w-1/3 justify-end pr-1 text-[11px] font-bold">5G</span>
          </div>
          <div className="min-h-0 flex-1 bg-slate-50 p-3 pb-7">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-white shadow-inner ring-1 ring-slate-200/80">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Affiche personnalisée des horaires de Chabbat" className="h-full w-full object-contain" />
              ) : (
                <TemplateImage template={template} className="h-full w-full object-contain" />
              )}
            </div>
          </div>
          <div className="absolute bottom-2 flex w-full justify-center pb-1">
            <div className="h-[5px] w-[125px] rounded-full bg-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShabbatPublishSuccessDialog({
  results,
  onClose,
}: {
  results: PublishResult[];
  onClose: () => void;
}) {
  const tx = useTranslations("shabbatTimesExtra");
  const successfulResults = results.filter((result) => result.success);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="shabbat-publish-success-title"
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/80 bg-white text-center shadow-[0_30px_100px_rgba(15,23,42,0.4)]"
      >
        <div className="h-2 bg-gradient-to-r from-[#315ecb] via-[#d92d7c] to-[#f06b45]" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-5 flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#421388]"
          aria-label={tx("close")}
        >
          <X className="size-5" />
        </button>

        <div className="p-6 sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm shadow-emerald-200">
            <CheckCircle2 className="size-9" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            {tx("publishSuccess")}
          </p>
          <h2 id="shabbat-publish-success-title" className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
            {tx("published")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {tx("publishedOn")}
          </p>

          <div className="mt-6 grid gap-3">
            {successfulResults.map((result) => {
              const isFacebook = result.channelType === "FACEBOOK";
              const Icon = isFacebook ? FacebookMark : InstagramMark;
              const fallbackUrl = isFacebook ? "https://www.facebook.com/" : "https://www.instagram.com/";

              return (
                <a
                  key={result.channelType}
                  href={result.externalUrl ?? fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl px-4 text-sm font-black text-white shadow-md transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4",
                    isFacebook
                      ? "bg-[#315ecb] shadow-blue-200 focus-visible:ring-blue-200"
                      : "bg-gradient-to-r from-[#d92d7c] to-[#f06b45] shadow-rose-200 focus-visible:ring-rose-200"
                  )}
                >
                  <span className={cn("flex size-9 items-center justify-center rounded-xl bg-white", isFacebook ? "text-[#315ecb]" : "text-[#d12d7e]")}>
                    <Icon className="size-5" />
                  </span>
                  {tx("viewOn", { network: isFacebook ? "Facebook" : "Instagram" })}
                  <ExternalLink className="size-4 opacity-80" />
                </a>
              );
            })}
          </div>

          <Button type="button" variant="outline" onClick={onClose} className="mt-4 h-11 w-full rounded-2xl border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50">
            {tx("close")}
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function TemplateImage({ template, className }: { template: Template; className?: string }) {
  const [source, setSource] = useState(template.previewUrl ?? template.thumbnailUrl);

  if (!source) {
    return (
      <div className={cn("flex items-center justify-center bg-slate-100 text-slate-300", className)}>
        <ImageIcon className="size-10" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={template.name}
      className={cn("object-cover", className)}
      onError={() => setSource(source === template.thumbnailUrl ? null : template.thumbnailUrl)}
    />
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  readOnly = false,
  placeholder,
  required = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  placeholder: string;
  required?: boolean;
  icon: typeof Clock3;
}) {
  return (
    <label className="block text-sm font-bold text-slate-800">
      <span className="flex items-center gap-2">
        <Icon className="size-4 text-[#421388]" />
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        readOnly={readOnly}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#421388] focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

export function ShabbatTimesSimpleClient({
  templates,
  community,
  shabbat,
  initialAutomation,
  socialChannels,
  initialPoster,
  interfaceLocale,
}: Props) {
  const locale = useLocale() as OutputLocale;
  const t = useTranslations("shabbatTimes");
  const tx = useTranslations("shabbatTimesExtra");
  const tn = useTranslations("shabbatTimesNotice");
  const tp = useTranslations("shabbatPlaceholders");
  const format = useFormatter();
  const savedFields = useMemo(() => savedPosterFields(initialAutomation), [initialAutomation]);
  const savedPoster = initialAutomation && isRecord(initialAutomation.triggerConfig) && isRecord(initialAutomation.triggerConfig.shabbatPoster) ? initialAutomation.triggerConfig.shabbatPoster : {};
  const [outputLocale, setOutputLocale] = useState<OutputLocale>(() => initialAutomation ? parseOutputLocale(savedPoster.outputLocale, "fr") : interfaceLocale);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(() => templates.find((template) => template.id === savedPoster.selectedTemplateId) ?? null);
  const [sourceMediaId, setSourceMediaId] = useState<string | null>(initialPoster?.id ?? null);
  const [weekDate, setWeekDate] = useState(shabbat?.date ?? "");
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [cityCandidates, setCityCandidates] = useState<string[]>([]);
  const timesRequest = useRef(0);
  const cityRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    structureName: stringValue(savedFields.structureName) || community.name,
    city: stringValue(savedFields.city) || community.city || "",
    parasha: shabbat?.parasha || "",
    entry: shabbat?.entry || "",
    exit: shabbat?.exit || "",
    kiddouch: stringValue(savedFields.kiddouch),
    aiInstructions: stringValue(savedFields.aiInstructions),
    logoUrl: stringValue(savedFields.logoUrl) || community.logoUrl || "",
  }));
  // Kept as written by the user ("15 min avant l'allumage") and resolved against each week's times.
  const [officeLines, setOfficeLines] = useState<OfficeLine[]>(() => parseOfficeText(stringValue(savedPoster.officeTimes) || stringValue(savedFields.officeTimes)));
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishSuccessResults, setPublishSuccessResults] = useState<PublishResult[] | null>(null);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [automationTime, setAutomationTime] = useState("10:00");
  const [automationActive, setAutomationActive] = useState(Boolean(initialAutomation?.isActive));
  const [savingAutomation, setSavingAutomation] = useState(false);
  const selectedTemplateMode = selectedTemplate && inferShabbatTimesVariant(selectedTemplate) === "with-offices" ? "detailed" : "simple";

  useEffect(() => () => {
    if (cityRefreshTimer.current) clearTimeout(cityRefreshTimer.current);
  }, []);

  const isPaid = hasCommunityAccess(community);
  const templateCounts = useMemo(() => {
    const withOffices = templates.filter((template) => inferShabbatTimesVariant(template) === "with-offices").length;
    return { withOffices, simple: templates.length - withOffices };
  }, [templates]);

  const connectedChannels = useMemo(
    () => new Set(
      socialChannels
        .filter((channel) => channel.isActive && channel.isConnected)
        .map((channel) => channel.type)
    ),
    [socialChannels]
  );
  const [publishChannels, setPublishChannels] = useState<string[]>(() =>
    ["FACEBOOK", "INSTAGRAM"].filter((channel) => connectedChannels.has(channel))
  );

  useEffect(() => {
    if (!selectedTemplate) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generating && !publishing && !publishSuccessResults) setSelectedTemplate(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [generating, publishSuccessResults, publishing, selectedTemplate]);

  function updateForm(field: keyof FormState, value: string) {
    if (field === "city") {
      timesRequest.current += 1;
      setWeekDate("");
      if (cityRefreshTimer.current) clearTimeout(cityRefreshTimer.current);
      if (value.trim().length >= 2) {
        cityRefreshTimer.current = setTimeout(() => void refreshShabbatTimes(value.trim()), 650);
      }
    }
    setForm((current) => field === "city" ? { ...current, city: value, parasha: "", entry: "", exit: "" } : { ...current, [field]: value });
    setError("");
    setNotice("");
  }

  function openTemplate(template: Template) {
    if (!isPaid) {
      setPaywallOpen(true);
      return;
    }
    if (template.id !== selectedTemplate?.id) setSourceMediaId(null);
    setSelectedTemplate(template);
    setResultImageUrl(null);
    setAutomationOpen(false);
    setError("");
    setNotice("");
    setPublishSuccessResults(null);
  }

  async function refreshShabbatTimes(city = form.city) {
    const requestId = ++timesRequest.current;
    setLoadingTimes(true);
    setError("");
    try {
      const response = await fetch(`/api/shabbat?city=${encodeURIComponent(city)}&outputLocale=${outputLocale}`, { cache: "no-store" });
      const data = await response.json();
      if (requestId !== timesRequest.current) return null;
      if (!response.ok || !data.entry || !data.exit) {
        setCityCandidates(Array.isArray(data.candidates) ? data.candidates : []);
        throw new Error(data.error ?? tx("unavailable"));
      }
      setCityCandidates([]);
      setWeekDate(data.date);
      setForm((current) => ({ ...current, city, parasha: data.parasha || "", entry: data.entry, exit: data.exit }));
      return data as { parasha: string; entry: string; exit: string; date: string };
    } catch (error) {
      if (requestId === timesRequest.current) {
        setForm((current) => ({ ...current, parasha: "", entry: "", exit: "" }));
        setWeekDate("");
        setError(error instanceof Error ? error.message : tx("unavailable"));
      }
      return null;
    } finally { if (requestId === timesRequest.current) setLoadingTimes(false); }
  }

  async function generatePoster() {
    if (!selectedTemplate || generating) return;
    if (!form.structureName.trim() || !form.city.trim()) { setError(tx("missingIdentity")); return; }
    const times = await refreshShabbatTimes();
    if (!times) return;

    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const offices = selectedTemplateMode === "detailed" ? formatOfficeLines(officeLines, times, outputLocale) : [];
      const textBlocks = [
        { id: "structure", text: form.structureName.trim(), role: "organization", priority: "main" },
        { id: "city", text: form.city.trim(), role: "location", priority: "complementary" },
        { id: "parasha", text: times.parasha, role: "parasha", priority: "main" },
        { id: "entry", text: times.entry, role: "entry time", priority: "important" },
        { id: "exit", text: times.exit, role: "exit time", priority: "important" },
        ...(form.kiddouch.trim() ? [{ id: "kiddouch", text: `Kiddouch offert par : ${form.kiddouch.trim()}`, role: "Kiddouch", priority: "complementary" }] : []),
        ...(offices.length ? [{ id: "offices", text: offices.join("\n"), role: "Prayer service times: write them in the poster's service-time boxes, one service per line, exactly as given", priority: "important" }] : []),
      ];
      const response = await fetch("/api/templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          sourceMediaId,
          shabbat: true,
          outputLocale,
          textBlocks,
          logoUrl: form.logoUrl || null,
          customInstructions: form.aiInstructions.trim(),
        }),
      });
      const data = await response.json().catch(() => ({})) as { imageUrl?: string; mediaId?: string; error?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.error ?? tx("generationError"));
      setResultImageUrl(data.imageUrl);
      setSourceMediaId(data.mediaId ?? null);
      setNotice(t("ready"));

      const configResponse = await fetch("/api/shabbat-times-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "save-config",
          templateId: selectedTemplate.id,
          templateMode: selectedTemplateMode,
          config: {
            fields: { ...savedFields, ...form, ...times, officeTimes: serializeOfficeLines(officeLines) },
            officeTimes: serializeOfficeLines(officeLines),
            draftSourceMediaId: data.mediaId,
            outputLocale,
            postText: buildCaption({ ...form, ...times }, outputLocale, offices),
            scheduleMode: "notification",
            channels: publishChannels,
          },
        }),
      });
      if (!configResponse.ok) setNotice(tn("savedConfigFailed"));
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : tx("generationError"));
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPoster() {
    if (!resultImageUrl) return;
    setError("");
    try {
      const response = await fetch(resultImageUrl);
      if (!response.ok) throw new Error("download");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `horaires-chabbat-${form.city.trim().replace(/\s+/g, "-").toLowerCase() || "affiche"}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setNotice(tx("downloaded"));
    } catch {
      window.open(resultImageUrl, "_blank", "noopener,noreferrer");
      setNotice(tx("opened"));
    }
  }

  function togglePublishChannel(channel: string) {
    if (!connectedChannels.has(channel)) return;
    setPublishChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  }

  async function publishPoster() {
    if (!resultImageUrl || publishing) return;
    if (publishChannels.length === 0) {
      setError(tx("selectNetwork"));
      return;
    }
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/shabbat-times-auto/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: buildCaption(form, outputLocale, selectedTemplateMode === "detailed" ? formatOfficeLines(officeLines, form, outputLocale) : []), imageUrl: resultImageUrl, channels: publishChannels }),
      });
      const data = await response.json().catch(() => ({})) as {
        successfulChannels?: string[];
        results?: PublishResult[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? tx("publishError"));
      const names = (data.successfulChannels ?? []).map((channel) => channel === "FACEBOOK" ? "Facebook" : "Instagram");
      setNotice(names.length ? `Affiche publiée sur ${names.join(" et ")}.` : "Publication lancée.");
      const successfulResults = (data.results ?? []).filter((result) => result.success);
      if (successfulResults.length > 0) setPublishSuccessResults(successfulResults);
      if (successfulResults.length && sourceMediaId) {
        const saved = await fetch("/api/shabbat-times-auto/config", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "save-config", templateId: selectedTemplate?.id, config: { outputLocale, fields: { ...savedFields, ...form }, sourceMediaId, draftSourceMediaId: sourceMediaId, scheduleMode: "notification" } }),
        });
        if (!saved.ok) setNotice(tn("publishedRefFailed"));
      }
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : tx("publishError"));
    } finally {
      setPublishing(false);
    }
  }

  async function activateAutomation() {
    if (!selectedTemplate || savingAutomation) return;
    setSavingAutomation(true);
    setError("");
    try {
      const response = await fetch("/api/shabbat-times-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "activate",
          templateId: selectedTemplate.id,
          templateMode: selectedTemplateMode,
          config: {
            outputLocale,
            fields: { ...savedFields, ...form },
            sourceMediaId: resultImageUrl ? sourceMediaId : savedPoster.sourceMediaId,
            postText: buildCaption(form, outputLocale, selectedTemplateMode === "detailed" ? formatOfficeLines(officeLines, form, outputLocale) : []),
            notificationDay: "Vendredi",
            notificationDayOfWeek: 5,
            notificationTime: automationTime,
            scheduleMode: "notification",
            channels: publishChannels.length ? publishChannels : ["FACEBOOK", "INSTAGRAM"],
          },
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? tx("activationError"));
      setAutomationActive(true);
      setAutomationOpen(false);
      setNotice(tn("reminderEnabled", { time: automationTime }));
    } catch (automationError) {
      setError(automationError instanceof Error ? automationError.message : tx("activationError"));
    } finally {
      setSavingAutomation(false);
    }
  }

  return (
    <div dir={locale === "he" ? "rtl" : "ltr"} className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 text-start sm:px-6 sm:pt-7">
      <div className="mb-5"><ScheduleHubNav active="shabbat" /></div>
      <header className="relative overflow-hidden rounded-[2rem] bg-[#421388] px-5 py-7 text-white shadow-[0_22px_55px_rgba(66,19,136,0.24)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-8 -top-10 size-44 rounded-full border border-white/10 bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-20 right-24 size-52 rounded-full border border-white/10" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <Clock3 className="size-6" />
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{t("create")}</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-violet-100 sm:text-base">{t("intro")}</p>
        </div>
      </header>

      <section className="mt-7">
        {savedPoster.selectedTemplateId ? <Button variant="outline" className="mb-4 rounded-xl font-black text-violet-700" onClick={() => { const template = templates.find((item) => item.id === savedPoster.selectedTemplateId); if (template) { openTemplate(template); void refreshShabbatTimes(); } }}><Edit3 className="me-2 size-4" />{t("resume")}</Button> : null}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{t("choosePoster")}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {templateCounts.simple} sans offices · {templateCounts.withOffices} avec offices
            </p>
          </div>
          <span className="hidden rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-[#421388] sm:inline-flex">
            {templates.length} modèle{templates.length > 1 ? "s" : ""}
          </span>
        </div>

        <ScheduleTemplateGallery
          templates={templates}
          isPaid={isPaid}
          onSelect={openTemplate}
          emptyTitle={t("noPoster")}
          emptyHelp={t("noPosterHelp")}
          lockedLabel={t("locked")}
          variantLabel={(template) => {
            const withOffices = inferShabbatTimesVariant(template) === "with-offices";
            return { label: withOffices ? tx("withServices") : tx("simpleTimes"), className: withOffices ? "bg-[#421388]/95 text-white" : "bg-emerald-50/95 text-emerald-800" };
          }}
        />
      </section>

      {selectedTemplate && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !generating && !publishing) setSelectedTemplate(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="shabbat-dialog-title"
            className="max-h-[94dvh] w-full max-w-5xl overflow-y-auto rounded-t-[2rem] bg-slate-50 shadow-2xl sm:max-h-[92vh] sm:rounded-[2rem]"
          >
            <SchedulePosterDialogHeader titleId="shabbat-dialog-title" busy={generating || publishing} eyebrow={t("title")} title={resultImageUrl ? t("ready") : t("customize")} closeLabel={tx("close")} onClose={() => setSelectedTemplate(null)} headerVisual={<>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={DAVID_AUTOMATION_IMAGE_URL} alt="David" className="h-full w-full object-contain object-bottom drop-shadow-[0_12px_18px_rgba(66,19,136,0.22)]" /></>} />

            <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <OutputLocalePicker value={outputLocale} onChange={(value) => { setOutputLocale(value); void refreshShabbatTimes(form.city); }} label={t("outputLanguage")} help={t("outputHelp")} frLabel={t("fr")} heLabel={t("he")} />
                {!resultImageUrl ? (
                  <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{t("posterInfo")}</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{t("autoUpdate")}</p>
                      </div>
                      {loadingTimes ? <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black text-[#421388]">{t("updating")}</span> : null}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label={tx("structureName")} value={form.structureName} onChange={(value) => updateForm("structureName", value)} placeholder={tp("structure")} required icon={Edit3} />
                      <Field label={tx("city")} value={form.city} onChange={(value) => updateForm("city", value)} placeholder={tp("city")} required icon={MapPin} />
                    </div>

                    <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#421388]">{t("prefilled")}</p>
                        {loadingTimes ? <Loader2 className="size-4 animate-spin text-[#421388]" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[
                          [t("parasha"), form.parasha || "—"],
                          [t("entry"), form.entry || "—"],
                          [t("exit"), form.exit || "—"],
                        ].map(([label, value]) => (
                          <div key={label} className="min-w-0 rounded-xl bg-white px-2.5 py-2 text-center shadow-sm ring-1 ring-violet-100">
                            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
                            <p className="mt-1 truncate text-xs font-black text-slate-900 sm:text-sm">{value}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] font-bold text-violet-800">
                        {weekDate ? `${format.dateTime(new Date(`${weekDate}T12:00:00Z`), { timeZone: "UTC" })} · ${form.city}` : t("updating")}
                      </p>
                      {cityCandidates.map((city) => <Button key={city} type="button" variant="outline" className="mt-2" onClick={() => void refreshShabbatTimes(city)}>{city}</Button>)}
                    </div>

                    {selectedTemplateMode === "detailed" ? <OfficeTimesEditor lines={officeLines} onChange={setOfficeLines} entry={form.entry} exit={form.exit} outputLocale={outputLocale} /> : null}

                    <details className="group mt-4 rounded-2xl border border-slate-200 bg-slate-50 open:bg-white">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-slate-800">
                        <span className="flex items-center gap-2"><Sparkles className="size-4 text-[#421388]" />{t("addKiddush")}</span>
                        <span className="text-lg text-slate-400 transition group-open:rotate-45">+</span>
                      </summary>
                      <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3">
                        <Field label={tx("kiddushOptional")} value={form.kiddouch} onChange={(value) => updateForm("kiddouch", value)} placeholder={tp("family")} icon={Gift} />
                        <label className="block text-sm font-bold text-slate-800">
                          <span className="flex items-center gap-2"><MessageSquareText className="size-4 text-[#421388]" />{t("aiInstruction")}</span>
                          <textarea
                            value={form.aiInstructions}
                            onChange={(event) => updateForm("aiInstructions", event.target.value)}
                            maxLength={800}
                            rows={3}
                            placeholder={tp("instruction")}
                            className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-5 text-slate-950 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#421388] focus:ring-4 focus:ring-violet-100"
                          />
                          <span className="mt-1 block text-right text-[10px] font-bold text-slate-400">{form.aiInstructions.length}/800</span>
                        </label>
                      </div>
                    </details>
                    <CommunityLogoPicker value={form.logoUrl || null} onChange={(url) => updateForm("logoUrl", url)} onBusyChange={setUploadingLogo} onError={setError} />

                    <Button type="button" size="xl" className="mt-5 w-full rounded-2xl bg-[#d92d7c] font-black shadow-lg shadow-pink-950/20 hover:bg-[#c5236e]" loading={generating} disabled={uploadingLogo || loadingTimes || generating} onClick={() => void generatePoster()}>
                      {!generating && <Sparkles className="size-5" />}
                      {generating ? t("generating") : t("generate")}
                    </Button>
                    {selectedTemplate.canvaUrl ? <CanvaCustomizeLink templateId={selectedTemplate.id} label={t("canva")} help={t("canvaHelp")} /> : null}
                  </div>
                ) : (
                  <div>
                    <PosterResultActions onEdit={() => { setResultImageUrl(null); setNotice(""); }} onDownload={() => void downloadPoster()} editLabel={tx("edit")} downloadLabel={tx("download")} />
                  </div>
                )}

                <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm"><Clock3 className="size-5" /></span>
                    <div>
                      <h3 className="font-black text-slate-950">{t("weeklyReminder")}</h3>
                    </div>
                  </div>
                  {automationActive ? (
                    <p className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700"><CheckCircle2 className="size-4" />{t("reminderActive")}</p>
                  ) : automationOpen ? (
                    <div className="mt-3 rounded-2xl bg-white p-3">
                      <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                        {tx("reminderTime")}
                        <input type="time" value={automationTime} onChange={(event) => setAutomationTime(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-400" />
                      </label>
                      <Button type="button" className="mt-3 w-full rounded-xl bg-amber-500 font-black text-white hover:bg-amber-600" loading={savingAutomation} onClick={() => void activateAutomation()}>
                        Activer avec validation
                      </Button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAutomationOpen(true)} className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-black text-amber-700 transition hover:bg-amber-100">
                      {tx("activateReminder")}
                    </button>
                  )}
                </div>

                {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
                {notice && <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="size-5 shrink-0" />{notice}</p>}
              </div>

              <aside className="space-y-4">
                {resultImageUrl && (
                  <>
                    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-950">{t("publishNow")}</h3>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{t("selectAccounts")}</p>
                        </div>
                        <Send className="size-5 text-[#421388]" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {[
                          { id: "FACEBOOK", label: "Facebook", icon: FacebookMark },
                          { id: "INSTAGRAM", label: "Instagram", icon: InstagramMark },
                        ].map(({ id, label, icon: Icon }) => {
                          const connected = connectedChannels.has(id);
                          const active = publishChannels.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              disabled={!connected}
                              onClick={() => togglePublishChannel(id)}
                              className={cn(
                                "relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-xs font-black transition",
                                active && id === "FACEBOOK" && "border-blue-400 bg-gradient-to-r from-[#315ecb] to-[#4b7fe8] text-white shadow-md shadow-blue-200",
                                active && id === "INSTAGRAM" && "border-pink-400 bg-gradient-to-r from-[#d92d7c] to-[#f06b45] text-white shadow-md shadow-rose-200",
                                !active && "border-slate-200 bg-white text-slate-600",
                                !connected && "cursor-not-allowed bg-slate-50 text-slate-400 opacity-70"
                              )}
                            >
                              {active && <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white text-[#d92d7c]"><Check className="size-3" /></span>}
                              <span className={cn("flex size-9 items-center justify-center rounded-xl", active ? "bg-white" : "bg-slate-50", id === "FACEBOOK" ? "text-[#2364d2]" : "text-[#d12d7e]")}><Icon className="size-5" /></span>
                              {label}
                              {!connected && <span className="text-[9px] font-bold">{t("notConnected")}</span>}
                            </button>
                          );
                        })}
                      </div>
                      <Button type="button" className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] font-black shadow-md shadow-rose-200 hover:brightness-105" loading={publishing} disabled={publishChannels.length === 0} onClick={() => void publishPoster()}>
                        {!publishing && <Send className="size-4" />}
                        Publier
                      </Button>
                    </div>

                  </>
                )}
              </aside>
            </div>

            <div className="border-t border-violet-100 bg-white/55 px-4 pb-7 pt-6 sm:px-6 sm:pb-8">
              <div className="mx-auto max-w-sm">
                <SchedulePosterPreview template={selectedTemplate} imageUrl={resultImageUrl} alt="Affiche personnalisée des horaires de Chabbat" />
              </div>
            </div>
          </section>
        </div>
      )}

      <ScheduleSubscribeDialog open={paywallOpen} onClose={() => setPaywallOpen(false)} title={t("premium")} text={t("premiumHelp")} cta={t("discoverPlan")} closeLabel={tx("close")} />

      {publishSuccessResults ? (
        <ShabbatPublishSuccessDialog
          results={publishSuccessResults}
          onClose={() => setPublishSuccessResults(null)}
        />
      ) : null}
    </div>
  );
}
