"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  Download,
  Edit3,
  ImageIcon,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { DAVID_AUTOMATION_IMAGE_URL } from "@/components/automations/automation-design-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database.types";

type Template = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  isPremium: boolean;
};

type Community = {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  plan: string;
};

type Shabbat = {
  parasha: string | null;
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
  logoUrl: string;
};

type Props = {
  templates: Template[];
  community: Community;
  shabbat: Shabbat;
  initialAutomation: InitialAutomation;
  socialChannels: SocialChannel[];
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

function buildCaption(fields: FormState) {
  const lines = [
    `Chabbat Chalom de la part de ${fields.structureName}.`,
    fields.parasha ? `Paracha : ${fields.parasha}` : "",
    `Entrée de Chabbat : ${fields.entry}`,
    `Sortie de Chabbat : ${fields.exit}`,
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

function IphonePosterPreview({ template, imageUrl }: { template: Template; imageUrl?: string | null }) {
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

function TemplateImage({ template, className }: { template: Template; className?: string }) {
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
  placeholder,
  required = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
}: Props) {
  const savedFields = useMemo(() => savedPosterFields(initialAutomation), [initialAutomation]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    structureName: stringValue(savedFields.structureName) || community.name,
    city: stringValue(savedFields.city) || community.city || "",
    parasha: stringValue(savedFields.parasha) || shabbat?.parasha || "",
    entry: "",
    exit: "",
    logoUrl: stringValue(savedFields.logoUrl) || community.logoUrl || "",
  }));
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [automationOpen, setAutomationOpen] = useState(false);
  const [automationTime, setAutomationTime] = useState("10:00");
  const [automationActive, setAutomationActive] = useState(Boolean(initialAutomation?.isActive));
  const [savingAutomation, setSavingAutomation] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const isPaid = community.plan !== "FREE_TRIAL";

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
      if (event.key === "Escape" && !generating && !publishing) setSelectedTemplate(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [generating, publishing, selectedTemplate]);

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setNotice("");
  }

  function openTemplate(template: Template, index: number) {
    if (!isPaid && index > 0) {
      setPaywallOpen(true);
      return;
    }
    setSelectedTemplate(template);
    setResultImageUrl(null);
    setAutomationOpen(false);
    setError("");
    setNotice("");
  }

  async function uploadLogo(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choisissez un fichier image pour le logo.");
      return;
    }
    setUploadingLogo(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads/community-logo", { method: "POST", body });
      const data = await response.json().catch(() => ({})) as { logoUrl?: string; error?: string };
      if (!response.ok || !data.logoUrl) throw new Error(data.error ?? "Téléversement impossible.");
      updateForm("logoUrl", data.logoUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Téléversement du logo impossible.");
    } finally {
      setUploadingLogo(false);
    }
  }

  function validateForm() {
    if (!form.structureName.trim()) return "Indiquez le nom de la structure.";
    if (!form.city.trim()) return "Indiquez la ville.";
    if (!form.parasha.trim()) return "Indiquez la paracha.";
    if (!form.entry.trim()) return "Indiquez l’heure d’entrée de Chabbat.";
    if (!form.exit.trim()) return "Indiquez l’heure de sortie de Chabbat.";
    return "";
  }

  async function generatePoster() {
    if (!selectedTemplate || generating) return;
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const textBlocks = [
        { id: "structure", text: form.structureName.trim(), role: "organization", priority: "main" },
        { id: "city", text: form.city.trim(), role: "location", priority: "complementary" },
        { id: "parasha", text: form.parasha.trim(), role: "parasha", priority: "main" },
        { id: "entry", text: form.entry.trim(), role: "entry time", priority: "important" },
        { id: "exit", text: form.exit.trim(), role: "exit time", priority: "important" },
      ];
      const response = await fetch("/api/templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate.id, textBlocks, logoUrl: form.logoUrl || null }),
      });
      const data = await response.json().catch(() => ({})) as { imageUrl?: string; error?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.error ?? "L’affiche n’a pas pu être créée.");
      setResultImageUrl(data.imageUrl);
      setNotice("Votre affiche est prête.");

      void fetch("/api/shabbat-times-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "save-config",
          templateId: selectedTemplate.id,
          templateMode: "simple",
          config: {
            fields: form,
            postText: buildCaption(form),
            scheduleMode: "notification",
            channels: publishChannels,
          },
        }),
      }).catch(() => undefined);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "L’affiche n’a pas pu être créée.");
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
      setNotice("Affiche téléchargée.");
    } catch {
      window.open(resultImageUrl, "_blank", "noopener,noreferrer");
      setNotice("L’affiche a été ouverte pour être enregistrée.");
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
      setError("Sélectionnez au moins un réseau connecté.");
      return;
    }
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/shabbat-times-auto/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: buildCaption(form), imageUrl: resultImageUrl, channels: publishChannels }),
      });
      const data = await response.json().catch(() => ({})) as { successfulChannels?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Publication impossible.");
      const names = (data.successfulChannels ?? []).map((channel) => channel === "FACEBOOK" ? "Facebook" : "Instagram");
      setNotice(names.length ? `Affiche publiée sur ${names.join(" et ")}.` : "Publication lancée.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Publication impossible.");
    } finally {
      setPublishing(false);
    }
  }

  async function activateAutomation() {
    if (!selectedTemplate || !resultImageUrl || savingAutomation) return;
    setSavingAutomation(true);
    setError("");
    try {
      const response = await fetch("/api/shabbat-times-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "activate",
          templateId: selectedTemplate.id,
          templateMode: "simple",
          config: {
            fields: form,
            postText: buildCaption(form),
            notificationDay: "Vendredi",
            notificationDayOfWeek: 5,
            notificationTime: automationTime,
            scheduleMode: "notification",
            channels: publishChannels.length ? publishChannels : ["FACEBOOK", "INSTAGRAM"],
          },
        }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Activation impossible.");
      setAutomationActive(true);
      setAutomationOpen(false);
      setNotice(`Rappel hebdomadaire activé chaque vendredi à ${automationTime}, avec validation avant publication.`);
    } catch (automationError) {
      setError(automationError instanceof Error ? automationError.message : "Activation impossible.");
    } finally {
      setSavingAutomation(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 sm:px-6 sm:pt-7">
      <header className="relative overflow-hidden rounded-[2rem] bg-[#421388] px-5 py-7 text-white shadow-[0_22px_55px_rgba(66,19,136,0.24)] sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-8 -top-10 size-44 rounded-full border border-white/10 bg-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-20 right-24 size-52 rounded-full border border-white/10" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <Clock3 className="size-6" />
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Créez votre affiche des horaires de Chabbat</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-violet-100 sm:text-base">
            Choisissez une affiche, saisissez vos horaires et obtenez un visuel prêt à télécharger ou à publier.
          </p>
        </div>
      </header>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Choisissez votre affiche</h2>
            <p className="mt-1 text-sm text-slate-500">Sélectionnez simplement le visuel qui vous plaît.</p>
          </div>
          <span className="hidden rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-[#421388] sm:inline-flex">
            {templates.length} modèle{templates.length > 1 ? "s" : ""}
          </span>
        </div>

        {templates.length === 0 ? (
          <div className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <ImageIcon className="mx-auto size-10 text-slate-300" />
            <p className="mt-3 font-black text-slate-900">Aucune affiche de Chabbat disponible</p>
            <p className="mt-1 text-sm text-slate-500">Activez au moins un modèle Chabbat dans le Super Admin.</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((template, index) => {
              const locked = !isPaid && index > 0;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => openTemplate(template, index)}
                  className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-1.5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-950/10"
                >
                  <div className="relative aspect-square overflow-hidden rounded-[1.2rem] bg-slate-100">
                    <TemplateImage template={template} className="h-full w-full transition duration-300 group-hover:scale-[1.02]" />
                    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-sm backdrop-blur">
                      {index === 0 ? "Offert" : "Premium"}
                    </span>
                    {locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/48 backdrop-blur-[1px]">
                        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-black text-[#421388] shadow-xl">
                          <Crown className="size-4 text-amber-500" /> Premium
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2 py-3">
                    <span className="line-clamp-1 text-sm font-black text-slate-900">{template.name}</span>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#421388] transition group-hover:bg-[#421388] group-hover:text-white">
                      {locked ? <Crown className="size-4" /> : <Sparkles className="size-4" />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
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
            <div className="sticky top-0 z-20 flex items-center gap-4 border-b border-violet-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
              <div className="relative flex h-28 w-24 shrink-0 items-end justify-center rounded-[1.5rem] bg-violet-50 ring-1 ring-violet-100 sm:h-32 sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={DAVID_AUTOMATION_IMAGE_URL} alt="David" className="h-full w-full object-contain object-bottom drop-shadow-[0_12px_18px_rgba(66,19,136,0.22)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#421388]">
                  <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  Conversation avec David
                </p>
                <h2 id="shabbat-dialog-title" className="truncate text-lg font-black text-slate-950">
                  {resultImageUrl ? "Votre affiche est prête" : "Personnalisez votre affiche"}
                </h2>
                <p className="mt-0.5 hidden text-xs font-semibold text-slate-500 sm:block">Votre assistant IA vous accompagne en direct.</p>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setSelectedTemplate(null)}
                disabled={generating || publishing}
                className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <div className="lg:hidden">
                  <IphonePosterPreview template={selectedTemplate} imageUrl={resultImageUrl} />
                </div>
                {!resultImageUrl ? (
                  <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#421388] text-white shadow-md shadow-violet-200">
                        <Sparkles className="size-4" />
                      </span>
                      <div className="rounded-2xl rounded-tl-sm bg-violet-50 px-4 py-3 text-sm font-semibold leading-6 text-violet-950 ring-1 ring-violet-100">
                        <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[#421388]">David</p>
                        <p>Donnez-moi les informations ci-dessous et je les adapterai harmonieusement à votre affiche.</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field label="Nom de la structure" value={form.structureName} onChange={(value) => updateForm("structureName", value)} placeholder="Ex. Beth Habad" required icon={Edit3} />
                      <Field label="Ville" value={form.city} onChange={(value) => updateForm("city", value)} placeholder="Ex. Paris" required icon={MapPin} />
                      <Field label="Paracha" value={form.parasha} onChange={(value) => updateForm("parasha", value)} placeholder="Ex. Ekev" required icon={Sparkles} />
                      <div className="hidden sm:block" />
                      <Field label="Entrée de Chabbat" value={form.entry} onChange={(value) => updateForm("entry", value)} placeholder="Ex. 20:42" required icon={Clock3} />
                      <Field label="Sortie de Chabbat" value={form.exit} onChange={(value) => updateForm("exit", value)} placeholder="Ex. 21:51" required icon={Clock3} />
                    </div>

                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-left transition hover:border-violet-400 hover:bg-violet-50"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {form.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : <Upload className="size-5 text-slate-400" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-slate-900">Logo de la structure</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{uploadingLogo ? "Téléversement en cours…" : "Touchez pour ajouter ou remplacer le logo"}</span>
                      </span>
                      {uploadingLogo ? <Loader2 className="size-5 animate-spin text-[#421388]" /> : <Upload className="size-5 text-[#421388]" />}
                      <input ref={logoInputRef} type="file" accept="image/*" className="sr-only" onChange={(event) => void uploadLogo(event.target.files?.[0])} />
                    </button>

                    <Button type="button" size="xl" className="mt-5 w-full rounded-2xl bg-[#d92d7c] font-black shadow-lg shadow-pink-950/20 hover:bg-[#c5236e]" loading={generating} onClick={() => void generatePoster()}>
                      {!generating && <Sparkles className="size-5" />}
                      {generating ? "David personnalise l’affiche…" : "Créer mon affiche avec David"}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => { setResultImageUrl(null); setNotice(""); }} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-blue-400 bg-gradient-to-r from-[#315ecb] to-[#4b7fe8] p-3 text-sm font-black text-white shadow-md shadow-blue-200 transition hover:-translate-y-0.5 hover:brightness-105">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#2364d2] shadow-sm"><Edit3 className="size-5" /></span>
                        Modifier
                      </button>
                      <button type="button" onClick={() => void downloadPoster()} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-pink-400 bg-gradient-to-r from-[#d92d7c] to-[#f06b45] p-3 text-sm font-black text-white shadow-md shadow-rose-200 transition hover:-translate-y-0.5 hover:brightness-105">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#d12d7e] shadow-sm"><Download className="size-5" /></span>
                        Télécharger
                      </button>
                    </div>
                  </div>
                )}

                {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}
                {notice && <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="size-5 shrink-0" />{notice}</p>}
              </div>

              <aside className="space-y-4">
                <div className="hidden lg:block">
                  <IphonePosterPreview template={selectedTemplate} imageUrl={resultImageUrl} />
                </div>

                {resultImageUrl && (
                  <>
                    <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-950">Publier maintenant</h3>
                          <p className="mt-1 text-xs leading-5 text-slate-500">Sélectionnez vos comptes connectés.</p>
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
                              {!connected && <span className="text-[9px] font-bold">Non connecté</span>}
                            </button>
                          );
                        })}
                      </div>
                      <Button type="button" className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] font-black shadow-md shadow-rose-200 hover:brightness-105" loading={publishing} disabled={publishChannels.length === 0} onClick={() => void publishPoster()}>
                        {!publishing && <Send className="size-4" />}
                        Publier
                      </Button>
                    </div>

                    <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm"><Clock3 className="size-5" /></span>
                        <div>
                          <h3 className="font-black text-slate-950">Chaque semaine avec David</h3>
                          <p className="mt-1 text-xs leading-5 text-slate-600">Recevez l’affiche préparée le vendredi et validez-la avant publication.</p>
                        </div>
                      </div>
                      {automationActive ? (
                        <p className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700"><CheckCircle2 className="size-4" />Rappel hebdomadaire actif</p>
                      ) : automationOpen ? (
                        <div className="mt-3 rounded-2xl bg-white p-3">
                          <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Heure du rappel le vendredi
                            <input type="time" value={automationTime} onChange={(event) => setAutomationTime(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-900 outline-none focus:border-amber-400" />
                          </label>
                          <Button type="button" className="mt-3 w-full rounded-xl bg-amber-500 font-black text-white hover:bg-amber-600" loading={savingAutomation} onClick={() => void activateAutomation()}>
                            Activer avec validation
                          </Button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAutomationOpen(true)} className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-black text-amber-700 transition hover:bg-amber-100">
                          Activer le rappel hebdomadaire
                        </button>
                      )}
                    </div>
                  </>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}

      {paywallOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl">
            <button type="button" aria-label="Fermer" onClick={() => setPaywallOpen(false)} className="ml-auto flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500"><X className="size-5" /></button>
            <span className="mx-auto mt-2 flex size-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600"><Crown className="size-8" /></span>
            <h2 className="mt-5 text-2xl font-black text-slate-950">Modèle Premium</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Le premier modèle est offert. Passez à l’abonnement EasyCom IA pour accéder à toutes les affiches.</p>
            <Button asChild className="mt-6 w-full rounded-2xl bg-[#421388] font-black hover:bg-[#35106f]">
              <a href="/dashboard/settings/billing">Découvrir l’abonnement</a>
            </Button>
            <button type="button" onClick={() => setPaywallOpen(false)} className="mt-3 text-sm font-bold text-slate-500 hover:text-slate-900">Continuer avec le modèle offert</button>
          </div>
        </div>
      )}
    </div>
  );
}
