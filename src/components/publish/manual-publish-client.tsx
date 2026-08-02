"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  Copy,
  FileText,
  Eye,
  Heart,
  ImagePlus,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DAVID_AGENT_IMAGE, DOV_BER_INSTAGRAM_IMAGE, MENDY_FACEBOOK_IMAGE, SocialPageBanner } from "@/components/publish/social-page-banner";

const SOCIAL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TELEGRAM: "Telegram",
  EMAIL: "Email / Gmail",
};

type Props = {
  platform: string;
  channelId: string | null;
  isConnected: boolean;
  communityName: string;
};

type InstagramPublication = {
  id: string;
  content: string;
  scheduledAt: string | null;
  status: string;
  mediaUrls?: string[] | null;
  createdAt?: string | null;
};

type InstagramGenerateResponse = {
  title?: string;
  body?: string;
  hashtags?: string[];
  redirectToPosters?: boolean;
  redirectMessage?: string;
  error?: string;
};

function normalizeHashtag(tag: string) {
  const cleaned = tag.trim().replace(/^#+/, "").replace(/\s+/g, "");
  return cleaned ? `#${cleaned}` : "";
}

function extractHashtags(value: string) {
  return value
    .split(/[\s,\n]+/)
    .map(normalizeHashtag)
    .filter(Boolean);
}

function formatPreviewText(value: string) {
  if (!value) return "Votre message s'affichera ici en temps reel...";
  let html = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
  html = html.replace(/\n/g, "<br />");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function ChatGptVisualCreatorButton({ tone = "pink" }: { tone?: "pink" | "blue" | "emerald" }) {
  const toneClasses = {
    pink: "border-pink-200 bg-gradient-to-r from-pink-50 via-white to-orange-50 text-pink-700 hover:border-pink-300 hover:from-pink-100 hover:to-orange-100",
    blue: "border-blue-200 bg-gradient-to-r from-blue-50 via-white to-sky-50 text-blue-700 hover:border-blue-300 hover:from-blue-100 hover:to-sky-100",
    emerald: "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 text-emerald-700 hover:border-emerald-300 hover:from-emerald-100 hover:to-teal-100",
  };

  return (
    <Link
      href="/dashboard/templates"
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center text-sm font-black shadow-sm transition",
        toneClasses[tone],
      )}
    >
      <Sparkles className="size-4" />
      <span>Créer un visuel IA...</span>
    </Link>
  );
}

