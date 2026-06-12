"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-cyan-800/60 bg-gradient-to-br from-[#081f36] via-[#0d304f] to-[#08192d] p-6 shadow-lg shadow-slate-950/35">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-300" />
            <h1 className="mt-2 text-2xl font-bold text-white">Avis Google</h1>
            {isConnected && locationName && (
              <div className="mt-1 flex items-center gap-1.5 text-cyan-200/70">
                <MapPin className="size-3.5" />
                <span className="text-sm">{locationName}</span>
                {counts.avgRating && (
                  <span className="ml-2 flex items-center gap-1 text-amber-300 text-sm font-semibold">
                    <Star className="size-3.5 fill-amber-300" />{counts.avgRating} / 5
                  </span>
                )}
              </div>
            )}
            {!isConnected && (
              <p className="mt-1 text-sm text-cyan-100/80">
                Connectez votre fiche Google My Business pour voir et répondre à vos avis.
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {isConnected && (
              <button
                onClick={() => fetchReviews()}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white transition-colors"
              >
                <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
                Actualiser
              </button>
            )}
            <Button
              variant={isConnected ? "destructive" : "outline"}
              onClick={handleConnect}
              disabled={isConnecting}
              className={cn(
                "rounded-full px-5 py-5 text-sm font-semibold transition-all hover:scale-[1.02]",
                isConnected
                  ? "bg-rose-600 hover:bg-rose-700 text-white border-none"
                  : "bg-white text-cyan-950 border-cyan-200 hover:bg-cyan-50"
              )}
            >
              {isConnecting ? (
                <span className="flex items-center gap-2"><RefreshCw className="size-4 animate-spin" />Connexion...</span>
              ) : isConnected ? "Déconnecter" : "Connecter Google My Business"}
            </Button>
          </div>
        </div>
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
        <Card className="rounded-[28px] border border-slate-200/80 bg-white p-12 text-center shadow-[0_18px_45px_-30px_rgba(8,31,54,0.28)]">
          <CardContent className="space-y-4 max-w-md mx-auto pt-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50">
              <Star className="size-8 fill-amber-400 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Google My Business non connecté</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Connectez votre fiche d&apos;établissement Google pour récupérer vos vrais avis clients, analyser leur urgence par IA et y répondre directement.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full rounded-full bg-cyan-700 text-white hover:bg-cyan-800 px-6 py-5 text-sm font-semibold"
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
                { label: "Total avis", value: counts.total, color: "text-slate-800", bg: "bg-slate-50 border-slate-200" },
                { label: "Sans réponse", value: counts.unanswered, color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200" },
                { label: "Urgents IA", value: counts.urgent, color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
                { label: "Note moyenne", value: counts.avgRating ? `${counts.avgRating}?` : "-", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
              ].map((stat) => (
                <div key={stat.label} className={cn("rounded-2xl border p-4 text-center", stat.bg)}>
                  <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
            {/* Liste */}
            <Card className="lg:col-span-5 rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 space-y-3">
                <CardTitle className="text-base text-slate-900 font-bold flex items-center justify-between">
                  <span>{reviews.length} avis</span>
                  {counts.unanswered > 0 && (
                    <span className="rounded-full bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5">
                      {counts.unanswered} sans réponse
                    </span>
                  )}
                </CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "ALL", label: `Tous (${counts.total})`, active: "bg-slate-900 text-white border-slate-900", inactive: "bg-white text-slate-600 border-slate-200 hover:bg-slate-50" },
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
              <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-slate-100">
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
                        selectedId === rev.id ? "bg-cyan-50/50 border-l-4 border-cyan-700 pl-3" : "",
                        !rev.answered ? "bg-slate-50/20" : ""
                      )}
                    >
                      <div className="h-9 w-9 rounded-full flex-shrink-0 overflow-hidden bg-slate-100">
                        {rev.avatarUrl
                          ? <img src={rev.avatarUrl} alt={rev.author} className="h-full w-full object-cover" />
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
            <Card className="lg:col-span-7 rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
              {selectedReview ? (
                <div className="flex flex-col h-full">
                  <div className="border-b border-slate-100 p-4 bg-slate-50/30 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Avis de {selectedReview.author}</h2>
                      <p className="text-xs text-slate-500">{selectedReview.relativeTime}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={cn("size-4", i < selectedReview.rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/50 text-sm text-slate-800 leading-relaxed">
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
                    <div className="mx-6 my-2 p-4 rounded-2xl bg-cyan-50 border border-cyan-200/80 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-800">
                          <Bot className="size-4 text-cyan-700 animate-bounce" />Réponse IA proposée
                        </span>
                        <button onClick={() => setAiDraft("")} className="text-xs text-slate-400 hover:text-slate-600">Annuler</button>
                      </div>
                      <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed border-l-2 border-cyan-300 pl-3 max-h-[140px] overflow-y-auto">{aiDraft}</div>
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => { setReplyText(aiDraft); setAiDraft(""); }} className="rounded-full bg-cyan-700 text-white hover:bg-cyan-800 text-xs px-3 py-1">
                          Insérer dans la réponse
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Zone de réponse */}
                  {!selectedReview.answered ? (
                    <div className="border-t border-slate-100 p-4 bg-white space-y-3">
                      <Button size="sm" variant="outline" onClick={handleDraftWithAi} disabled={isAiDrafting}
                        className="rounded-full text-xs font-semibold text-cyan-700 border-cyan-200 bg-cyan-50/30 hover:bg-cyan-50 flex items-center gap-1.5">
                        {isAiDrafting ? <><RefreshCw className="size-3 animate-spin" />Rédaction...</> : <><Sparkles className="size-3 text-cyan-600" />Rédiger avec EasyCom IA</>}
                      </Button>
                      <div className="flex gap-2">
                        <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Répondre à ${selectedReview.author}...`} rows={3}
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none" />
                        <Button onClick={handleSendReply} disabled={!replyText.trim() || isSending}
                          className="rounded-xl bg-cyan-700 text-white hover:bg-cyan-800 flex flex-col justify-center px-4 self-end h-[76px]">
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


