"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle, AlertTriangle, Send, Copy, Sparkles, RefreshCw, Eye, Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Official logos and classes
const SOCIAL_LOGOS: Record<string, React.ReactNode> = {
  WHATSAPP: (
    <svg className="size-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.284 3.507 8.49-.006 6.66-5.344 11.997-11.957 11.997-2.005-.001-3.973-.5-5.739-1.453L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.859-4.42 9.863-9.864.002-2.634-1.02-5.11-2.881-6.974C16.592 1.897 14.1 1.87 11.999 1.87c-5.439 0-9.861 4.421-9.865 9.867-.001 1.733.46 3.424 1.336 4.921l-.988 3.597 3.7-.978zM17.15 14.5c-.282-.141-1.67-.824-1.928-.918-.258-.095-.447-.141-.636.141-.189.282-.731.918-.897 1.107-.166.189-.333.213-.615.072-1.048-.523-1.83-.984-2.525-2.18-.184-.316.184-.294.526-.976.059-.118.03-.222-.015-.316-.045-.094-.447-1.077-.612-1.472-.16-.388-.323-.336-.447-.342-.116-.006-.25-.007-.386-.007-.136 0-.356.05-.543.254-.187.204-.714.698-.714 1.701 0 1.004.73 1.976.832 2.113.102.136 1.436 2.193 3.48 3.076.486.209.866.335 1.161.429.489.156.935.134 1.286.082.392-.058 1.205-.493 1.376-.97.171-.476.171-.885.12-.97-.051-.085-.19-.136-.472-.277z"/>
    </svg>
  ),
  INSTAGRAM: (
    <svg className="size-5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  FACEBOOK: (
    <svg className="size-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
    </svg>
  ),
  TELEGRAM: (
    <svg className="size-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.422 1.32a1.328 1.328 0 00-1.284-.092L1.51 9.074a1.31 1.31 0 00-.142 2.378L5.91 13.53l12.44-8.082c.162-.105.352.12.214.258l-10.156 10.19-.364 5.342c.036.56.326.83.676.83a1.18 1.18 0 00.866-.396l2.544-2.456 5.27 3.882c.974.536 2.03-.024 2.226-1.156l2.946-13.886a1.324 1.324 0 00-.746-1.368z"/>
    </svg>
  ),
  EMAIL: (
    <svg className="size-5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
};

const BRAND_STYLES: Record<string, { bg: string; text: string; border: string; label: string; accentBg: string; gradient: string }> = {
  WHATSAPP: {
    label: "WhatsApp",
    bg: "bg-emerald-500",
    text: "text-white",
    border: "border-emerald-400",
    accentBg: "bg-emerald-50",
    gradient: "from-emerald-600 via-teal-600 to-emerald-500",
  },
  INSTAGRAM: {
    label: "Instagram",
    bg: "bg-gradient-to-br from-pink-600 via-rose-600 to-orange-500",
    text: "text-white",
    border: "border-pink-500",
    accentBg: "bg-pink-50",
    gradient: "from-pink-600 via-rose-600 to-orange-500",
  },
  FACEBOOK: {
    label: "Facebook",
    bg: "bg-blue-600",
    text: "text-white",
    border: "border-blue-500",
    accentBg: "bg-blue-50",
    gradient: "from-blue-700 via-blue-600 to-indigo-700",
  },
  TELEGRAM: {
    label: "Telegram",
    bg: "bg-sky-500",
    text: "text-white",
    border: "border-sky-400",
    accentBg: "bg-sky-50",
    gradient: "from-sky-600 via-sky-500 to-blue-500",
  },
  EMAIL: {
    label: "Email / Gmail",
    bg: "bg-slate-700",
    text: "text-white",
    border: "border-slate-500",
    accentBg: "bg-slate-100",
    gradient: "from-slate-800 via-slate-700 to-slate-600",
  },
};

const CHANNEL_SHARED_DESCRIPTION =
  "Écrivez n’importe quel message à envoyer sur WhatsApp, l’IA le reformule et le publie automatiquement au bon moment et aux bonnes personnes.";

interface Props {
  platform: string;
  channelId: string | null;
  isConnected: boolean;
  communityName: string;
}

type SuggestedTemplate = {
  id: string;
  name: string;
  category: string;
  reason: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
};

type GeneratedTexts = Record<string, string>;

export function ManualPublishClient({ platform, channelId, isConnected, communityName }: Props) {
  const router = useRouter();
  const platformKey = platform.toUpperCase();
  const brand = BRAND_STYLES[platformKey] ?? BRAND_STYLES.EMAIL;
  const logo = SOCIAL_LOGOS[platformKey] ?? SOCIAL_LOGOS.EMAIL;
  const isInstagram = platformKey === "INSTAGRAM";
  const isFacebook = platformKey === "FACEBOOK";
  const isVisualPlatform = isInstagram || isFacebook;
  const visualLabel = isInstagram ? "Instagram" : isFacebook ? "Facebook" : brand.label;
  const visualAccent = isInstagram
    ? {
        cardBorder: "border-pink-100",
        cardBg: "bg-gradient-to-br from-white to-pink-50",
        textAccent: "text-pink-500",
        inputBorder: "border-pink-100",
        ring: "focus-visible:ring-pink-500",
        button: "bg-pink-600 hover:bg-pink-700",
        overlay: "from-slate-950/35 via-pink-950/20 to-orange-900/25",
        overlayIcon: "from-pink-500 via-rose-500 to-orange-400",
        overlayBar: "from-pink-500 via-rose-500 to-orange-400",
        softBg: "bg-pink-100",
        softText: "text-pink-700",
      }
    : {
        cardBorder: "border-blue-100",
        cardBg: "bg-gradient-to-br from-white to-blue-50",
        textAccent: "text-blue-600",
        inputBorder: "border-blue-100",
        ring: "focus-visible:ring-blue-500",
        button: "bg-blue-600 hover:bg-blue-700",
        overlay: "from-slate-950/35 via-blue-950/20 to-indigo-900/25",
        overlayIcon: "from-blue-600 via-blue-500 to-indigo-500",
        overlayBar: "from-blue-600 via-blue-500 to-indigo-500",
        softBg: "bg-blue-100",
        softText: "text-blue-700",
      };

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ show: boolean; fallbackText?: string } | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SuggestedTemplate | null>(null);
  const [generatedTexts, setGeneratedTexts] = useState<GeneratedTexts>({});
  const [posterEditPrompt, setPosterEditPrompt] = useState("");
  const [posterEditLoading, setPosterEditLoading] = useState(false);

  // Character counters limits
  const charLimit = platformKey === "WHATSAPP" ? 4096 : platformKey === "TELEGRAM" ? 4096 : undefined;

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const generateEndpoint = isInstagram
        ? "/api/publishing/instagram/generate"
        : isFacebook
        ? "/api/publishing/facebook/generate"
        : "/api/ai/generate-content";
      const res = await fetch(
        generateEndpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isVisualPlatform
              ? { prompt: aiPrompt }
              : {
                  contentType: "GENERAL",
                  instructions: `Redige une publication pour ${brand.label}. ${aiPrompt}`,
                }
          ),
        }
      );
      const data = await res.json();
      if (data.body) {
        setText(data.body);
        if (isVisualPlatform) {
          setTitle(data.title ?? "");
          setImageUrl(data.imageUrl ?? null);
          setSelectedTemplate(data.template ?? null);
          setGeneratedTexts(data.generatedTexts ?? {});
        }
        setAiPrompt("");
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert("Erreur lors de la generation avec l'IA.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handlePublish() {
    if (!text.trim()) {
      alert("Le contenu du message est vide.");
      return;
    }
    setLoading(true);
    try {
      const isVisualWithImage = isVisualPlatform && imageUrl && channelId;
      const res = await fetch(
        isVisualWithImage ? "/api/templates/publish" : "/api/publishing/manual-post",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isVisualWithImage
              ? {
                  imageUrl,
                  caption: text,
                  title: title || undefined,
                  channelIds: [channelId],
                }
              : {
                  title: title || undefined,
                  text,
                  channelType: platformKey,
                }
          ),
        }
      );
      const data = await res.json();
      if (res.ok) {
        const firstResult = Array.isArray(data.results) ? data.results[0] : data.publishResult;
        const isFallback =
          data.publications?.[0]?.status === "FALLBACK_READY" || Boolean(firstResult?.fallbackUsed);
        setSuccessData({
          show: true,
          fallbackText: isFallback ? text : undefined,
        });
      } else {
        alert(data.error || "Une erreur est survenue lors de la publication.");
      }
    } catch {
      alert("Erreur reseau lors de la publication.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePosterEdit() {
    if (!isVisualPlatform || !selectedTemplate || !posterEditPrompt.trim()) {
      return;
    }

    setPosterEditLoading(true);
    try {
      const response = await fetch(
        isInstagram ? "/api/publishing/instagram/edit-poster" : "/api/publishing/facebook/edit-poster",
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          generatedTexts,
          caption: text,
          editPrompt: posterEditPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de modifier l'affiche.");
      }

      setImageUrl(data.imageUrl ?? null);
      setGeneratedTexts(data.generatedTexts ?? generatedTexts);
      setPosterEditPrompt("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible de modifier l'affiche.");
    } finally {
      setPosterEditLoading(false);
    }
  }

  // Format bold formatting in previews for WhatsApp (*text*) and generic Markdown
  function formatPreviewText(value: string) {
    if (!value) return "Votre message s'affichera ici en temps reel...";
    let html = value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Convert *bold* or **bold**
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
    // Convert newlines
    html = html.replace(/\n/g, "<br />");
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  function renderSmartphoneFrame(children: React.ReactNode, screenClassName = "bg-white") {
    return (
      <div className="w-full mx-auto flex justify-center">
        <div className="relative aspect-[12/25] w-full max-w-[320px] xl:max-w-[340px] rounded-[3.5rem] border-[1.5px] border-[#b0853e] bg-[#f2935a] p-[4px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="absolute -left-[5px] top-[110px] h-[30px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a] shadow-sm" />
          <div className="absolute -left-[5px] top-[160px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a] shadow-sm" />
          <div className="absolute -left-[5px] top-[230px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a] shadow-sm" />
          <div className="absolute -right-[5px] top-[180px] h-[85px] w-[5px] rounded-r-md border-y border-r border-[#b0853e] bg-[#f2935a] shadow-sm" />

          <div className={cn("relative flex h-full w-full flex-col overflow-hidden rounded-[3.2rem]", screenClassName)}>
            <div className="flex h-12 w-full flex-shrink-0 items-center justify-between px-6 pt-2">
              <div className="w-1/3 pl-1 text-[15px] font-semibold text-black">9:41</div>
              <div className="relative mt-1 h-[30px] w-[120px] flex-shrink-0 rounded-full bg-black">
                <div className="absolute right-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-[1.5px] border-[#222] bg-[#121212]" />
              </div>
              <div className="flex w-1/3 items-center justify-end space-x-1.5 pr-1">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="16" width="3" height="4" rx="1" />
                  <rect x="8" y="12" width="3" height="8" rx="1" />
                  <rect x="13" y="8" width="3" height="12" rx="1" />
                  <rect x="18" y="4" width="3" height="16" rx="1" />
                </svg>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                  <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <line x1="12" x2="12.01" y1="20" y2="20" />
                </svg>
                <div className="relative flex h-[11px] w-[22px] items-center rounded-[3px] border border-gray-400 p-[1px]">
                  <div className="h-full w-full rounded-[1px] bg-green-500" />
                  <div className="absolute -right-[3px] top-1/2 h-[4px] w-[2px] -translate-y-1/2 rounded-r-[1px] bg-gray-400" />
                </div>
              </div>
            </div>

            {children}

            <div className="absolute bottom-2 flex w-full justify-center pb-1">
              <div className="h-[5px] w-[130px] rounded-full bg-gray-300" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className={cn("overflow-hidden rounded-3xl border p-6 shadow-lg shadow-slate-950/20 text-white bg-gradient-to-br", brand.gradient)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/publications">
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 rounded-2xl cursor-pointer">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 border border-white/25 shadow-inner">
              {logo}
            </div>
            <div>
              <h1 className="text-2xl font-bold">Publier sur {brand.label}</h1>
              <p className="max-w-2xl text-sm leading-6 text-white/85">{CHANNEL_SHARED_DESCRIPTION}</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-xs font-semibold py-1 px-3">
            Publication manuelle
          </Badge>
        </div>
      </div>

      {/* Connection Banner Check */}
      {!isConnected && (
        <Card className="border-amber-200 bg-amber-50/50 rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-800">Compte {brand.label} non connecte</h3>
                <p className="text-xs text-amber-600/90 mt-0.5">
                  Pour pouvoir envoyer vos messages automatiquement sans copier-coller ou pour debloquer les automatisations completes, veuillez d&apos;abord lier votre compte.
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings/channels">
              <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 font-semibold cursor-pointer">
                Connecter mon compte
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Publishing Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form panel */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-blue-100/30">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600 animate-pulse" />
              Générer le message avec l&apos;IA EasyCom IA
            </h2>
            <div className="flex gap-2">
              <input
                placeholder={
                  isInstagram
                    ? "Ex: Prépare un post Instagram pour notre soirée de dimanche et choisis une affiche adaptée..."
                    : isFacebook
                    ? "Ex: Prépare une publication Facebook pour notre soirée de dimanche et choisis une affiche adaptée..."
                    : "Ex: Redige une annonce pour la Kabalat Chabbat de ce soir a 18h..."
                }
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
                className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 py-5"
              />
              <Button
                onClick={handleAIGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-2xl cursor-pointer"
              >
                {aiLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                <span className="hidden sm:inline ml-1.5">Générer</span>
              </Button>
            </div>
          </Card>

          {isVisualPlatform && selectedTemplate && (
            <Card className={cn("rounded-3xl border p-5 shadow-sm", visualAccent.cardBorder, visualAccent.cardBg)}>
              <div className="flex items-start gap-4">
                <div className={cn("h-24 w-24 overflow-hidden rounded-2xl border bg-white shadow-sm", visualAccent.cardBorder)}>
                  {imageUrl || selectedTemplate.previewUrl || selectedTemplate.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl || selectedTemplate.previewUrl || selectedTemplate.thumbnailUrl || ""}
                      alt={selectedTemplate.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-bold uppercase tracking-wide", visualAccent.textAccent)}>Affiche sélectionnée</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{selectedTemplate.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{selectedTemplate.reason}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    L&apos;affiche a été choisie automatiquement depuis la bibliothèque et adaptée au thème pour {visualLabel}.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {isVisualPlatform && (
            <Link href="/dashboard/automations" className={cn("block", isInstagram ? "mb-4" : "mb-2")}>
              <div
                className={cn(
                  "group w-full rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md",
                  isInstagram
                    ? "bg-gradient-to-r from-pink-50 to-orange-50 border-pink-100 hover:border-pink-300"
                    : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 hover:border-blue-300"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                        isInstagram
                          ? "bg-gradient-to-tr from-pink-500 via-rose-500 to-yellow-500"
                          : "bg-gradient-to-br from-blue-500 to-indigo-600"
                      )}
                    >
                      <Sparkles className="size-4 text-white" />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold leading-tight", isInstagram ? "text-pink-700" : "text-blue-700")}>
                        {isInstagram ? "Créer une automatisation Instagram" : "Créer une automatisation Facebook"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Planifier et publier ce type de contenu automatiquement</p>
                    </div>
                  </div>
                  <svg
                    className={cn("size-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5", isInstagram ? "text-pink-300" : "text-blue-300")}
                    fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                  >
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </Link>
          )}

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-blue-100/30 space-y-5">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
              {isVisualPlatform ? `Message ${visualLabel} retravaillé par l'IA` : "Details de la publication"}
            </h2>

            {isVisualPlatform && imageUrl && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Affiche générée</label>
                  <div className={cn("relative overflow-hidden rounded-3xl border bg-slate-50 shadow-sm", visualAccent.cardBorder)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`Affiche ${visualLabel} générée`}
                      className={cn(
                        "h-auto w-full object-cover transition duration-300",
                        posterEditLoading ? "scale-[1.02] opacity-40 blur-[1px]" : ""
                      )}
                    />
                    {posterEditLoading && (
                      <div className={cn("absolute inset-0 flex items-center justify-center bg-gradient-to-br backdrop-blur-[2px]", visualAccent.overlay)}>
                        <div className="mx-6 w-full max-w-sm rounded-[1.75rem] border border-white/30 bg-white/88 p-5 text-center shadow-2xl shadow-pink-950/20">
                          <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg", visualAccent.overlayIcon)}>
                            <RefreshCw className="size-5 animate-spin" />
                          </div>
                          <p className="mt-4 text-sm font-black text-slate-900">Génération en cours</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            L&apos;affiche est en train d&apos;être adaptée par l&apos;IA. Veuillez patienter en restant sur cette page.
                          </p>
                          <div className={cn("mt-4 h-1.5 overflow-hidden rounded-full", visualAccent.softBg)}>
                            <div className={cn("h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r", visualAccent.overlayBar)} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={cn("rounded-3xl border p-4 shadow-sm", visualAccent.cardBorder, visualAccent.cardBg)}>
                  <div className="flex items-center gap-2">
                    <Wand2 className={cn("size-4", visualAccent.textAccent)} />
                    <p className="text-sm font-bold text-slate-900">Modifier l&apos;affiche avec l&apos;IA</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Décrivez simplement la modification souhaitée. L&apos;IA garde la même direction artistique et ajuste le visuel.
                  </p>
                  {posterEditLoading && (
                    <div className={cn("mt-3 rounded-2xl border bg-white/90 px-3 py-2 text-xs font-medium shadow-sm", visualAccent.cardBorder, visualAccent.softText)}>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", isInstagram ? "bg-pink-400" : "bg-blue-400")} />
                          <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", isInstagram ? "bg-pink-500" : "bg-blue-500")} />
                        </span>
                        Génération de l&apos;affiche en cours. Veuillez patienter en restant sur la page.
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      value={posterEditPrompt}
                      onChange={(e) => setPosterEditPrompt(e.target.value)}
                      placeholder="Ex: rends le titre plus percutant, ajoute un ton plus festif, raccourcis le sous-texte..."
                      disabled={posterEditLoading}
                      className={cn(
                        "flex h-10 w-full rounded-2xl border bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70",
                        visualAccent.inputBorder,
                        visualAccent.ring
                      )}
                    />
                    <Button
                      type="button"
                      onClick={handlePosterEdit}
                      disabled={posterEditLoading || !posterEditPrompt.trim()}
                      className={cn("rounded-2xl text-white", visualAccent.button)}
                    >
                      {posterEditLoading ? <RefreshCw className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                      <span className="hidden sm:inline ml-1.5">{posterEditLoading ? "Génération..." : "Adapter"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {platformKey === "EMAIL" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Objet de l&apos;email</label>
                <input
                  placeholder="Ex: Conference communautaire exceptionnelle ce dimanche !"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contenu du message</label>
                {charLimit && (
                  <span className={cn("text-[11px]", text.length > charLimit ? "text-red-500 font-bold" : "text-slate-400")}>
                    {text.length} / {charLimit}
                  </span>
                )}
              </div>
              <textarea
                placeholder="Saisissez votre texte..."
                rows={12}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-sm leading-relaxed p-4 resize-y"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(text);
                  alert("Texte copie dans le presse-papiers !");
                }}
                disabled={!text.trim()}
                className="rounded-2xl border-slate-200 cursor-pointer"
              >
                <Copy className="size-4" />
                Copier
              </Button>

              <Button
                onClick={handlePublish}
                disabled={loading || !text.trim() || !isConnected || (isVisualPlatform && !imageUrl)}
                className={cn("rounded-2xl text-white font-bold cursor-pointer px-6", brand.bg, "hover:opacity-90")}
              >
                {loading ? <RefreshCw className="size-4 animate-spin mr-1.5" /> : <Send className="size-4 mr-1.5" />}
                Envoyer maintenant
              </Button>
            </div>
          </Card>
        </div>

        {/* Live Device Preview mockup */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="sticky top-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Previsualisation en direct</h2>
              <Badge variant="secondary" className="text-[10px] py-0.5">
                <Eye className="size-3 mr-1 text-slate-500" />
                Rendu telephone
              </Badge>
            </div>

            {platformKey === "WHATSAPP" ? (
              /* WhatsApp Smartphone mockup */
              <div className="w-full max-w-[340px] mx-auto rounded-[40px] border-[10px] border-slate-900 bg-[#e5ddd5] aspect-[9/16] shadow-xl overflow-hidden flex flex-col relative">
                {/* Header phone bar */}
                <div className="bg-[#075e54] text-white p-3 pt-4 flex items-center gap-2 shadow">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                    {communityName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold truncate leading-tight">{communityName}</p>
                    <p className="text-[8px] text-white/70 leading-none">en ligne</p>
                  </div>
                </div>

                {/* Body message area */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col justify-end pb-8" style={{ backgroundImage: "url('/images/whatsapp-bg-pattern.png')", backgroundSize: "cover" }}>
                  <div className="max-w-[85%] self-end bg-[#d9fdd3] rounded-2xl rounded-tr-none p-2.5 text-xs text-slate-800 shadow-sm relative">
                    <p className="break-words whitespace-pre-wrap leading-relaxed">{formatPreviewText(text)}</p>
                    <span className="block text-[8px] text-slate-400 text-right mt-1.5">Aujourd&apos;hui a 12:00 OK</span>
                  </div>
                </div>
              </div>
            ) : platformKey === "INSTAGRAM" ? (
              /* Instagram Smartphone mockup — design orange */
              renderSmartphoneFrame(
                <>
                    {/* Instagram Post */}
                    <div className="flex-1 mt-2 flex flex-col overflow-hidden">
                      {/* Post Header */}
                      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 text-[11px] font-bold text-gray-500">
                            {communityName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="ml-3 font-semibold text-[13px] text-gray-900 tracking-tight">
                            {communityName.toLowerCase().replace(/\s+/g, "")}
                          </span>
                        </div>
                        <button className="p-1 focus:outline-none">
                          <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="6" cy="12" r="1.5" />
                            <circle cx="18" cy="12" r="1.5" />
                          </svg>
                        </button>
                      </div>

                      {/* Post Image */}
                      <div className="w-full aspect-square bg-[#f3f3f3] flex flex-col items-center justify-center flex-shrink-0">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageUrl} alt="Prévisualisation Instagram" className="h-full w-full object-cover" />
                        ) : (
                          <>
                            <svg className="w-16 h-16 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                            </svg>
                            <p className="text-[13px] font-medium text-gray-400 tracking-wide">Affiche pertinente générée par l&apos;IA</p>
                          </>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between px-3 py-3 flex-shrink-0">
                        <div className="flex items-center space-x-4">
                          <button className="focus:outline-none hover:opacity-50 transition-opacity">
                            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
                              <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.543 1.117 1.543s.277-.368 1.117-1.543a4.21 4.21 0 0 1 3.675-1.941z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </button>
                          <button className="focus:outline-none hover:opacity-50 transition-opacity">
                            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
                              <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </button>
                          <button className="focus:outline-none hover:opacity-50 transition-opacity">
                            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24">
                              <line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083" />
                              <polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Caption */}
                      <div className="px-3 pb-3 flex-shrink-0">
                        <p className="text-[13px] text-gray-900 leading-[18px]">
                          <span className="font-semibold mr-1">{communityName.toLowerCase().replace(/\s+/g, "")}</span>
                          {formatPreviewText(text) || "Votre message s’affichera ici en temps réel…"}
                        </p>
                      </div>
                    </div>

                </>
              )
            ) : platformKey === "FACEBOOK" ? (
              /* Facebook Smartphone mockup */
              renderSmartphoneFrame(
                <>
                {/* Facebook Header */}
                <div className="bg-white p-3 border-b border-slate-200">
                  <span className="text-blue-600 font-bold text-base">facebook</span>
                </div>

                {/* Facebook Post Card */}
                <div className="bg-white p-3 pb-8 space-y-2 flex-1 overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                      {communityName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800">{communityName}</p>
                      <span className="text-[8px] text-slate-400 flex items-center gap-0.5">A l&apos;instant - Web</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {formatPreviewText(text)}
                  </div>

                  <div className="w-full h-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="Prévisualisation Facebook" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center">
                        <svg className="size-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <p className="mt-2 text-[10px] font-medium text-slate-400">Affiche pertinente générée par l&apos;IA</p>
                      </div>
                    )}
                  </div>
                </div>
                </>,
                "bg-[#f0f2f5]"
              )
            ) : platformKey === "TELEGRAM" ? (
              /* Telegram Smartphone mockup */
              renderSmartphoneFrame(
                <>
                {/* Telegram Header */}
                <div className="bg-[#4a6f8a] text-white p-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {communityName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold truncate">{communityName}</p>
                    <p className="text-[8px] text-white/70">1,240 abonnes</p>
                  </div>
                </div>

                {/* Telegram Body */}
                <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end pb-8">
                  <div className="bg-white rounded-xl p-2.5 text-[11px] text-slate-800 shadow-sm max-w-[90%] self-start relative">
                    <p className="font-bold text-[#3a6d99] mb-1">{communityName}</p>
                    <div className="w-full h-24 bg-slate-100 rounded mb-2 flex items-center justify-center">
                      <svg className="size-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      </svg>
                    </div>
                    <p className="break-words whitespace-pre-wrap leading-relaxed">{formatPreviewText(text)}</p>
                    <span className="block text-[8px] text-slate-400 text-right mt-1">12:00</span>
                  </div>
                </div>
                </>,
                "bg-[#517c9b]"
              )
            ) : (
              /* Email mock newsletter */
              <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-md text-xs text-slate-700 min-h-[360px] flex flex-col">
                <div className="border-b border-slate-100 pb-3 space-y-1.5">
                  <p><span className="font-semibold text-slate-400">De :</span> {communityName} &lt;onboarding@resend.dev&gt;</p>
                  <p><span className="font-semibold text-slate-400">A :</span> membres-communaute@easycom-ai.com</p>
                  <p><span className="font-semibold text-slate-400">Objet :</span> <span className="font-bold text-slate-800">{title || "(sans objet)"}</span></p>
                </div>
                <div className="flex-1 pt-4 leading-relaxed whitespace-pre-wrap text-slate-800">
                  {formatPreviewText(text)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Dialog overlay */}
      {successData?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Publication traitee avec succes !</h3>
            
            {successData.fallbackText ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500">
                  S&apos;agissant de WhatsApp ou de l&apos;Email, vous pouvez copier le contenu ci-dessous pour l&apos;envoyer manuellement :
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap select-all font-mono text-slate-600">
                  {successData.fallbackText}
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(successData.fallbackText || "");
                    alert("Copie !");
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer"
                >
                  <Copy className="size-4 mr-2" />
                  Copier le texte
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Votre publication a bien ete envoyee sur {brand.label}.
              </p>
            )}

            <div className="mt-6">
              <Button
                onClick={() => {
                  setSuccessData(null);
                  router.push("/dashboard/publications");
                }}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-2xl cursor-pointer"
              >
                Voir l&apos;historique
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