function renderSmartphoneFrame(children: React.ReactNode, screenClassName = "bg-white") {
  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="relative aspect-[12/25] w-full max-w-[320px] rounded-[3.5rem] border-[1.5px] border-[#b0853e] bg-[#f2935a] p-[4px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="absolute -left-[5px] top-[110px] h-[30px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -left-[5px] top-[160px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -left-[5px] top-[230px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -right-[5px] top-[180px] h-[85px] w-[5px] rounded-r-md border-y border-r border-[#b0853e] bg-[#f2935a]" />

        <div className={cn("relative flex h-full w-full flex-col overflow-hidden rounded-[3.2rem]", screenClassName)}>
          <div className="flex h-12 w-full flex-shrink-0 items-center justify-between px-6 pt-2">
            <div className="w-1/3 pl-1 text-[15px] font-semibold text-black">9:41</div>
            <div className="mt-1 h-[30px] w-[120px] rounded-full bg-black" />
            <div className="flex w-1/3 justify-end pr-1 text-xs font-semibold text-black">LTE</div>
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

function GenericPublishClient({ platformKey, isConnected, communityName }: Props & { platformKey: string }) {
  const router = useRouter();
  const label = SOCIAL_LABELS[platformKey] ?? platformKey;
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/ai/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "GENERAL",
          instructions: `Redige une publication pour ${label}. ${aiPrompt}`,
        }),
      });
      const data = await response.json();
      if (data.body) {
        setText(data.body);
        setTitle(data.title ?? "");
        setAiPrompt("");
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert("Erreur lors de la generation IA.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handlePublish() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/publishing/manual-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          text,
          channelType: platformKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de publier");
      }
      setSuccess(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible de publier.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SocialPageBanner
        title={`Publier sur ${label}`}
        color="#334155"
        agentName="David"
        agentImageUrl={DAVID_AGENT_IMAGE}
        statusLabel="Publication manuelle"
        backHref="/dashboard/publications"
      />

      {!isConnected && (
        <Card className="overflow-hidden rounded-2xl border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-800">Compte {label} non connecte</h3>
                <p className="text-xs text-amber-700">Connectez votre canal avant d&apos;envoyer automatiquement.</p>
              </div>
            </div>
            <Link href="/dashboard/settings/channels">
              <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700">
                Connecter mon compte
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <Card className="rounded-3xl border border-slate-200 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
              <Sparkles className="size-4 text-blue-600" />
              Generer le message avec l&apos;IA
            </h2>
            <div className="flex gap-2">
              <input
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleGenerate()}
                placeholder="Ex: annonce les cours de dimanche et ajoute un ton chaleureux..."
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <Button onClick={handleGenerate} disabled={aiLoading || !aiPrompt.trim()} className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
                {aiLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              </Button>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 p-5">
            {platformKey === "WHATSAPP" && (
              <div className="mb-5">
                <ChatGptVisualCreatorButton tone="emerald" />
              </div>
            )}
            {platformKey === "EMAIL" && (
              <div className="mb-4 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Objet</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Contenu du message</label>
              <textarea
                rows={12}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Saisissez votre texte..."
                className="min-h-[220px] w-full rounded-2xl border border-slate-200 p-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(text)}
                disabled={!text.trim()}
                className="rounded-2xl border-slate-200"
              >
                <Copy className="mr-2 size-4" />
                Copier
              </Button>
              <Button onClick={handlePublish} disabled={!isConnected || !text.trim() || loading} className="rounded-2xl bg-blue-600 px-6 text-white hover:bg-blue-700">
                {loading ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Envoyer maintenant
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Previsualisation</h2>
              <Badge variant="secondary" className="text-[10px]">
                <Eye className="mr-1 size-3" />
                Rendu
              </Badge>
            </div>
            <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-xs font-bold text-slate-500">{communityName}</p>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{formatPreviewText(text)}</div>
            </Card>
          </div>
        </div>
      </div>

      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Publication traitee avec succes</h3>
            <p className="mt-2 text-xs text-slate-500">Votre publication a bien ete envoyee sur {label}.</p>
            <Button onClick={() => router.push("/dashboard/publications")} className="mt-6 w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
              Voir l&apos;historique
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InstagramPublishClient({ channelId, isConnected, communityName }: Props) {
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [publications, setPublications] = useState<InstagramPublication[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hashtags = useMemo(() => extractHashtags(hashtagsInput), [hashtagsInput]);
  const instagramHandle = communityName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "communaute";
  const canSubmit = Boolean(isConnected && channelId && caption.trim() && !publishing);

  async function loadScheduledPosts() {
    setListLoading(true);
    try {
      const response = await fetch("/api/publishing/instagram/posts");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les publications.");
      }
      setPublications(Array.isArray(data.publications) ? data.publications : []);
    } catch (error) {
      console.error(error);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  async function handleAIGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/publishing/instagram/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = (await response.json()) as InstagramGenerateResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de generer le message.");
      }
      if (data.redirectToPosters) {
        alert(data.redirectMessage ?? "Pour creer un visuel, rendez-vous dans Affiches.");
        router.push("/dashboard/affiches");
        return;
      }
      setCaption(data.body ?? "");
      setHashtagsInput((data.hashtags ?? []).join(" "));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible de generer le message.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads/attachment", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'envoyer l'image.");
      }
      setImageUrl(data.url ?? null);
      setImageName(file.name);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'envoyer l'image.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function copyInstagramContent() {
    const textToCopy = [caption.trim(), hashtags.join(" ")].filter(Boolean).join("\n\n");
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setSuccessMessage("Contenu Instagram copie.");
    } catch {
      alert("Impossible de copier automatiquement. Selectionnez le texte manuellement.");
    }
  }

  async function submitPost(publishNow: boolean) {
    if (!channelId) {
      alert("Le canal Instagram n'est pas connecte.");
      return;
    }
    if (!caption.trim()) {
      alert("Le message Instagram est vide.");
      return;
    }
    if (!imageUrl) {
      alert("Ajoutez une image avant de publier ou planifier. Instagram ne permet pas d'envoyer une publication sans media.");
      return;
    }
    if (!publishNow && !scheduledAt) {
      alert("Choisissez une date de planification.");
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch("/api/publishing/instagram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          hashtags,
          imageUrl,
          publishNow,
          scheduledAt: publishNow ? null : new Date(scheduledAt).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'enregistrer la publication.");
      }
      setSuccessMessage(publishNow ? "Publication Instagram envoyee." : "Publication Instagram planifiee.");
      if (!publishNow) {
        setScheduledAt("");
      }
      await loadScheduledPosts();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'enregistrer la publication.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDeletePublication(id: string) {
    setPublishing(true);
    try {
      const response = await fetch(`/api/publishing/instagram/posts?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'annuler la publication.");
      }
      await loadScheduledPosts();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'annuler la publication.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <SocialPageBanner
        title="Publier sur Instagram"
        color="#8A184D"
        agentName="Dov Ber"
        agentImageUrl={DOV_BER_INSTAGRAM_IMAGE}
        statusLabel={isConnected ? "Compte connecté" : "Connexion requise"}
        backHref="/dashboard/publications"
      />

      {!isConnected && (
        <Card className="overflow-hidden rounded-2xl border-amber-200 bg-amber-50/60">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-800">Compte Instagram non connecte</h3>
                <p className="text-xs text-amber-700">Connectez votre compte avant de publier ou planifier.</p>
              </div>
            </div>
            <Link href="/dashboard/settings/channels">
              <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700">
                Connecter mon compte
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-3xl border border-pink-100 bg-white p-0 shadow-sm">
            <div className="border-b border-pink-100 bg-gradient-to-r from-pink-50 via-rose-50 to-orange-50 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Sparkles className="size-4 text-pink-600" />
                Generer le message avec l&apos;IA
              </h2>
            </div>
            <div className="flex gap-2 p-5">
              <input
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleAIGenerate()}
                placeholder="Ex: annonce notre evenement de dimanche avec un ton chaleureux"
                className="h-12 w-full rounded-2xl border border-pink-100 bg-white px-4 text-sm shadow-inner shadow-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              />
              <Button onClick={handleAIGenerate} disabled={aiLoading || !aiPrompt.trim()} className="rounded-2xl bg-pink-600 text-white hover:bg-pink-700">
                {aiLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              </Button>
            </div>
          </Card>

        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Apercu Instagram</h2>
              <Badge variant="secondary" className="bg-pink-50 text-pink-700 text-[10px]">
                <Eye className="mr-1 size-3" />
                Live
              </Badge>
            </div>

            {renderSmartphoneFrame(
              <div className="mt-2 flex flex-1 flex-col overflow-hidden bg-white">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500">
                      {communityName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-semibold tracking-tight text-gray-900">{instagramHandle}</span>
                  </div>
                  <MoreHorizontal className="size-5 text-slate-700" />
                </div>

                <div className="aspect-square w-full bg-gradient-to-br from-pink-50 via-white to-orange-50">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Previsualisation Instagram" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-pink-500 shadow-sm">
                        <ImagePlus className="size-8" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-3 py-3">
                  <div className="hidden">
                    <span className="text-xl">♡</span>
                    <span className="text-xl">◯</span>
                    <span className="text-xl">➤</span>
                  </div>
                  <div className="mb-3 flex items-center gap-4 text-slate-900">
                    <Heart className="size-6" />
                    <MessageCircle className="size-6" />
                    <Send className="size-6" />
                  </div>
                  <p className="text-[13px] leading-[18px] text-gray-900">
                    <span className="mr-1 font-semibold">{instagramHandle}</span>
                    {formatPreviewText(caption)}
                  </p>
                  {hashtags.length > 0 && (
                    <p className="mt-3 text-[12px] leading-[17px] text-[#c13584]">{hashtags.join(" ")}</p>
                  )}
                </div>
              </div>
            )}

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Modifier le message</label>
              <textarea
                rows={6}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Le message Instagram redige par l'IA apparaitra ici..."
                className="min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-inner shadow-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
              />
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Image de publication</label>
                <ChatGptVisualCreatorButton tone="pink" />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-pink-200 bg-gradient-to-r from-pink-50 to-orange-50 px-4 py-4 text-sm font-medium text-pink-700 transition hover:from-pink-100 hover:to-orange-100">
                  <ImagePlus className="size-4" />
                  {uploading ? "Envoi en cours..." : imageName || "Ajouter une image"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Planifier la publication</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-inner shadow-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  onClick={copyInstagramContent}
                  disabled={!caption.trim() && hashtags.length === 0}
                  className="rounded-2xl border-slate-200"
                >
                  <Copy className="mr-2 size-4" />
                  Copier
                </Button>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => submitPost(false)}
                    disabled={!canSubmit || !scheduledAt}
                    className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {publishing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <CalendarClock className="mr-2 size-4" />}
                    Planifier
                  </Button>
                  <Button
                    onClick={() => submitPost(true)}
                    disabled={!canSubmit}
                    className="rounded-2xl bg-gradient-to-r from-pink-600 to-orange-500 text-white shadow-sm shadow-pink-200 hover:from-pink-700 hover:to-orange-600"
                  >
                    {publishing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                    Publier maintenant
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Messages planifies pour plus tard</h2>
          </div>
          <Button variant="outline" onClick={loadScheduledPosts} disabled={listLoading} className="rounded-2xl border-slate-200">
            <RefreshCw className={cn("mr-2 size-4", listLoading && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {listLoading ? (
          <p className="text-sm text-slate-500">Chargement des publications...</p>
        ) : publications.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune publication Instagram planifiee pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {publications.map((publication) => (
              <div key={publication.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{publication.status}</Badge>
                      <span className="text-xs text-slate-500">
                        {publication.scheduledAt
                          ? new Date(publication.scheduledAt).toLocaleString("fr-FR")
                          : "Publication immediate"}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">{publication.content}</p>
                  </div>
                  {publication.status === "SCHEDULED" && (
                    <Button
                      variant="outline"
                      onClick={() => handleDeletePublication(publication.id)}
                      disabled={publishing}
                      className="rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Annuler
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{successMessage}</h3>
            <div className="mt-6 grid gap-3">
              {successMessage === "Publication Instagram envoyee." && (
                <a
                  href="https://www.instagram.com/"
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-orange-500 px-4 text-sm font-semibold text-white shadow-sm shadow-pink-200 transition hover:from-pink-700 hover:to-orange-600"
                >
                  Voir ma publication sur Instagram
                </a>
              )}
              <Button onClick={() => setSuccessMessage(null)} className="w-full rounded-2xl bg-pink-600 text-white hover:bg-pink-700">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FacebookPublishClient({ channelId, isConnected, communityName }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaNames, setMediaNames] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [publications, setPublications] = useState<InstagramPublication[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hashtags = useMemo(() => extractHashtags(hashtagsInput), [hashtagsInput]);
  const canSubmit = Boolean(isConnected && channelId && (message.trim() || mediaUrls.length > 0) && !publishing);

  async function loadScheduledPosts() {
    setListLoading(true);
    try {
      const response = await fetch("/api/publishing/facebook/posts");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les publications.");
      }
      setPublications(Array.isArray(data.publications) ? data.publications : []);
    } catch (error) {
      console.error(error);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  async function handleAIGenerate() {
    const source = prompt.trim() || message.trim();
    if (!source) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/publishing/facebook/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: source }),
      });
      const data = (await response.json()) as InstagramGenerateResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de generer le message.");
      }
      if (data.redirectToPosters) {
        alert(data.redirectMessage ?? "Pour creer une affiche, je vous redirige vers la page Affiches.");
        router.push("/dashboard/affiches");
        return;
      }
      setMessage(data.body ?? "");
      setHashtagsInput((data.hashtags ?? []).join(" "));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible de generer le message.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      const uploadedNames: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/attachment", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Impossible d'envoyer le media.");
        }
        if (data.url) {
          uploadedUrls.push(data.url);
          uploadedNames.push(file.name);
        }
      }
      setMediaUrls((current) => [...current, ...uploadedUrls]);
      setMediaNames((current) => [...current, ...uploadedNames]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'envoyer le media.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeMedia(index: number) {
    setMediaUrls((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMediaNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function copyFacebookContent() {
    const textToCopy = [message.trim(), hashtags.join(" ")].filter(Boolean).join("\n\n");
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setSuccessMessage("Contenu Facebook copie.");
    } catch {
      alert("Impossible de copier automatiquement. Selectionnez le texte manuellement.");
    }
  }

  async function submitPost(publishNow: boolean) {
    if (!channelId) {
      alert("Connectez Facebook avant de publier.");
      return;
    }
    if (!message.trim() && mediaUrls.length === 0) {
      alert("Ajoutez un texte ou un media avant de publier.");
      return;
    }
    if (!publishNow && !scheduledAt) {
      alert("Choisissez une date de planification.");
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch("/api/publishing/facebook/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message,
          hashtags,
          mediaUrls,
          publishNow,
          scheduledAt: publishNow ? null : new Date(scheduledAt).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'enregistrer la publication.");
      }
      setSuccessMessage(publishNow ? "Publication Facebook envoyee." : "Publication Facebook planifiee.");
      if (!publishNow) setScheduledAt("");
      await loadScheduledPosts();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'enregistrer la publication.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDeletePublication(id: string) {
    setPublishing(true);
    try {
      const response = await fetch(`/api/publishing/facebook/posts?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'annuler la publication.");
      }
      setPublications((current) => current.filter((publication) => publication.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'annuler la publication.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <SocialPageBanner
        title="Publier sur Facebook"
        color="#0B4FB3"
        agentName="Mendy"
        agentImageUrl={MENDY_FACEBOOK_IMAGE}
        statusLabel={isConnected ? "Facebook connecté" : "Connexion requise"}
        backHref="/dashboard/publications"
      />

      {!isConnected && (
        <div className="flex justify-end">
          <Link href="/dashboard/settings/channels">
            <Button className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700">Connecter Facebook</Button>
          </Link>
        </div>
      )}

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-0 shadow-sm">
            <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-sky-50 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Sparkles className="size-4 text-blue-600" />
                Generer le message avec l&apos;IA
              </h2>
            </div>
            <div className="flex gap-2 p-5">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleAIGenerate()}
                placeholder="Demande a l'IA ou texte de depart..."
                className="h-12 w-full rounded-2xl border border-blue-100 bg-white px-4 text-sm shadow-inner shadow-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <Button onClick={handleAIGenerate} disabled={aiLoading || (!prompt.trim() && !message.trim())} className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
                {aiLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Apercu Facebook</h2>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px]">
                <Eye className="mr-1 size-3" />
                Live
              </Badge>
            </div>

            {renderSmartphoneFrame(
              <div className="mt-2 flex flex-1 flex-col overflow-hidden bg-[#f0f2f5]">
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <span className="text-base font-bold text-blue-600">facebook</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 pb-8">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {communityName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[12px] font-bold leading-tight text-slate-900">{communityName}</p>
                          <p className="text-[10px] text-slate-400">Maintenant</p>
                        </div>
                      </div>
                      <MoreHorizontal className="size-5 text-slate-500" />
                    </div>

                    {(message.trim() || hashtags.length > 0) && (
                      <div className="mb-3 text-[12px] leading-[17px] text-slate-800">
                        {formatPreviewText([message.trim(), hashtags.join(" ")].filter(Boolean).join("\n\n"))}
                      </div>
                    )}

                    {mediaUrls.length > 0 && (
                      <div className={cn("grid overflow-hidden rounded-xl border border-slate-100", mediaUrls.length > 1 ? "grid-cols-2 gap-1" : "grid-cols-1")}>
                        {mediaUrls.slice(0, 4).map((url, index) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={url} src={url} alt={`Media Facebook ${index + 1}`} className="aspect-square h-full w-full object-cover" />
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-around border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <ThumbsUp className="size-4" />
                        J&apos;aime
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="size-4" />
                        Commenter
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Share2 className="size-4" />
                        Partager
                      </span>
                    </div>
                  </div>
                </div>
              </div>,
              "bg-[#f0f2f5]"
            )}

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Modifier le message</label>
              <textarea
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Le message Facebook redige par l'IA apparaitra ici..."
                className="min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-inner shadow-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Medias</label>
                <ChatGptVisualCreatorButton tone="blue" />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4 text-sm font-medium text-blue-700 transition hover:bg-blue-100">
                  <ImagePlus className="size-4" />
                  {uploading ? "Envoi en cours..." : "Ajouter des images"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                </label>
                {mediaNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mediaNames.map((name, index) => (
                      <button
                        key={`${name}-${index}`}
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        {name}
                        <X className="size-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Planifier la publication</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-inner shadow-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  onClick={copyFacebookContent}
                  disabled={!message.trim() && hashtags.length === 0}
                  className="rounded-2xl border-slate-200"
                >
                  <Copy className="mr-2 size-4" />
                  Copier
                </Button>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => submitPost(false)}
                    disabled={!canSubmit || !scheduledAt}
                    className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {publishing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <CalendarClock className="mr-2 size-4" />}
                    Planifier
                  </Button>
                  <Button onClick={() => submitPost(true)} disabled={!canSubmit} className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
                    {publishing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                    Publier maintenant
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">Messages planifies pour plus tard</h2>
          <Button variant="outline" onClick={loadScheduledPosts} disabled={listLoading} className="rounded-2xl border-slate-200">
            <RefreshCw className={cn("mr-2 size-4", listLoading && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {listLoading ? (
          <p className="text-sm text-slate-500">Chargement des publications...</p>
        ) : publications.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune publication Facebook planifiee pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {publications.map((publication) => (
              <div key={publication.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{publication.status === "SCHEDULED" ? "Programmee" : publication.status}</Badge>
                      <span className="text-xs text-slate-500">
                        {publication.scheduledAt ? new Date(publication.scheduledAt).toLocaleString("fr-FR") : "Publication immediate"}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">{publication.content || "Media Facebook"}</p>
                  </div>
                  {publication.status === "SCHEDULED" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeletePublication(publication.id)}
                      disabled={publishing}
                      className="rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{successMessage}</h3>
            <div className="mt-6 grid gap-3">
              {successMessage === "Publication Facebook envoyee." && (
                <a
                  href="https://www.facebook.com/"
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Voir ma publication sur Facebook
                </a>
              )}
              <Button onClick={() => setSuccessMessage(null)} className="w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TelegramPublishClient({ channelId, isConnected, communityName }: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaNames, setMediaNames] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [publications, setPublications] = useState<InstagramPublication[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hashtags = useMemo(() => extractHashtags(hashtagsInput), [hashtagsInput]);
  const canSubmit = Boolean(isConnected && channelId && (message.trim() || mediaUrls.length > 0) && !publishing);

  async function loadScheduledPosts() {
    setListLoading(true);
    try {
      const response = await fetch("/api/publishing/telegram/posts");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de charger les publications.");
      }
      setPublications(Array.isArray(data.publications) ? data.publications : []);
    } catch (error) {
      console.error(error);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadScheduledPosts();
  }, []);

  async function handleAIGenerate() {
    const source = prompt.trim() || message.trim();
    if (!source) return;
    setAiLoading(true);
    try {
      const response = await fetch("/api/publishing/telegram/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: source }),
      });
      const data = (await response.json()) as InstagramGenerateResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de generer le message.");
      }
      if (data.redirectToPosters) {
        alert(data.redirectMessage ?? "Pour creer une affiche, je vous redirige vers la page Affiches.");
        router.push("/dashboard/affiches");
        return;
      }
      setMessage(data.body ?? "");
      setHashtagsInput((data.hashtags ?? []).join(" "));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible de generer le message.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      const uploadedNames: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/attachment", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Impossible d'envoyer le fichier.");
        }
        if (data.url) {
          uploadedUrls.push(data.url);
          uploadedNames.push(file.name);
        }
      }
      setMediaUrls((current) => [...current, ...uploadedUrls]);
      setMediaNames((current) => [...current, ...uploadedNames]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'envoyer le fichier.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeMedia(index: number) {
    setMediaUrls((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMediaNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function copyTelegramContent() {
    const textToCopy = [message.trim(), hashtags.join(" ")].filter(Boolean).join("\n\n");
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setSuccessMessage("Contenu Telegram copie.");
    } catch {
      alert("Impossible de copier automatiquement. Selectionnez le texte manuellement.");
    }
  }

  async function submitPost(publishNow: boolean) {
    if (!channelId) {
      alert("Connectez Telegram avant de publier.");
      return;
    }
    if (!message.trim() && mediaUrls.length === 0) {
      alert("Ajoutez un texte ou un media avant de publier.");
      return;
    }
    if (!publishNow && !scheduledAt) {
      alert("Choisissez une date de planification.");
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch("/api/publishing/telegram/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message,
          hashtags,
          mediaUrls,
          publishNow,
          scheduledAt: publishNow ? null : new Date(scheduledAt).toISOString(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'enregistrer la publication.");
      }
      setSuccessMessage(publishNow ? "Publication Telegram envoyee." : "Publication Telegram planifiee.");
      if (!publishNow) setScheduledAt("");
      await loadScheduledPosts();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'enregistrer la publication.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDeletePublication(id: string) {
    setPublishing(true);
    try {
      const response = await fetch(`/api/publishing/telegram/posts?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'annuler la publication.");
      }
      setPublications((current) => current.filter((publication) => publication.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d'annuler la publication.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <SocialPageBanner
        title="Publier sur Telegram"
        color="#1677A8"
        agentName="David"
        agentImageUrl={DAVID_AGENT_IMAGE}
        statusLabel={isConnected ? "Telegram connecté" : "Connexion requise"}
        backHref="/dashboard/publications"
      />

      {!isConnected && (
        <div className="flex justify-end">
          <Link href="/dashboard/settings/channels">
            <Button className="rounded-2xl bg-sky-600 text-white hover:bg-sky-700">Connecter Telegram</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="overflow-hidden rounded-3xl border border-sky-100 bg-white p-0 shadow-sm">
            <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Sparkles className="size-4 text-sky-600" />
                Generer le message avec l&apos;IA
              </h2>
            </div>
            <div className="flex gap-2 p-5">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleAIGenerate()}
                placeholder="Demande a l'IA ou texte de depart..."
                className="h-12 w-full rounded-2xl border border-sky-100 bg-white px-4 text-sm shadow-inner shadow-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
              <Button onClick={handleAIGenerate} disabled={aiLoading || (!prompt.trim() && !message.trim())} className="rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
                {aiLoading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Apercu Telegram</h2>
              <Badge variant="secondary" className="bg-sky-50 text-sky-700 text-[10px]">
                <Eye className="mr-1 size-3" />
                Live
              </Badge>
            </div>

            {renderSmartphoneFrame(
              <div className="mt-2 flex flex-1 flex-col overflow-hidden bg-[#d7e8f4]">
                <div className="flex items-center gap-3 bg-[#229ed9] px-4 py-3 text-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    {communityName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[12px] font-bold leading-tight">{communityName}</p>
                    <p className="text-[10px] text-white/75">Telegram</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-end overflow-y-auto p-3 pb-8">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white p-3 text-[12px] leading-[17px] text-slate-800 shadow-sm">
                    {mediaUrls.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {mediaUrls.slice(0, 2).map((url, index) => (
                          mediaNames[index]?.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={url} src={url} alt={`Media Telegram ${index + 1}`} className="max-h-36 w-full rounded-xl object-cover" />
                          ) : (
                            <div key={url} className="flex items-center gap-2 rounded-xl bg-slate-100 p-2 text-[11px] text-slate-600">
                              <FileText className="size-4 text-sky-600" />
                              <span className="truncate">{mediaNames[index] ?? "Fichier"}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <div>{formatPreviewText([message.trim(), hashtags.join(" ")].filter(Boolean).join("\n\n"))}</div>
                    <span className="mt-2 block text-right text-[10px] text-slate-400">12:00</span>
                  </div>
                </div>
              </div>,
              "bg-[#d7e8f4]"
            )}

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Modifier le message</label>
              <textarea
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Le message Telegram redige par l'IA apparaitra ici..."
                className="min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed shadow-inner shadow-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Medias et fichiers</label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50 px-4 py-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100">
                  <FileText className="size-4" />
                  {uploading ? "Envoi en cours..." : "Ajouter des fichiers"}
                  <input type="file" multiple className="hidden" onChange={handleUpload} />
                </label>
                {mediaNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {mediaNames.map((name, index) => (
                      <button
                        key={`${name}-${index}`}
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        {name}
                        <X className="size-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Planifier la publication</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-inner shadow-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  onClick={copyTelegramContent}
                  disabled={!message.trim() && hashtags.length === 0}
                  className="rounded-2xl border-slate-200"
                >
                  <Copy className="mr-2 size-4" />
                  Copier
                </Button>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => submitPost(false)}
                    disabled={!canSubmit || !scheduledAt}
                    className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {publishing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <CalendarClock className="mr-2 size-4" />}
                    Planifier
                  </Button>
                  <Button onClick={() => submitPost(true)} disabled={!canSubmit} className="rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
                    {publishing ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                    Publier maintenant
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">Messages planifies pour plus tard</h2>
          <Button variant="outline" onClick={loadScheduledPosts} disabled={listLoading} className="rounded-2xl border-slate-200">
            <RefreshCw className={cn("mr-2 size-4", listLoading && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {listLoading ? (
          <p className="text-sm text-slate-500">Chargement des publications...</p>
        ) : publications.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune publication Telegram planifiee pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {publications.map((publication) => (
              <div key={publication.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{publication.status === "SCHEDULED" ? "Programmee" : publication.status}</Badge>
                      <span className="text-xs text-slate-500">
                        {publication.scheduledAt ? new Date(publication.scheduledAt).toLocaleString("fr-FR") : "Publication immediate"}
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">{publication.content || "Fichier Telegram"}</p>
                  </div>
                  {publication.status === "SCHEDULED" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeletePublication(publication.id)}
                      disabled={publishing}
                      className="rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">{successMessage}</h3>
            <Button onClick={() => setSuccessMessage(null)} className="mt-6 w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-700">
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ManualPublishClient(props: Props) {
  const platformKey = props.platform.toUpperCase();
  if (platformKey === "INSTAGRAM") {
    return <InstagramPublishClient {...props} />;
  }
  if (platformKey === "FACEBOOK") {
    return <FacebookPublishClient {...props} />;
  }
  if (platformKey === "TELEGRAM") {
    return <TelegramPublishClient {...props} />;
  }

  return <GenericPublishClient {...props} platformKey={platformKey} />;
}
