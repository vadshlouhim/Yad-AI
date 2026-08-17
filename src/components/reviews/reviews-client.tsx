"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Star,
  Bot,
  Sparkles,
  Clock3,
  BellRing,
  TriangleAlert,
  RefreshCw,
  CheckCircle2,
  Send,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";

interface GoogleReview {
  id: string;
  googleReviewName: string; // "locations/xxx/reviews/yyy"
  author: string;
  avatarLetter: string;
  avatarUrl: string | null;
  rating: number;
  comment: string;
  relativeTime: string;
  timestamp: string;
  answered: boolean;
  replyText: string | null;
  repliedAt: string | null;
}

interface ReviewsClientProps {
  communityId: string;
  initialConnected: boolean;
  locationDisplayName: string | null;
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  gmb_cancelled: "Connexion annulée.",
  gmb_missing_code: "Google n'a pas renvoyé de code de connexion.",
  gmb_no_community: "Aucune communauté n'est associée à ce compte.",
  gmb_no_token: "Google n'a pas renvoyé de token utilisable.",
  gmb_no_account: "Aucun compte Google Business Profile n'a été trouvé.",
  gmb_quota_exceeded: "Google a temporairement bloqué les appels car le quota par minute est dépassé. Attendez 1 à 2 minutes, puis réessayez une seule fois.",
  gmb_accounts_error: "Impossible de lire les comptes Google Business. Vérifiez que l'API Business Profile est activée et que le compte a les droits nécessaires.",
  gmb_database_error: "Connexion Google réussie, mais l'enregistrement en base a échoué. Il faut appliquer la migration du canal GOOGLE_BUSINESS.",
  gmb_error: "Erreur pendant la finalisation Google Business.",
};

const BAROUH_REVIEWS_IMAGE = AGENT_IMAGE_URLS.barouh;

