"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Edit3,
  ExternalLink,
  History,
  ImagePlus,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/layout/dashboard-nav";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";

const AGENTS = [
  {
    name: "Dov",
    label: "Réseaux sociaux",
    image: AGENT_IMAGE_URLS.dovBer,
  },
];

const NETWORKS = [
  {
    type: "FACEBOOK",
    label: "Facebook",
    href: "/dashboard/facebook",
    icon: FacebookIcon,
    color: "text-[#2364d2]",
    surface: "bg-gradient-to-r from-[#315ecb] to-[#4b7fe8]",
    border: "border-blue-400",
    selectedShadow: "shadow-md shadow-blue-200",
  },
  {
    type: "INSTAGRAM",
    label: "Instagram",
    href: "/dashboard/instagram",
    icon: InstagramIcon,
    color: "text-[#d12d7e]",
    surface: "bg-gradient-to-r from-[#d92d7c] to-[#f06b45]",
    border: "border-pink-400",
    selectedShadow: "shadow-md shadow-rose-200",
  },
  {
    type: "WHATSAPP",
    label: "WhatsApp",
    href: "/dashboard/whatsapp",
    icon: WhatsAppIcon,
    color: "text-[#128153]",
    surface: "bg-gradient-to-r from-[#15966a] to-[#2bbf87]",
    border: "border-emerald-400",
    selectedShadow: "shadow-md shadow-emerald-200",
  },
] as const;

type NetworkType = (typeof NETWORKS)[number]["type"];
type RepeatFrequency = "once" | "daily" | "weekly" | "monthly" | "custom";
type ImmediatePublishResult = {
  success?: boolean;
  externalId?: string;
  externalUrl?: string | null;
  error?: string;
  fallbackUsed?: boolean;
};

const WEEK_DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
] as const;

type Channel = {
  id: string;
  type: NetworkType;
  name: string | null;
  handle: string | null;
  isConnected: boolean;
  isActive: boolean;
};

type WhatsAppContact = {
  id: string;
  displayName: string;
  phone: string | null;
  tags: string[] | null;
  optInWhatsapp: boolean;
};

type Publication = {
  id: string;
  draftId: string | null;
  channelType: NetworkType;
  content: string;
  scheduledAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  mediaUrls: string[] | null;
};

type SocialNetworksData = {
  channels: Channel[];
  whatsappContacts: WhatsAppContact[];
  publications: Publication[];
};

type HistoryItem = {
  key: string;
  ids: string[];
  content: string;
  date: string | null;
  createdAt: string;
  status: string;
  networks: NetworkType[];
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: "Programme",
    PUBLISHED: "Envoye",
    PUBLISHING: "En cours",
    PENDING: "En attente",
    FAILED: "Echoue",
    CANCELLED: "Annule",
    FALLBACK_READY: "Pret a copier",
  };
  return labels[status] ?? status;
}

function historyBadgeVariant(status: string) {
  if (status === "PUBLISHED") return "published";
  if (status === "SCHEDULED") return "scheduled";
  if (status === "FAILED") return "failed";
  if (status === "CANCELLED") return "archived";
  return "secondary";
}

function groupPublications(publications: Publication[]): HistoryItem[] {
  const groups = new Map<string, HistoryItem>();

  for (const publication of publications) {
    const key = publication.draftId
      ? `${publication.draftId}:${publication.scheduledAt ?? "immediate"}`
      : publication.id;
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(publication.id);
      existing.networks.push(publication.channelType);
      if (publication.status === "FAILED") existing.status = "FAILED";
      if (publication.status === "SCHEDULED" && existing.status !== "FAILED") existing.status = "SCHEDULED";
      continue;
    }

    groups.set(key, {
      key,
      ids: [publication.id],
      content: publication.content,
      date: publication.scheduledAt,
      createdAt: publication.createdAt,
      status: publication.status,
      networks: [publication.channelType],
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aDate = new Date(a.date ?? a.createdAt).getTime();
    const bDate = new Date(b.date ?? b.createdAt).getTime();
    return bDate - aDate;
  });
}

