"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Edit3,
  ExternalLink,
  ImagePlus,
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

const CHATGPT_VISUAL_CREATOR_URL =
  "https://chatgpt.com/g/g-6a57add3a0d08191b66d9d72eac619a7-createur-d-affiches-visuels-by-easycom-ai";

const AGENTS = [
  {
    name: "Dov Ber",
    label: "Instagram",
    image: AGENT_IMAGE_URLS.dovBer,
    logoSrc: "/logo/instagram-2-1-logo-svgrepo-com%20(1).svg",
  },
  {
    name: "Israel",
    label: "WhatsApp",
    image: AGENT_IMAGE_URLS.israel,
    logoSrc: "/logo/whatsapp-svgrepo-com.svg",
  },
  {
    name: "Mendy",
    label: "Facebook",
    image: AGENT_IMAGE_URLS.mendy,
    logoSrc: "/logo/facebook-3-logo-svgrepo-com.svg",
  },
];

const NETWORKS = [
  {
    type: "FACEBOOK",
    label: "Facebook",
    href: "/dashboard/facebook",
    icon: FacebookIcon,
    color: "text-[#2364d2]",
    bg: "bg-blue-50",
    border: "border-[#5f8ff2]",
    accent: "from-[#2b65d9] to-[#6e9cff]",
    iconBg: "bg-[#eaf2ff]",
    selectedShadow: "shadow-[0_16px_36px_-24px_rgba(35,100,210,0.52)]",
  },
  {
    type: "INSTAGRAM",
    label: "Instagram",
    href: "/dashboard/instagram",
    icon: InstagramIcon,
    color: "text-[#d12d7e]",
    bg: "bg-pink-50",
    border: "border-[#e0579a]",
    accent: "from-[#e43c8c] via-[#ad3eb8] to-[#ff9a62]",
    iconBg: "bg-[#fff0f7]",
    selectedShadow: "shadow-[0_16px_36px_-24px_rgba(209,45,126,0.48)]",
  },
  {
    type: "WHATSAPP",
    label: "WhatsApp",
    href: "/dashboard/whatsapp",
    icon: WhatsAppIcon,
    color: "text-[#128153]",
    bg: "bg-emerald-50",
    border: "border-[#26b77b]",
    accent: "from-[#169c67] to-[#72df9f]",
    iconBg: "bg-[#eafbf3]",
    selectedShadow: "shadow-[0_16px_36px_-24px_rgba(18,129,83,0.5)]",
  },
] as const;