function getAiAnalysis(review: GoogleReview, now: number) {
  if (review.answered) {
    return {
      level: "LOW" as const,
      label: "Traité",
      explanation: "Cet avis a déjà une réponse publiée.",
      color: "bg-slate-100 text-slate-700 border-slate-200",
      badgeIcon: <CheckCircle2 className="size-3.5" />,
    };
  }
  const hoursSince = (now - new Date(review.timestamp).getTime()) / 3600000;
  const isRecent = hoursSince < 24;

  if (review.rating <= 2) {
    return isRecent
      ? { level: "EXTREME" as const, label: "Extrême urgence", explanation: `Avis très négatif (${review.rating}?) reçu il y a moins de 24h - impact e-réputation immédiat.`, color: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse", badgeIcon: <TriangleAlert className="size-3.5 text-rose-600" /> }
      : { level: "URGENT" as const, label: "Urgent", explanation: `Avis négatif (${review.rating}?) sans réponse depuis plus de 24h.`, color: "bg-amber-100 text-amber-800 border-amber-200", badgeIcon: <BellRing className="size-3.5 text-amber-600" /> };
  }
  if (review.rating === 3) {
    return { level: "IMPORTANT" as const, label: "Important", explanation: "Avis mitigé à traiter - suggestions potentiellement constructives.", color: "bg-cyan-100 text-cyan-800 border-cyan-200", badgeIcon: <Sparkles className="size-3.5 text-cyan-600" /> };
  }
  return { level: "LOW" as const, label: "Normal", explanation: `Avis positif (${review.rating}?) - répondre sous 7 jours pour fidéliser.`, color: "bg-slate-100 text-slate-700 border-slate-200", badgeIcon: <Clock3 className="size-3.5 text-slate-500" /> };
}

export function ReviewsClient({ communityId, initialConnected, locationDisplayName: initialLocation }: ReviewsClientProps) {
  const now = useMemo(() => Date.now(), []);
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  const [isConnected, setIsConnected] = useState(initialConnected);
  const [locationName, setLocationName] = useState(initialLocation);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "URGENT_ONLY" | "UNANSWERED" | "BAD_ONLY">("ALL");
  const [replyText, setReplyText] = useState("");
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Charger les avis depuis l'API
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gmb/reviews");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors du chargement des avis");
      setReviews(data.reviews ?? []);
      if (data.locationDisplayName) setLocationName(data.locationDisplayName);
      if (data.needsLocationSync) {
        setNotice({
          type: "success",
          message: "Google Business est connecté. La récupération de la fiche et des avis sera synchronisée ensuite.",
        });
      }
      if (data.reviews?.length > 0 && !selectedId) setSelectedId(data.reviews[0].id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (isConnected) fetchReviews();
  }, [isConnected, fetchReviews]);

  // Écouter le postMessage du popup GMB OAuth
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin && event.origin !== appOrigin) return;
      if (event.data?.type === "gmb_oauth_success") {
        setIsConnected(true);
        setIsConnecting(false);
        if (event.data.location) setLocationName(event.data.location);
        setNotice({ type: "success", message: `Google My Business connecté ! ${event.data.location ? `- ${event.data.location}` : ""}` });
      } else if (event.data?.type === "gmb_oauth_error") {
        setIsConnecting(false);
        setNotice({ type: "error", message: OAUTH_ERROR_MESSAGES[event.data.oauth as string] ?? "Connexion annulée ou erreur." });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [appOrigin, fetchReviews]);

  const handleConnect = () => {
    if (isConnecting) return;
    if (isConnected) {
      window.location.href = "/api/gmb/disconnect";
      return;
    }
    setIsConnecting(true);
    const authUrl = new URL("/api/gmb/auth", window.location.origin);
    authUrl.searchParams.set("communityId", communityId);
    authUrl.searchParams.set("returnTo", "gmb_popup");

    const popup = window.open(
      authUrl.toString(),
      "gmb_oauth",
      "width=520,height=660,left=200,top=100,toolbar=0,menubar=0,location=0"
    );
    if (!popup) {
      setIsConnecting(false);
      window.location.href = authUrl.toString();
    }
  };

  const handleDraftWithAi = async () => {
    if (!selectedReview) return;
    setIsAiDrafting(true);
    setAiDraft("");

    // Appel au générateur IA existant (assistant)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Tu es un community manager expert. Rédige une réponse professionnelle et empathique à cet avis Google (${selectedReview.rating} étoile${selectedReview.rating > 1 ? "s" : ""}) de "${selectedReview.author}" :\n\n"${selectedReview.comment}"\n\nLa réponse doit être en français, courte (3-5 phrases), chaleureuse et adapter le ton au score. Ne pas mettre de signature générique. Réponds directement avec le texte de la réponse, sans explications.`,
          }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.message ?? data.content ?? data.reply ?? "";
        setAiDraft(text);
      } else {
        // Fallback : template selon la note
        setAiDraft(generateFallbackReply(selectedReview));
      }
    } catch {
      setAiDraft(generateFallbackReply(selectedReview));
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedReview || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/gmb/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewName: selectedReview.googleReviewName,
          replyText: replyText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'envoi");

      // Mettre à jour localement
      setReviews((prev) =>
        prev.map((r) =>
          r.id === selectedReview.id
            ? { ...r, answered: true, replyText: replyText.trim(), repliedAt: new Date().toISOString() }
            : r
        )
      );
      setReplyText("");
      setNotice({ type: "success", message: "Réponse publiée sur Google ! ?" });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setNotice({ type: "error", message: (err as Error).message });
    } finally {
      setIsSending(false);
    }
  };

  const selectedReview = useMemo(() => reviews.find((r) => r.id === selectedId) ?? null, [reviews, selectedId]);

  const filteredReviews = useMemo(() => reviews.filter((r) => {
    const analysis = getAiAnalysis(r, now);
    if (activeFilter === "URGENT_ONLY") return !r.answered && (analysis.level === "EXTREME" || analysis.level === "URGENT");
    if (activeFilter === "UNANSWERED") return !r.answered;
    if (activeFilter === "BAD_ONLY") return r.rating <= 2;
    return true;
  }), [reviews, activeFilter, now]);

  const counts = useMemo(() => ({
    total: reviews.length,
    unanswered: reviews.filter((r) => !r.answered).length,
    urgent: reviews.filter((r) => { const a = getAiAnalysis(r, now); return !r.answered && (a.level === "EXTREME" || a.level === "URGENT"); }).length,
    bad: reviews.filter((r) => r.rating <= 2).length,
    avgRating: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null,
  }), [reviews, now]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 overflow-x-clip px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="relative min-h-[12rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_72%_12%,#7028bd_0%,#421388_45%,#210763_100%)] px-5 py-5 text-white shadow-[0_24px_58px_rgba(49,13,108,0.26)] sm:min-h-[17rem] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-52 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative z-10 max-w-[68%] sm:max-w-3xl">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20 sm:size-12"><Star className="size-6 fill-amber-300 text-amber-300" /></span>
          <h1 className="mt-4 text-[clamp(1.75rem,8vw,2.6rem)] font-black leading-[1.03] tracking-[-0.04em] sm:mt-5 sm:text-4xl">Avis Google</h1>
          <p className="mt-3 hidden max-w-2xl text-sm font-semibold leading-6 text-white/80 sm:block sm:text-base">Centralisez vos avis, classez les priorités et préparez des réponses professionnelles.</p>
          {isConnected && locationName && <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-white/75"><MapPin className="size-3.5" /><span>{locationName}</span>{counts.avgRating && <span className="ml-1 flex items-center gap-1 text-amber-300"><Star className="size-3.5 fill-current" />{counts.avgRating} / 5</span>}</div>}
          <div className="mt-4 flex flex-wrap gap-2">
            {isConnected && <button onClick={() => fetchReviews()} disabled={isLoading} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-black ring-1 ring-white/20 transition hover:bg-white/20"><RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />Actualiser</button>}
            <Button variant="outline" onClick={handleConnect} disabled={isConnecting} className={cn("min-h-10 rounded-xl border-white bg-white px-3 text-xs font-black text-[#421388] hover:bg-violet-50", isConnected && "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100")}>
              {isConnecting ? <span className="flex items-center gap-2"><RefreshCw className="size-4 animate-spin" />Connexion...</span> : isConnected ? "Déconnecter" : "Connecter Google"}
            </Button>
          </div>
        </div>
        <Image src={BAROUH_REVIEWS_IMAGE} alt="Barouh, agent IA Avis Google" width={240} height={280} className="pointer-events-none absolute -bottom-3 -right-5 z-10 h-[10.5rem] w-auto object-contain object-bottom drop-shadow-[0_18px_24px_rgba(12,2,35,0.34)] sm:-right-2 sm:h-[16rem]" priority />
      </div>

      {/* Notice */}
      {notice && (
        <div className={cn(
          "rounded-xl border p-3 flex gap-2 text-sm",
          notice.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {notice.type === "success" ? <CheckCircle2 className="size-4 shrink-0 mt-0.5" /> : <AlertTriangle className="size-4 shrink-0 mt-0.5" />}
          {notice.message}
        </div>
      )}

      {!isConnected ? (
        <Card className="rounded-[2rem] border border-violet-100 bg-[#fffaf4] p-5 text-center shadow-[0_18px_46px_rgba(66,19,136,0.09)] sm:p-12">
          <CardContent className="space-y-4 max-w-md mx-auto pt-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#ffbd17] to-[#ee9100] text-white shadow-lg shadow-amber-200">
              <Star className="size-8 fill-white text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Google My Business non connecté</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Connectez votre fiche d&apos;établissement Google pour récupérer vos vrais avis clients, analyser leur urgence par IA et y répondre directement.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full rounded-2xl bg-gradient-to-r from-[#7130d8] to-[#d92d7c] px-6 py-5 text-sm font-black text-white shadow-lg shadow-violet-200 hover:brightness-105"
            >
              {isConnecting ? <><RefreshCw className="size-4 animate-spin mr-2" />Connexion...</> : "Connecter ma fiche Google"}
            </Button>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-center">
          <CardContent className="pt-4 space-y-3">
            <AlertTriangle className="size-8 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <Button size="sm" variant="outline" onClick={() => fetchReviews()} className="text-red-700 border-red-200">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : isLoading && reviews.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <RefreshCw className="size-6 animate-spin mr-3" />
          <span className="text-sm">Chargement des avis Google...</span>
        </div>
      ) : (
        <>
          {/* Stats rapides */}
          {reviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total avis", value: counts.total, color: "text-violet-800", bg: "bg-violet-50 border-violet-200" },
                { label: "Sans réponse", value: counts.unanswered, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
                { label: "Urgents IA", value: counts.urgent, color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
                { label: "Note moyenne", value: counts.avgRating ? `${counts.avgRating}?` : "-", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
              ].map((stat) => (
                <div key={stat.label} className={cn("rounded-2xl border p-4 text-center shadow-sm", stat.bg)}>
                  <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:min-h-[600px] lg:grid-cols-12 lg:gap-6">
            {/* Liste */}
            <Card className="flex flex-col overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_14px_36px_rgba(66,19,136,0.08)] lg:col-span-5">
              <CardHeader className="space-y-3 border-b border-violet-100 bg-[#fffaf4] p-4">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base font-bold text-slate-900">
                  <span>{reviews.length} avis</span>
                  {counts.unanswered > 0 && (
                    <span className="rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5">
                      {counts.unanswered} sans réponse
                    </span>
                  )}
                </CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "ALL", label: `Tous (${counts.total})`, active: "bg-[#421388] text-white border-[#421388]", inactive: "bg-white text-violet-700 border-violet-200 hover:bg-violet-50" },
                    { key: "URGENT_ONLY", label: ` Urgents (${counts.urgent})`, active: "bg-rose-600 text-white border-rose-600", inactive: "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100" },
                    { key: "UNANSWERED", label: `Sans réponse (${counts.unanswered})`, active: "bg-cyan-700 text-white border-cyan-700", inactive: "bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100" },
                    { key: "BAD_ONLY", label: `Critiques (${counts.bad})`, active: "bg-amber-600 text-white border-amber-600", inactive: "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setActiveFilter(f.key as typeof activeFilter)}
                      className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all", activeFilter === f.key ? f.active : f.inactive)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="max-h-[48vh] flex-1 divide-y divide-slate-100 overflow-y-auto overscroll-contain p-0 lg:max-h-none">
                {filteredReviews.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-700">Aucun avis ici</p>
                    <p className="text-xs text-slate-400 mt-0.5">Modifiez le filtre pour voir d&apos;autres avis.</p>
                  </div>
                ) : filteredReviews.map((rev) => {
                  const analysis = getAiAnalysis(rev, now);
                  return (
                    <button
                      key={rev.id}
                      onClick={() => setSelectedId(rev.id)}
                      className={cn(
                        "w-full text-left p-4 transition-all hover:bg-slate-50 flex items-start gap-3",
                        selectedId === rev.id ? "bg-violet-50/65 border-l-4 border-violet-700 pl-3" : "",
                        !rev.answered ? "bg-slate-50/20" : ""
                      )}
                    >
                      <div className="h-9 w-9 rounded-full flex-shrink-0 overflow-hidden bg-slate-100">
                        {rev.avatarUrl
                          ? <Image src={rev.avatarUrl} alt={rev.author} width={36} height={36} unoptimized className="h-full w-full object-cover" />
                          : <div className="h-full w-full flex items-center justify-center font-bold text-slate-600 text-sm">{rev.avatarLetter}</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">{rev.author}</span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">{rev.relativeTime}</span>
                        </div>
                        <div className="flex items-center gap-0.5 my-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn("size-3", i < rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{rev.comment || "(Avis sans commentaire)"}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border", analysis.color)}>
                            {analysis.badgeIcon}{analysis.label}
                          </span>
                          {rev.answered && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Répondu ?
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Détail + Réponse */}
            <Card className="flex flex-col overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_14px_36px_rgba(66,19,136,0.08)] lg:col-span-7">
              {selectedReview ? (
                <div className="flex flex-col h-full">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-[#fffaf4] p-4">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-bold text-slate-900">Avis de {selectedReview.author}</h2>
                      <p className="text-xs text-slate-500">{selectedReview.relativeTime}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("size-4", i < selectedReview.rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/45 p-4 text-sm leading-relaxed text-slate-800">
                      {selectedReview.comment ? `"${selectedReview.comment}"` : "(Avis sans commentaire)"}
                    </div>

                    {/* Analyse IA */}
                    {(() => {
                      const a = getAiAnalysis(selectedReview, now);
                      return (
                        <div className={cn("p-4 rounded-2xl border space-y-2", a.level === "EXTREME" ? "bg-rose-50/50 border-rose-200" : a.level === "URGENT" ? "bg-amber-50/50 border-amber-200" : a.level === "IMPORTANT" ? "bg-cyan-50/50 border-cyan-200" : "bg-slate-50/50 border-slate-200")}>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                            <Bot className="size-4 text-cyan-700" />
                            ANALYSE IA : {a.label.toUpperCase()}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{a.explanation}</p>
                        </div>
                      );
                    })()}

                    {selectedReview.answered && selectedReview.replyText && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Réponse publiée</p>
                        <div className="flex flex-col max-w-[85%] ml-auto items-end space-y-1">
                          <div className="rounded-2xl p-4 text-sm leading-relaxed bg-cyan-700 text-white rounded-tr-none shadow-sm">
                            <p className="whitespace-pre-line">{selectedReview.replyText}</p>
                          </div>
                          <span className="text-[10px] text-slate-400">Publié sur Google</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestion IA */}
                  {aiDraft && (
                    <div className="mx-4 my-2 space-y-3 rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-violet-50 p-4 shadow-sm sm:mx-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-fuchsia-800">
                          <Bot className="size-4 text-fuchsia-700" />Réponse IA proposée
                        </span>
                        <button onClick={() => setAiDraft("")} className="text-xs text-slate-400 hover:text-slate-600">Annuler</button>
                      </div>
                      <div className="max-h-[140px] overflow-y-auto whitespace-pre-line border-l-2 border-fuchsia-300 pl-3 text-xs leading-relaxed text-slate-700">{aiDraft}</div>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => { setReplyText(aiDraft); setAiDraft(""); }} className="rounded-xl bg-gradient-to-r from-[#7130d8] to-[#d92d7c] px-3 py-1 text-xs font-black text-white shadow-md shadow-violet-200 hover:brightness-105">
                          Insérer dans la réponse
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Zone de réponse */}
                  {!selectedReview.answered ? (
                    <div className="space-y-3 border-t border-violet-100 bg-[#fffaf4] p-4">
                      <Button size="sm" variant="outline" onClick={handleDraftWithAi} disabled={isAiDrafting}
                        className="flex items-center gap-1.5 rounded-xl border-fuchsia-200 bg-fuchsia-50 text-xs font-black text-fuchsia-700 hover:bg-fuchsia-100">
                        {isAiDrafting ? <><RefreshCw className="size-3 animate-spin" />Rédaction...</> : <><Sparkles className="size-3 text-cyan-600" />Rédiger avec EasyCom IA</>}
                      </Button>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Répondre à ${selectedReview.author}...`} rows={3}
                          className="flex-1 resize-none rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" />
                        <Button onClick={handleSendReply} disabled={!replyText.trim() || isSending}
                          className="h-11 rounded-xl bg-gradient-to-br from-[#16b86b] to-[#078e50] px-4 font-black text-white shadow-md shadow-emerald-200 hover:brightness-105 sm:h-[76px] sm:self-end">
                          {isSending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4 mb-1" />}
                          <span className="text-[10px] font-semibold">{isSending ? "Envoi..." : "Publier"}</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-100 p-4 bg-slate-50 text-center text-xs text-slate-400">
                      Avis traité. Pour modifier, rendez-vous sur Google My Business.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400">
                  <Star className="size-12 mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">Aucun avis sélectionné</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">Sélectionnez un avis dans la liste pour le lire et y répondre.</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function generateFallbackReply(review: GoogleReview): string {
  if (review.rating <= 2) {
    return `Bonjour ${review.author},\n\nNous vous remercions pour votre retour et nous nous excusons sincèrement pour cette expérience décevante. Vos remarques sont précieuses et nous permettront de nous améliorer. N'hésitez pas à nous contacter directement pour que nous puissions trouver une solution ensemble.\n\nCordialement,\nL'équipe`;
  }
  if (review.rating === 3) {
    return `Bonjour ${review.author},\n\nMerci pour votre retour équilibré. Nous prenons note de vos suggestions et travaillons continuellement à améliorer notre service. N'hésitez pas à nous faire part de toutes vos remarques.\n\nBien cordialement,\nL'équipe`;
  }
  return `Bonjour ${review.author},\n\nMerci beaucoup pour ce retour positif ! Votre satisfaction est notre priorité et vos encouragements nous motivent chaque jour. Au plaisir de vous revoir bientôt !\n\nChaleureusement,\nL'équipe`;
}