function formatDate(value: string | null) {
  if (!value) return "Publication immediate";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SocialNetworksBanner() {
  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-white/20 bg-[#d92d7c] p-4 text-white shadow-[0_20px_50px_-30px_rgba(217,45,124,0.58)] md:rounded-[1.75rem] md:p-8 md:shadow-[0_28px_80px_-34px_rgba(217,45,124,0.58)]">
      <div className="relative flex min-h-[9rem] items-center gap-2 text-left md:grid md:min-h-0 md:gap-8 md:text-center lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:text-left">
        <div className="min-w-0 max-w-3xl flex-1">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-white/80 md:mx-auto md:mb-4 md:w-12 lg:mx-0" />
          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/90 md:inline-flex">
            <Share2 className="size-3.5" />
            Reseaux sociaux
          </div>
          <h1 className="text-[clamp(1.45rem,7vw,1.85rem)] font-black leading-[1.04] tracking-[-0.035em] text-white md:mt-3 md:text-4xl md:leading-tight">Publiez partout, depuis un seul espace</h1>
          <p className="mx-auto mt-3 hidden max-w-2xl text-base font-medium leading-6 text-white/85 md:block lg:mx-0">
            Préparez votre message avec l&apos;IA, ajoutez un visuel et diffusez-le sur Facebook, Instagram et WhatsApp au bon moment.
          </p>
        </div>

        <div className="relative flex w-[6.25rem] shrink-0 items-end justify-center self-stretch md:w-auto md:min-w-[18rem] md:self-auto">
          <div className="pointer-events-none absolute bottom-[16%] left-1/2 aspect-square w-[68%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.68)_0%,rgba(255,255,255,0.2)_44%,transparent_72%)] blur-3xl" aria-hidden />
          {AGENTS.map((agent) => (
            <div key={agent.name} className="relative z-10 flex h-full flex-col items-center justify-end md:h-auto">
              <Image
                src={agent.image}
                alt={`${agent.name}, agent ${agent.label}`}
                width={230}
                height={270}
                className="h-[8.2rem] w-auto object-contain object-bottom drop-shadow-[0_0_18px_rgba(255,255,255,0.36)] drop-shadow-[0_16px_22px_rgba(0,0,0,0.28)] md:h-64 md:drop-shadow-[0_0_26px_rgba(255,255,255,0.46)] md:drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)]"
                priority
              />
              <span className="mt-1 hidden items-center gap-1.5 rounded-full border border-white/60 bg-white/95 px-3 py-1.5 text-[11px] font-black text-slate-800 shadow-[0_8px_18px_rgba(57,15,53,0.22)] backdrop-blur-sm md:inline-flex">
                <Share2 className="size-4 text-[#d92d7c]" aria-hidden="true" />
                {agent.name} · {agent.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialPublishSuccessDialog({
  results,
  onClose,
}: {
  results: Partial<Record<NetworkType, ImmediatePublishResult>>;
  onClose: () => void;
}) {
  const successfulNetworks = NETWORKS.filter((network) => results[network.type]?.success);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="social-publish-success-title" className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white text-center shadow-[0_30px_100px_rgba(15,23,42,0.38)]">
        <div className="h-2 bg-gradient-to-r from-[#315ecb] via-[#d92d7c] to-[#2bbf87]" />
        <button type="button" onClick={onClose} className="absolute right-4 top-5 flex size-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fermer">
          <X className="size-4" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm shadow-emerald-200">
            <CheckCircle2 className="size-9" />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Publication réussie</p>
          <h2 id="social-publish-success-title" className="mt-2 text-2xl font-black text-slate-950">Votre publication a bien été envoyée</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            Elle est maintenant disponible sur {successfulNetworks.length === 1 ? "le réseau sélectionné" : `les ${successfulNetworks.length} réseaux sélectionnés`}.
          </p>

          <div className="mt-6 grid gap-3">
            {successfulNetworks.map((network) => {
              const result = results[network.type];
              const Icon = network.icon;
              const label = network.type === "WHATSAPP" ? "Ouvrir WhatsApp" : `Voir la publication sur ${network.label}`;
              const buttonStyle = network.type === "FACEBOOK"
                ? "bg-[#315ecb] shadow-blue-200 hover:bg-[#274fae]"
                : network.type === "INSTAGRAM"
                  ? "bg-gradient-to-r from-[#d92d7c] to-[#f06b45] shadow-rose-200 hover:brightness-105"
                  : "bg-[#15966a] shadow-emerald-200 hover:bg-[#117c58]";

              return result?.externalUrl ? (
                <a key={network.type} href={result.externalUrl} target="_blank" rel="noopener noreferrer" className={cn("inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl px-4 text-sm font-black text-white shadow-md transition", buttonStyle)}>
                  <Icon className="size-5" />
                  <span>{label}</span>
                  <ExternalLink className="size-4 opacity-80" />
                </a>
              ) : null;
            })}
          </div>

          <Button type="button" variant="outline" onClick={onClose} className="mt-4 h-11 w-full rounded-2xl border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50">
            Fermer
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
}

function PublishRequirementsDialog({
  issues,
  onClose,
}: {
  issues: string[];
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="publish-requirements-title"
        aria-describedby="publish-requirements-description"
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.38)]"
      >
        <div className="h-1.5 bg-[#d92d7c]" />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-5 flex size-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d92d7c] focus-visible:ring-offset-2"
          aria-label="Fermer la fenêtre"
        >
          <X className="size-5" />
        </button>

        <div className="p-6 sm:p-7">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-[#d92d7c] shadow-sm shadow-rose-100">
            <AlertTriangle className="size-7" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#d92d7c]">
            Publication incomplète
          </p>
          <h2 id="publish-requirements-title" className="mt-2 pr-10 text-2xl font-black text-slate-950">
            Une dernière action est nécessaire
          </h2>
          <p id="publish-requirements-description" className="mt-3 text-sm leading-6 text-slate-600">
            Complétez les éléments suivants avant de publier votre message.
          </p>

          <div className="mt-5 space-y-3">
            {issues.map((issue) => (
              <div key={issue} className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-sm font-bold leading-5 text-slate-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#d92d7c]" />
                <span>{issue}</span>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={onClose}
            className="mt-6 h-12 w-full rounded-2xl bg-[#d92d7c] font-black text-white shadow-md shadow-rose-200 hover:bg-[#bd246d]"
          >
            J&apos;ai compris
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
}

function buildScheduledDates({
  date,
  time,
  frequency,
  endDate,
  days,
}: {
  date: string;
  time: string;
  frequency: RepeatFrequency;
  endDate: string;
  days: number[];
}) {
  if (!date || !time) throw new Error("Choisissez une date et un horaire.");

  const firstDate = new Date(`${date}T${time}:00`);
  if (Number.isNaN(firstDate.getTime()) || firstDate.getTime() <= Date.now()) {
    throw new Error("Choisissez une date et un horaire futurs.");
  }
  if (frequency === "once") return [firstDate.toISOString()];
  if (!endDate) throw new Error("Choisissez une date de fin pour la répétition.");

  const lastDate = new Date(`${endDate}T${time}:00`);
  if (Number.isNaN(lastDate.getTime()) || lastDate < firstDate) {
    throw new Error("La date de fin doit être postérieure à la première publication.");
  }
  if ((frequency === "weekly" || frequency === "custom") && days.length === 0) {
    throw new Error("Choisissez au moins un jour de publication.");
  }

  const dates: string[] = [];
  const cursor = new Date(firstDate);
  while (cursor <= lastDate) {
    const dayMatches = days.includes(cursor.getDay());
    const shouldInclude =
      frequency === "daily" ||
      ((frequency === "weekly" || frequency === "custom") && dayMatches) ||
      (frequency === "monthly" && cursor.getDate() === firstDate.getDate());

    if (shouldInclude) dates.push(cursor.toISOString());
    if (dates.length > 52) throw new Error("La planification est limitée à 52 envois. Réduisez la période choisie.");
    cursor.setDate(cursor.getDate() + 1);
  }

  if (dates.length === 0) throw new Error("Aucune date ne correspond aux paramètres choisis.");
  return dates;
}

function SocialScheduleDialog({
  initialMessage,
  initialMediaUrls,
  initialMediaNames,
  initialNetworks,
  initialContactIds,
  channels,
  contacts,
  onClose,
  onCreate,
}: {
  initialMessage: string;
  initialMediaUrls: string[];
  initialMediaNames: string[];
  initialNetworks: NetworkType[];
  initialContactIds: string[];
  channels: Channel[];
  contacts: WhatsAppContact[];
  onClose: () => void;
  onCreate: (payload: {
    message: string;
    mediaUrls: string[];
    mediaNames: string[];
    networks: NetworkType[];
    contactIds: string[];
    scheduledDates: string[];
  }) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [content, setContent] = useState(initialMessage);
  const [mediaUrls, setDialogMediaUrls] = useState(initialMediaUrls);
  const [mediaNames, setDialogMediaNames] = useState(initialMediaNames);
  const [networks, setNetworks] = useState<NetworkType[]>(initialNetworks);
  const [contactIds, setContactIds] = useState(initialContactIds);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [frequency, setFrequency] = useState<RepeatFrequency>("once");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const channelsByType = useMemo(() => new Map(channels.map((channel) => [channel.type, channel])), [channels]);

  function toggleNetwork(type: NetworkType) {
    setNetworks((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
    setError("");
  }

  function toggleDay(day: number) {
    setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
    setError("");
  }

  async function uploadImages(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError("");
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/attachment", { method: "POST", body: formData });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Importation impossible.");
        if (payload.url) {
          setDialogMediaUrls((current) => [...current, payload.url]);
          setDialogMediaNames((current) => [...current, file.name]);
        }
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Importation impossible.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function createSchedule() {
    const disconnected = networks.filter((type) => {
      const channel = channelsByType.get(type);
      return !channel?.isConnected || !channel?.isActive;
    });

    if (!content.trim()) return setError("Ajoutez un message à publier.");
    if (networks.length === 0) return setError("Choisissez au moins un réseau social.");
    if (disconnected.length > 0) return setError(`Connectez d’abord : ${disconnected.join(", ")}.`);
    if (networks.includes("INSTAGRAM") && mediaUrls.length === 0) return setError("Instagram requiert au moins une image.");
    if (networks.includes("WHATSAPP") && contactIds.length === 0) return setError("Choisissez au moins un contact WhatsApp.");

    setSaving(true);
    setError("");
    try {
      const scheduledDates = buildScheduledDates({ date, time, frequency, endDate, days });
      await onCreate({ message: content.trim(), mediaUrls, mediaNames, networks, contactIds, scheduledDates });
      onClose();
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "Planification impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm sm:py-8">
      <section role="dialog" aria-modal="true" aria-labelledby="social-schedule-title" className="w-full max-w-4xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="social-schedule-title" className="text-xl font-bold text-slate-950">Planifier vos publications multiréseaux</h2>
            <p className="mt-1 text-sm text-slate-500">Vérifiez le contenu préparé : il sera conservé et diffusé exactement aux moments choisis.</p>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Fermer">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <label htmlFor="social-schedule-message" className="mb-2 block text-sm font-semibold text-slate-900">Message préparé</label>
              <textarea id="social-schedule-message" value={content} onChange={(event) => setContent(event.target.value)} rows={7} className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100" />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Images préparées</p>
                <span className="text-xs font-semibold text-slate-500">{mediaUrls.length} image(s)</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void uploadImages(event.target.files)} />
              {mediaUrls.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">Aucune image ajoutée à cette publication.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {mediaUrls.map((url, index) => (
                    <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <Image src={url} alt={mediaNames[index] ?? "Image préparée"} width={220} height={150} className="aspect-[4/3] w-full object-cover" />
                      <button type="button" onClick={() => {
                        setDialogMediaUrls((current) => current.filter((_, itemIndex) => itemIndex !== index));
                        setDialogMediaNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
                      }} className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white/95 text-slate-500 shadow hover:text-rose-600" aria-label="Retirer cette image">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-3 h-10 rounded-xl border-pink-200 text-pink-800 hover:bg-pink-50">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploading ? "Ajout..." : "Ajouter une image"}
              </Button>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Réseaux destinataires</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {NETWORKS.map((network) => {
                  const selected = networks.includes(network.type);
                  const channel = channelsByType.get(network.type);
                  const connected = Boolean(channel?.isConnected && channel?.isActive);
                  const Icon = network.icon;
                  return (
                    <button key={network.type} type="button" onClick={() => toggleNetwork(network.type)} aria-pressed={selected} className={cn("flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-bold transition", selected ? "border-pink-300 bg-pink-50 text-slate-950 ring-2 ring-pink-100" : "border-slate-200 bg-white text-slate-600", !connected && "opacity-60")}>
                      <Icon className={cn("size-5", network.color)} />
                      <span className="min-w-0 flex-1">{network.label}<span className="block text-[10px] font-semibold text-slate-500">{connected ? "Connecté" : "Non connecté"}</span></span>
                      {selected ? <CheckCircle2 className="size-4 text-pink-600" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {networks.includes("WHATSAPP") ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-900">Destinataires WhatsApp</p><span className="text-xs font-semibold text-emerald-700">{contactIds.length} sélectionné(s)</span></div>
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {contacts.map((contact) => (
                    <label key={contact.id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-2.5 text-sm shadow-sm hover:bg-emerald-50">
                      <input type="checkbox" checked={contactIds.includes(contact.id)} onChange={() => setContactIds((current) => current.includes(contact.id) ? current.filter((id) => id !== contact.id) : [...current, contact.id])} className="size-4" />
                      <span className="min-w-0"><span className="block truncate font-bold text-slate-800">{contact.displayName}</span><span className="block text-xs text-slate-500">{contact.phone}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="rounded-2xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] p-4 text-white shadow-md shadow-rose-200">
              <CalendarClock className="size-6" />
              <p className="mt-2 font-black">Choisissez le bon moment</p>
              <p className="mt-1 text-xs leading-5 text-white/85">Chaque occurrence apparaîtra dans l’historique et utilisera le contenu vérifié dans cette fenêtre.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="social-schedule-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Jour</label><input id="social-schedule-date" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => { setDate(event.target.value); setError(""); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-400" /></div>
              <div><label htmlFor="social-schedule-time" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Horaire</label><input id="social-schedule-time" type="time" value={time} onChange={(event) => { setTime(event.target.value); setError(""); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-400" /></div>
            </div>

            <div><label htmlFor="social-schedule-frequency" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Fréquence</label><select id="social-schedule-frequency" value={frequency} onChange={(event) => { setFrequency(event.target.value as RepeatFrequency); setError(""); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-400"><option value="once">Une fois</option><option value="daily">Tous les jours</option><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option><option value="custom">Personnalisée</option></select></div>

            {(frequency === "weekly" || frequency === "custom") ? (
              <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Jours concernés</p><div className="grid grid-cols-4 gap-2">{WEEK_DAYS.map((day) => <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={cn("rounded-xl border px-2 py-2 text-xs font-semibold", days.includes(day.value) ? "border-pink-500 bg-pink-50 text-pink-800" : "border-slate-200 bg-white text-slate-600")}>{day.label}</button>)}</div></div>
            ) : null}

            {frequency !== "once" ? (
              <div><label htmlFor="social-schedule-end-date" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Fin de la répétition</label><input id="social-schedule-end-date" type="date" value={endDate} min={date || new Date().toISOString().slice(0, 10)} onChange={(event) => { setEndDate(event.target.value); setError(""); }} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-400" /></div>
            ) : null}

            {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

            <Button type="button" onClick={() => void createSchedule()} disabled={saving || uploading} className="h-11 w-full rounded-2xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] text-white shadow-md shadow-rose-200 hover:brightness-105">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
              {saving ? "Enregistrement..." : "Enregistrer la planification"}
            </Button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

function EmailComingSoonDialog({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        id="email-coming-soon-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-coming-soon-title"
        aria-describedby="email-coming-soon-description"
        className="animate-fade-in relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.34)]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#8A184D] via-[#d92d7c] to-[#f06b45]" />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-5 flex size-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A184D] focus-visible:ring-offset-2"
          aria-label="Fermer la fenêtre"
        >
          <X className="size-5" />
        </button>

        <div className="p-6 sm:p-7">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-[#8A184D] shadow-sm shadow-rose-100">
            <Mail className="size-7" />
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#8A184D]">
            Bientôt disponible
          </p>
          <h2 id="email-coming-soon-title" className="mt-2 pr-8 text-2xl font-black text-slate-950 sm:text-3xl">
            Diffusez aussi vos communications par email
          </h2>
          <p id="email-coming-soon-description" className="mt-5 text-sm leading-6 text-slate-600 sm:text-[15px]">
            Bientôt, vous pourrez rédiger un seul message, puis le diffuser depuis EasyCom AI sur vos réseaux sociaux et par email. Vous choisirez vos destinataires, et chaque envoi respectera leur consentement ainsi que les bonnes pratiques anti-spam.
          </p>

          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Share2 className="size-4 text-[#8A184D]" />
              Un message, tous vos canaux
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              EasyCom AI vous guidera vers une communication ciblée et responsable, jamais vers des envois non sollicités.
            </p>
          </div>

          <Button
            type="button"
            onClick={onClose}
            className="mt-7 h-11 w-full rounded-2xl bg-[#8A184D] font-bold text-white shadow-sm shadow-rose-200 hover:bg-[#741442]"
          >
            Compris
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
}

export function SocialNetworksClient() {
  const [data, setData] = useState<SocialNetworksData>({ channels: [], whatsappContacts: [], publications: [] });
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaNames, setMediaNames] = useState<string[]>([]);
  const [selectedNetworks, setSelectedNetworks] = useState<NetworkType[]>(["FACEBOOK", "INSTAGRAM", "WHATSAPP"]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [emailComingSoonOpen, setEmailComingSoonOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [publishRequirementIssues, setPublishRequirementIssues] = useState<string[] | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<Partial<Record<NetworkType, ImmediatePublishResult>> | null>(null);
  const [editing, setEditing] = useState<HistoryItem | null>(null);
  const [editText, setEditText] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const contactsSelectionInitialized = useRef(false);

  const channelsByType = useMemo(() => new Map(data.channels.map((channel) => [channel.type, channel])), [data.channels]);
  const history = useMemo(() => groupPublications(data.publications), [data.publications]);
  const selectedDisconnected = selectedNetworks.filter((type) => {
    const channel = channelsByType.get(type);
    return !channel?.isConnected || !channel?.isActive;
  });

  const filteredContacts = useMemo(() => {
    const search = contactSearch.trim().toLowerCase();
    if (!search) return data.whatsappContacts;
    return data.whatsappContacts.filter((contact) => {
      const haystack = [contact.displayName, contact.phone, ...(contact.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search);
    });
  }, [contactSearch, data.whatsappContacts]);

  const whatsappGroups = useMemo(() => {
    const tags = new Set<string>();
    for (const contact of data.whatsappContacts) {
      for (const tag of contact.tags ?? []) {
        if (tag.trim()) tags.add(tag.trim());
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "fr"));
  }, [data.whatsappContacts]);

  const canPublish = Boolean(
    message.trim() &&
      selectedNetworks.length > 0 &&
      selectedDisconnected.length === 0 &&
      !publishing
  );

  const canSchedule = Boolean(
    canPublish &&
      (!selectedNetworks.includes("INSTAGRAM") || mediaUrls.length > 0) &&
      (!selectedNetworks.includes("WHATSAPP") || selectedContacts.length > 0)
  );

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/social-networks");
      const payload = (await response.json()) as SocialNetworksData & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Chargement impossible.");
      setData(payload);
      const availableContactIds = new Set((payload.whatsappContacts ?? []).map((contact) => contact.id));
      setSelectedContacts((current) => {
        if (!contactsSelectionInitialized.current && availableContactIds.size > 0) {
          contactsSelectionInitialized.current = true;
          return Array.from(availableContactIds);
        }
        return current.filter((id) => availableContactIds.has(id));
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function adaptMessage() {
    const source = message.trim();
    if (!source) return;

    setAiLoading(true);
    try {
      const response = await fetch("/api/publishing/instagram/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Adapte ce message pour une publication commune Facebook, Instagram et WhatsApp. Garde un seul texte utilisable partout. Message: ${source}`,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Adaptation IA impossible.");
      setMessage(payload.body ?? "");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Adaptation IA impossible.");
    } finally {
      setAiLoading(false);
    }
  }

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      const uploadedNames: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/attachment", { method: "POST", body: formData });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Upload impossible.");
        if (payload.url) {
          uploadedUrls.push(payload.url);
          uploadedNames.push(file.name);
        }
      }

      setMediaUrls((current) => [...current, ...uploadedUrls]);
      setMediaNames((current) => [...current, ...uploadedNames]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload impossible.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function toggleNetwork(type: NetworkType) {
    setSelectedNetworks((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  function toggleContact(id: string) {
    setSelectedContacts((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleGroup(tag: string) {
    const contactIds = data.whatsappContacts
      .filter((contact) => contact.tags?.includes(tag))
      .map((contact) => contact.id);
    const everySelected = contactIds.every((id) => selectedContacts.includes(id));

    setSelectedContacts((current) => {
      if (everySelected) return current.filter((id) => !contactIds.includes(id));
      return Array.from(new Set([...current, ...contactIds]));
    });
  }

  async function submit(
    publishNow: boolean,
    scheduledPayload?: {
      message: string;
      mediaUrls: string[];
      mediaNames: string[];
      networks: NetworkType[];
      contactIds: string[];
      scheduledDates: string[];
    }
  ) {
    const submittedMessage = scheduledPayload?.message ?? message;
    const submittedMediaUrls = scheduledPayload?.mediaUrls ?? mediaUrls;
    const submittedNetworks = scheduledPayload?.networks ?? selectedNetworks;
    const submittedContactIds = scheduledPayload?.contactIds ?? selectedContacts;
    setPublishing(true);
    try {
      const response = await fetch("/api/social-networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: submittedMessage,
          mediaUrls: submittedMediaUrls,
          channelTypes: submittedNetworks,
          scheduledAt: publishNow ? null : undefined,
          scheduledDates: publishNow ? undefined : scheduledPayload?.scheduledDates,
          whatsappRecipientIds: submittedContactIds,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        publishResults?: Partial<Record<NetworkType, ImmediatePublishResult>>;
      };
      if (!response.ok) throw new Error(payload.error ?? "Publication impossible.");

      if (publishNow) {
        const unconfirmedNetworks = submittedNetworks.filter(
          (network) => payload.publishResults?.[network]?.success !== true
        );
        if (unconfirmedNetworks.length > 0) {
          const details = unconfirmedNetworks
            .map((network) => {
              const result = payload.publishResults?.[network];
              return `${network}: ${result?.error ?? (result?.fallbackUsed ? "envoi manuel requis" : "envoi non confirmé")}`;
            })
            .join(" · ");
          await loadData();
          throw new Error(`La diffusion réelle n'a pas été confirmée sur tous les réseaux. ${details}`);
        }
      }

      if (scheduledPayload) {
        setMessage(scheduledPayload.message);
        setMediaUrls(scheduledPayload.mediaUrls);
        setMediaNames(scheduledPayload.mediaNames);
        setSelectedNetworks(scheduledPayload.networks);
        setSelectedContacts(scheduledPayload.contactIds);
      }
      if (publishNow) {
        setSuccessMessage(null);
        setPublishSuccess(payload.publishResults ?? {});
      } else {
        setSuccessMessage(`${scheduledPayload?.scheduledDates.length ?? 1} envoi(s) programmé(s) avec succès.`);
      }
      await loadData();
    } catch (error) {
      const submitError = error instanceof Error ? error : new Error("Publication impossible.");
      if (publishNow) alert(submitError.message);
      else throw submitError;
    } finally {
      setPublishing(false);
    }
  }

  function publishNow() {
    const issues: string[] = [];

    if (selectedNetworks.includes("INSTAGRAM") && mediaUrls.length === 0) {
      issues.push("Ajoutez au moins une image pour publier sur Instagram.");
    }
    if (selectedNetworks.includes("WHATSAPP") && selectedContacts.length === 0) {
      issues.push("Sélectionnez au moins un contact pour publier sur WhatsApp.");
    }

    if (issues.length > 0) {
      setPublishRequirementIssues(issues);
      return;
    }

    void submit(true);
  }

  async function cancelHistoryItem(item: HistoryItem) {
    setPublishing(true);
    try {
      const response = await fetch(`/api/social-networks?ids=${encodeURIComponent(item.ids.join(","))}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Annulation impossible.");
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Annulation impossible.");
    } finally {
      setPublishing(false);
    }
  }

  function startEdit(item: HistoryItem) {
    setEditing(item);
    setEditText(item.content);
    setEditScheduledAt(item.date ? item.date.slice(0, 16) : "");
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editText.trim()) {
      alert("Le texte ne peut pas etre vide.");
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch("/api/social-networks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicationIds: editing.ids,
          content: editText,
          scheduledAt: editScheduledAt ? new Date(editScheduledAt).toISOString() : editing.date,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Modification impossible.");
      setEditing(null);
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Modification impossible.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <SocialNetworksBanner />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-[0_20px_48px_-32px_rgba(154,33,111,0.22)]">
            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <Button onClick={adaptMessage} disabled={aiLoading || !message.trim()} className="ml-auto h-12 w-full rounded-xl bg-[#d92d7c] text-white shadow-lg shadow-pink-950/25 hover:bg-[#c5236e] sm:w-auto">
                  {aiLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Transformer avec l&apos;IA
                </Button>
              </div>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={8}
                placeholder="Votre publication apparaît ici. Vous pouvez la relire et l’ajuster avant l’envoi."
                className="min-h-[210px] w-full rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-900 placeholder:text-slate-400 shadow-inner shadow-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              />

              <div className="space-y-2.5">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-rose-300 bg-rose-50/60 px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-rose-100">
                    <Upload className="size-4" />
                    {uploading ? "Importation..." : "Ajouter une image"}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={uploadImage} />
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/dashboard/templates"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4a1e91] to-[#6530bd] px-3 text-center text-xs font-black text-white shadow-md shadow-violet-200 transition hover:brightness-110"
                    >
                      <ImagePlus className="size-4 shrink-0" />
                      Banque d&apos;images
                    </Link>
                    <Link
                      href="https://chatgpt.com"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] px-3 text-center text-xs font-black text-white shadow-md shadow-rose-200 transition hover:brightness-110"
                    >
                      <Sparkles className="size-4 shrink-0" />
                      Créer avec l&apos;IA
                    </Link>
                  </div>
              </div>

              {mediaUrls.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {mediaUrls.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <Image src={url} alt={mediaNames[index] ?? "Image importee"} width={320} height={220} className="aspect-[4/3] w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setMediaUrls((current) => current.filter((_, itemIndex) => itemIndex !== index));
                          setMediaNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
                        }}
                        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow hover:bg-white hover:text-rose-600"
                        aria-label="Retirer l'image"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-2xl border border-fuchsia-100 bg-white p-5 shadow-[0_20px_48px_-32px_rgba(154,33,111,0.18)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">Choisissez vos canaux</h2>
                <p className="mt-1 text-sm text-slate-500">Sélectionnez les réseaux qui recevront cette publication.</p>
              </div>
              <Button variant="outline" onClick={loadData} disabled={loading} className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Actualiser
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {NETWORKS.map((network) => {
                const channel = channelsByType.get(network.type);
                const connected = Boolean(channel?.isConnected && channel?.isActive);
                const selected = selectedNetworks.includes(network.type);
                const Icon = network.icon;

                return (
                  <button
                    type="button"
                    key={network.type}
                    onClick={() => toggleNetwork(network.type)}
                    aria-pressed={selected}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-xl border text-left text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d92d7c] focus-visible:ring-offset-2",
                      network.surface,
                      selected
                        ? `${network.border} ${network.selectedShadow}`
                        : "border-transparent opacity-70 shadow-sm"
                    )}
                  >
                    <div className="p-4 pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm", selected ? `border-white ${network.color} shadow-black/15` : `border-white/80 ${network.color}`)}>
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-white">{network.label}</span>
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-white/85">
                            {connected ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                            {connected ? "Connecte" : "Non connecte"}
                          </span>
                        </span>
                      </span>
                      <span className={cn("mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-white bg-white text-[#d92d7c]" : "border-white/70 bg-transparent text-transparent")} aria-hidden>
                        <CheckCircle2 className="size-4" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/20 pt-3">
                      <span className="text-xs font-bold text-white/90">
                        {selected ? "Selectionne pour l'envoi" : "Ajouter a l'envoi"}
                      </span>
                      {!connected ? (
                        <span className="text-xs font-black text-white">Connexion requise</span>
                      ) : null}
                    </div>
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setEmailComingSoonOpen(true)}
                aria-haspopup="dialog"
                aria-controls="email-coming-soon-dialog"
                className="group rounded-xl border border-slate-400 bg-gradient-to-r from-[#64748b] to-[#94a3b8] p-4 text-left text-white shadow-md shadow-slate-200 transition duration-200 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A184D] focus-visible:ring-offset-2 md:col-start-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white bg-white text-slate-700 shadow-sm transition group-hover:scale-105">
                    <Mail className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">Email</span>
                    <span className="mt-1 inline-flex rounded-full bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                      Bientôt disponible
                    </span>
                  </span>
                </div>
                <span className="mt-4 block border-t border-white/20 pt-3 text-xs font-bold text-white/90">
                  Découvrir la fonctionnalité
                </span>
              </button>
            </div>

          </Card>

          {selectedNetworks.includes("WHATSAPP") ? (
            <Card className="rounded-2xl border-slate-200 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950">Contacts WhatsApp</h2>
                  <p className="mt-1 text-sm text-slate-500">Selectionnez les contacts. Les tags servent de groupes simples.</p>
                </div>
                <Badge variant="secondary">{selectedContacts.length} selectionne(s)</Badge>
              </div>

              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={contactSearch}
                  onChange={(event) => setContactSearch(event.target.value)}
                  placeholder="Rechercher un contact ou un tag..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm shadow-inner shadow-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                />
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedContacts(data.whatsappContacts.map((contact) => contact.id))}>
                  Tout cocher
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedContacts([])}>
                  Tout decocher
                </Button>
              </div>

              {whatsappGroups.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {whatsappGroups.map((tag) => {
                    const contactIds = data.whatsappContacts
                      .filter((contact) => contact.tags?.includes(tag))
                      .map((contact) => contact.id);
                    const active = contactIds.length > 0 && contactIds.every((id) => selectedContacts.includes(id));

                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleGroup(tag)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-black transition",
                          active
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-emerald-50"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                {filteredContacts.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">
                    <p>{contactSearch.trim() ? "Aucun contact ne correspond à votre recherche." : "Aucun contact WhatsApp disponible."}</p>
                    {!contactSearch.trim() ? (
                      <Link href="/dashboard/contacts" className="mt-2 inline-flex font-black text-emerald-700 hover:text-emerald-800">
                        Ajouter ou autoriser des contacts WhatsApp
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <label key={contact.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm shadow-sm hover:bg-emerald-50">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="mt-1 size-4"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-slate-900">{contact.displayName}</span>
                        <span className="block text-xs text-slate-500">{contact.phone}</span>
                        {contact.tags?.length ? (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {contact.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                {tag}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="grid gap-3">
            <Button
              onClick={publishNow}
              disabled={!canPublish}
              className="min-h-12 rounded-xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] text-white shadow-lg shadow-pink-950/25 hover:from-[#c5236e] hover:to-[#df5938]"
            >
              {publishing ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
              Publier maintenant
            </Button>
            <Button
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              disabled={!canSchedule}
              className="min-h-12 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950"
            >
              <CalendarClock className="size-4" />
              Planifier l&apos;envoi
            </Button>
          </div>

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              {successMessage}
            </div>
          ) : null}
        </aside>
      </section>

      <Link href="/dashboard/publications" className="group flex min-h-20 items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#421388] via-[#5c24ad] to-[#d92d7c] px-5 py-4 text-white shadow-[0_16px_32px_rgba(66,19,136,0.24)] transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
        <span className="flex min-w-0 items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/16 ring-1 ring-white/25"><History className="size-5" /></span><span className="min-w-0"><span className="block text-base font-black">Historique des publications</span><span className="mt-0.5 block text-sm font-semibold text-white/75">Retrouvez toutes vos publications envoyées et programmées.</span></span></span>
        <ExternalLink className="size-5 shrink-0 text-white/85 transition group-hover:translate-x-0.5" />
      </Link>

      <Card aria-hidden="true" className="hidden overflow-hidden rounded-2xl border-slate-200 p-0">
        <button
          type="button"
          onClick={() => setHistoryOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50"
          aria-expanded={historyOpen}
          aria-controls="social-publication-history"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-lg shadow-slate-300">
              <History className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-base font-black text-slate-950">
                Historique
                {!loading && history.length > 0 ? <Badge variant="secondary">{history.length}</Badge> : null}
              </span>
              <span className="mt-1 block text-sm text-slate-500">Date, reseaux utilises et texte de vos dernieres publications.</span>
            </span>
          </span>
          <ChevronDown className={cn("size-5 shrink-0 text-slate-500 transition-transform duration-200", historyOpen && "rotate-180")} />
        </button>

        {historyOpen ? (
          <div id="social-publication-history" className="border-t border-slate-200 p-5">
            <div className="mb-4 flex justify-end">
              <Button variant="outline" onClick={loadData} disabled={loading} className="rounded-xl">
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Actualiser
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-slate-500">Chargement de l&apos;historique...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune publication pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
              <article key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={historyBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                      <span className="text-xs font-semibold text-slate-500">{formatDate(item.date)}</span>
                      {item.networks.map((network) => (
                        <span key={network} className="rounded-full bg-white px-2 py-1 text-[11px] font-black text-slate-600">
                          {network}
                        </span>
                      ))}
                    </div>
                    <p className="line-clamp-3 text-sm leading-6 text-slate-700">{item.content}</p>
                  </div>
                  {item.status === "SCHEDULED" ? (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(item)} className="rounded-lg">
                        <Edit3 className="size-4" />
                        Modifier
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => cancelHistoryItem(item)} disabled={publishing} className="rounded-lg text-rose-600 hover:bg-rose-50">
                        <Trash2 className="size-4" />
                        Annuler
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Card>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" className="w-full max-w-xl rounded-2xl border border-white/70 bg-white p-5 shadow-[0_30px_100px_rgba(15,23,42,0.34)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Modifier la publication programmee</h2>
                <p className="mt-1 text-sm text-slate-500">La modification s&apos;applique aux reseaux de cette publication.</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setEditing(null)} className="rounded-lg">
                <X className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <textarea
                rows={7}
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                className="w-full rounded-xl border border-slate-200 p-4 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <input
                type="datetime-local"
                value={editScheduledAt}
                onChange={(event) => setEditScheduledAt(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)} className="rounded-xl">
                  Fermer
                </Button>
                <Button onClick={saveEdit} disabled={publishing} className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                  Enregistrer
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {publishSuccess ? (
        <SocialPublishSuccessDialog
          results={publishSuccess}
          onClose={() => setPublishSuccess(null)}
        />
      ) : null}

      {publishRequirementIssues ? (
        <PublishRequirementsDialog
          issues={publishRequirementIssues}
          onClose={() => setPublishRequirementIssues(null)}
        />
      ) : null}

      {scheduleOpen ? (
        <SocialScheduleDialog
          initialMessage={message}
          initialMediaUrls={mediaUrls}
          initialMediaNames={mediaNames}
          initialNetworks={selectedNetworks}
          initialContactIds={selectedContacts}
          channels={data.channels}
          contacts={data.whatsappContacts}
          onClose={() => setScheduleOpen(false)}
          onCreate={(payload) => submit(false, payload)}
        />
      ) : null}

      {emailComingSoonOpen ? (
        <EmailComingSoonDialog onClose={() => setEmailComingSoonOpen(false)} />
      ) : null}
    </div>
  );
}