type NetworkType = (typeof NETWORKS)[number]["type"];

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
    const key = publication.draftId ?? publication.id;
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
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-gradient-to-br from-[#631b75] via-[#b92870] to-[#ed6a45] p-5 text-white shadow-[0_28px_80px_-34px_rgba(154,33,111,0.62)] sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full border-[20px] border-white/10" aria-hidden />
      <div className="pointer-events-none absolute -bottom-28 left-[38%] size-64 rounded-full bg-[#7de4b5]/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute right-[8%] top-[5%] size-56 rounded-full bg-white/25 blur-3xl" aria-hidden />
      <div className="relative grid gap-8 text-center lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:text-left">
        <div className="max-w-3xl">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/80 lg:mx-0" />
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/90">
            <Share2 className="size-3.5" />
            Reseaux sociaux
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Publiez partout, depuis un seul espace</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-white/85 sm:text-base lg:mx-0">
            Préparez votre message avec l&apos;IA, ajoutez un visuel et diffusez-le sur Facebook, Instagram et WhatsApp au bon moment.
          </p>
        </div>

        <div className="relative flex min-w-0 items-end justify-center gap-0 sm:min-w-[30rem]">
          <div className="pointer-events-none absolute bottom-[16%] left-1/2 aspect-square w-[68%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.68)_0%,rgba(255,255,255,0.2)_44%,transparent_72%)] blur-3xl" aria-hidden />
          {AGENTS.map((agent, index) => (
            <div key={agent.name} className={cn("relative z-10 flex flex-col items-center", index === 1 && "z-20 -mx-4")}>
              <Image
                src={agent.image}
                alt={`${agent.name}, agent ${agent.label}`}
                width={190}
                height={220}
                className={cn("h-44 w-auto object-contain drop-shadow-[0_0_26px_rgba(255,255,255,0.46)] drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)] sm:h-56", index === 1 && "sm:h-64")}
                priority
              />
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/95 px-3 py-1.5 text-[11px] font-black text-slate-800 shadow-[0_8px_18px_rgba(57,15,53,0.22)] backdrop-blur-sm">
                <Image src={agent.logoSrc} alt="" width={16} height={16} sizes="16px" className="size-4 object-contain" />
                {agent.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SocialNetworksClient() {
  const [data, setData] = useState<SocialNetworksData>({ channels: [], whatsappContacts: [], publications: [] });
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaNames, setMediaNames] = useState<string[]>([]);
  const [selectedNetworks, setSelectedNetworks] = useState<NetworkType[]>(["FACEBOOK", "INSTAGRAM", "WHATSAPP"]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<HistoryItem | null>(null);
  const [editText, setEditText] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");

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
      (!selectedNetworks.includes("INSTAGRAM") || mediaUrls.length > 0) &&
      (!selectedNetworks.includes("WHATSAPP") || selectedContacts.length > 0) &&
      !publishing
  );

  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/social-networks");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Chargement impossible.");
      setData(payload);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (data.whatsappContacts.length > 0 && selectedContacts.length === 0) {
      setSelectedContacts(data.whatsappContacts.map((contact) => contact.id));
    }
  }, [data.whatsappContacts, selectedContacts.length]);

  async function adaptMessage() {
    const source = prompt.trim() || message.trim();
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
      setPrompt("");
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

  async function submit(publishNow: boolean) {
    if (!publishNow && !scheduledAt) {
      alert("Choisissez une date de planification.");
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch("/api/social-networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message,
          mediaUrls,
          channelTypes: selectedNetworks,
          scheduledAt: publishNow ? null : new Date(scheduledAt).toISOString(),
          whatsappRecipientIds: selectedContacts,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Publication impossible.");

      setSuccessMessage(publishNow ? "Publication envoyee sur les reseaux selectionnes." : "Publication programmee.");
      setScheduledAt("");
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Publication impossible.");
    } finally {
      setPublishing(false);
    }
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
            <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-fuchsia-50 to-orange-50 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
                    <Sparkles className="size-4 text-[#d12d7e]" />
                    Votre assistant de publication
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">Décrivez votre annonce : l&apos;IA prépare un texte unique, prêt à diffuser.</p>
                </div>
                <a
                  href={CHATGPT_VISUAL_CREATOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-[#bd276f] shadow-sm transition hover:bg-rose-50"
                >
                  <ImagePlus className="size-4" />
                  Créer un visuel IA
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex gap-2">
                <input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && adaptMessage()}
                  placeholder="Ex. Annonce le cours de dimanche soir avec un ton chaleureux..."
                  className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner shadow-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                />
                <Button onClick={adaptMessage} disabled={aiLoading || (!prompt.trim() && !message.trim())} className="h-12 rounded-xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] text-white shadow-lg shadow-pink-950/30 hover:from-[#c5236e] hover:to-[#df5938]">
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

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-rose-300 bg-rose-50/60 px-4 py-4 text-sm font-bold text-slate-700 transition hover:bg-rose-100">
                  <Upload className="size-4" />
                  {uploading ? "Importation..." : "Ajouter une image"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={uploadImage} />
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="h-full min-h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-inner shadow-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                  aria-label="Date de planification"
                />
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
                  <article
                    key={network.type}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-white transition duration-200 hover:-translate-y-0.5",
                      selected
                        ? `${network.border} ${network.selectedShadow}`
                        : "border-slate-200 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.32)] hover:border-slate-300"
                    )}
                  >
                    <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r transition", network.accent, selected ? "opacity-100" : "opacity-60 group-hover:opacity-100")} aria-hidden="true" />
                    <div className={cn("p-4 pt-5", selected && network.bg)}>
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleNetwork(network.type)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        aria-pressed={selected}
                      >
                        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/80 shadow-sm", network.iconBg, network.color)}>
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-slate-950">{network.label}</span>
                          <span className={cn("mt-1 inline-flex items-center gap-1 text-xs font-bold", connected ? "text-emerald-700" : "text-amber-700")}>
                            {connected ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                            {connected ? "Connecte" : "Non connecte"}
                          </span>
                        </span>
                      </button>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleNetwork(network.type)}
                        className="mt-1 size-4 shrink-0 cursor-pointer accent-pink-500"
                        aria-label={`Selectionner ${network.label}`}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-900/5 pt-3">
                      <span className={cn("text-xs font-bold", selected ? network.color : "text-slate-500")}>
                        {selected ? "Selectionne pour l'envoi" : "Ajouter a l'envoi"}
                      </span>
                      {!connected ? (
                        <Link href={network.href} className={cn("text-xs font-black transition hover:opacity-75", network.color)}>
                          Connecter
                        </Link>
                      ) : null}
                    </div>
                    </div>
                  </article>
                );
              })}
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
                <Button size="sm" variant="outline" onClick={() => setSelectedContacts(filteredContacts.map((contact) => contact.id))}>
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
                  <p className="p-3 text-sm text-slate-500">Aucun contact WhatsApp disponible.</p>
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
              onClick={() => submit(true)}
              disabled={!canPublish}
              className="min-h-12 rounded-xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] text-white shadow-lg shadow-pink-950/25 hover:from-[#c5236e] hover:to-[#df5938]"
            >
              {publishing ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
              Publier maintenant
            </Button>
            <Button
              variant="outline"
              onClick={() => submit(false)}
              disabled={!canPublish || !scheduledAt}
              className="min-h-12 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950"
            >
              {publishing ? <RefreshCw className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
              Planifier l&apos;envoi
            </Button>
          </div>

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">
              {successMessage}
            </div>
          ) : null}
        </aside>
      </section>

      <Card className="rounded-2xl border-slate-200 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Historique</h2>
            <p className="mt-1 text-sm text-slate-500">Date, reseaux utilises et texte de vos dernieres publications.</p>
          </div>
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
    </div>
  );
}
