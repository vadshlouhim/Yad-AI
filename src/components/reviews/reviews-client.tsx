"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  MessageSquare,
  Bot,
  Sparkles,
  Clock3,
  BellRing,
  TriangleAlert,
  RefreshCw,
  CheckCircle2,
  Search,
  User,
  ShieldCheck,
  AlertTriangle,
  Heart,
  TrendingDown,
  Filter,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleReview {
  id: string;
  author: string;
  avatarLetter: string;
  rating: number;
  comment: string;
  relativeTime: string;
  timestamp: Date;
  answered: boolean;
  replyText?: string;
}

const DEFAULT_REVIEWS: GoogleReview[] = [
  {
    id: "rev-1",
    author: "Michel G.",
    avatarLetter: "M",
    rating: 1,
    comment: "Expérience catastrophique avec l'organisation de l'événement communautaire de dimanche soir. Aucun accueil à l'entrée, retard de plus d'une heure et buffet insuffisant. Très déçu pour le prix payé. J'attends un remboursement !",
    relativeTime: "Il y a 6 heures",
    timestamp: new Date(Date.now() - 6 * 3600000),
    answered: false,
  },
  {
    id: "rev-2",
    author: "Laurent D.",
    avatarLetter: "L",
    rating: 2,
    comment: "L'application de réservation de cours de Torah refuse de se lancer sur mon iPhone 14 depuis la dernière mise à jour. J'essaie de me connecter depuis 3 jours sans aucun succès. C'est dommage car les contenus ont l'air super.",
    relativeTime: "Il y a 2 jours",
    timestamp: new Date(Date.now() - 2 * 24 * 3600000),
    answered: false,
  },
  {
    id: "rev-3",
    author: "Elie M.",
    avatarLetter: "E",
    rating: 3,
    comment: "Le site web créé pour notre association est joli, mais le chargement des horaires de Chabbat prend parfois un peu de temps sur mobile. Ce serait bien d'optimiser la vitesse.",
    relativeTime: "Il y a 4 jours",
    timestamp: new Date(Date.now() - 4 * 24 * 3600000),
    answered: false,
  },
  {
    id: "rev-4",
    author: "Sarah K.",
    avatarLetter: "S",
    rating: 5,
    comment: "Une communauté extraordinaire, un accueil chaleureux et des conseils de l'IA d'une pertinence rare. Bravo à toute l'équipe de Easycom AI pour ce projet innovant !",
    relativeTime: "Il y a 5 jours",
    timestamp: new Date(Date.now() - 5 * 24 * 3600000),
    answered: true,
    replyText: "Merci beaucoup Sarah pour votre retour positif ! Votre soutien nous motive chaque jour à améliorer notre plateforme.",
  },
];

export function ReviewsClient() {
  const [gmbConnected, setGmbConnected] = useState(false);
  const [gmbLocation, setGmbLocation] = useState("");
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "URGENT_ONLY" | "UNANSWERED" | "BAD_ONLY">("ALL");
  const [replyText, setReplyText] = useState("");
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiDraft, setAiDraft] = useState("");

  useEffect(() => {
    const isConn = window.localStorage.getItem("gmb_connected") === "true";
    const loc = window.localStorage.getItem("gmb_location_name") ?? "";
    setGmbConnected(isConn);
    setGmbLocation(loc);

    if (isConn) {
      const savedReviews = window.localStorage.getItem("easycom_gmb_reviews");
      if (savedReviews) {
        setReviews(JSON.parse(savedReviews));
      } else {
        setReviews(DEFAULT_REVIEWS);
        window.localStorage.setItem("easycom_gmb_reviews", JSON.stringify(DEFAULT_REVIEWS));
      }
    }
  }, []);

  const handleConnectGMB = () => {
    if (gmbConnected) {
      window.localStorage.removeItem("gmb_connected");
      window.localStorage.removeItem("gmb_location_name");
      window.localStorage.removeItem("easycom_gmb_reviews");
      setGmbConnected(false);
      setGmbLocation("");
      setReviews([]);
      setSelectedReviewId(null);
    } else {
      const name = prompt("Saisissez le nom de votre établissement Google My Business :", "Easycom AI Paris");
      if (name && name.trim() !== "") {
        window.localStorage.setItem("gmb_connected", "true");
        window.localStorage.setItem("gmb_location_name", name.trim());
        window.localStorage.setItem("easycom_gmb_reviews", JSON.stringify(DEFAULT_REVIEWS));
        setGmbConnected(true);
        setGmbLocation(name.trim());
        setReviews(DEFAULT_REVIEWS);
        setSelectedReviewId(DEFAULT_REVIEWS[0].id);
      }
    }
  };

  // Calcul dynamique de l'urgence IA pour chaque avis
  const getAiAnalysis = (review: GoogleReview) => {
    if (review.answered) {
      return {
        level: "LOW" as const,
        label: "Normal",
        explanation: "Cet avis a déjà été répondu et classé comme traité.",
        color: "bg-slate-100 text-slate-700 border-slate-200",
        badgeIcon: <CheckCircle2 className="size-3.5" />,
      };
    }

    const hoursSinceCreated = (Date.now() - new Date(review.timestamp).getTime()) / 3600000;
    const isVeryRecent = hoursSinceCreated < 24;

    if (review.rating <= 2) {
      if (isVeryRecent) {
        return {
          level: "EXTREME" as const,
          label: "Extrême urgence",
          explanation: `Avis très négatif (${review.rating}★) reçu récemment (il y a moins de 24h) et sans réponse. Risque d'impact sur l'e-réputation important.`,
          color: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse",
          badgeIcon: <TriangleAlert className="size-3.5 text-rose-600" />,
        };
      } else {
        return {
          level: "URGENT" as const,
          label: "Urgent",
          explanation: `Avis négatif (${review.rating}★) sans réponse depuis plus de 24h. Nécessite une intervention rapide.`,
          color: "bg-amber-100 text-amber-800 border-amber-200",
          badgeIcon: <BellRing className="size-3.5 text-amber-600" />,
        };
      }
    }

    if (review.rating === 3) {
      return {
        level: "IMPORTANT" as const,
        label: "Important",
        explanation: `Avis mitigé (3★) sans réponse. Contient généralement des suggestions constructives ou des critiques modérées à traiter.`,
        color: "bg-cyan-100 text-cyan-800 border-cyan-200",
        badgeIcon: <Sparkles className="size-3.5 text-cyan-600" />,
      };
    }

    return {
      level: "LOW" as const,
      label: "Normal",
      explanation: `Avis positif (${review.rating}★) sans réponse. Il est conseillé de répondre sous 7 jours pour fidéliser.`,
      color: "bg-slate-100 text-slate-700 border-slate-200",
      badgeIcon: <Clock3 className="size-3.5 text-slate-500" />,
    };
  };

  const selectedReview = useMemo(() => {
    return reviews.find((r) => r.id === selectedReviewId) || null;
  }, [reviews, selectedReviewId]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const analysis = getAiAnalysis(r);
      if (activeFilter === "URGENT_ONLY") {
        return !r.answered && (analysis.level === "EXTREME" || analysis.level === "URGENT");
      }
      if (activeFilter === "UNANSWERED") {
        return !r.answered;
      }
      if (activeFilter === "BAD_ONLY") {
        return r.rating <= 2;
      }
      return true;
    });
  }, [reviews, activeFilter]);

  const counts = useMemo(() => {
    const total = reviews.length;
    const unanswered = reviews.filter((r) => !r.answered).length;
    const urgent = reviews.filter((r) => {
      const analysis = getAiAnalysis(r);
      return !r.answered && (analysis.level === "EXTREME" || analysis.level === "URGENT");
    }).length;
    const bad = reviews.filter((r) => r.rating <= 2).length;

    return { total, unanswered, urgent, bad };
  }, [reviews]);

  const handleDraftWithAi = () => {
    if (!selectedReview) return;
    setIsAiDrafting(true);
    setAiDraft("");

    setTimeout(() => {
      let draftText = "";
      if (selectedReview.id === "rev-1") {
        draftText = `Bonjour Michel,\n\nNous vous présentons toutes nos excuses pour ce retour d'expérience négatif concernant notre événement communautaire de dimanche soir.\n\nCe type de dysfonctionnement ne correspond absolument pas à nos standards de qualité d'accueil. Nous prenons très au sérieux votre remarque sur l'accueil et le buffet.\n\nAfin que nous puissions analyser votre dossier et organiser votre remboursement dans les plus brefs délais, pourriez-vous nous écrire directement sur chlomitaieb@gmail.com en indiquant vos coordonnées de réservation ?\n\nBien cordialement,\nL'équipe Easycom AI`;
      } else if (selectedReview.id === "rev-2") {
        draftText = `Bonjour Laurent,\n\nNous regrettons sincèrement ce problème d'accès aux cours sur votre iPhone 14. Notre équipe de développement vient justement de déployer un correctif de stabilité.\n\nNous vous invitons à mettre à jour l'application depuis l'App Store, puis à tenter une reconnexion. Si le problème persiste, n'hésitez pas à nous écrire à chlomitaieb@gmail.com pour que nous puissions vous accompagner personnellement.\n\nCordialement,\nL'équipe Easycom AI`;
      } else if (selectedReview.id === "rev-3") {
        draftText = `Bonjour Elie,\n\nMerci pour vos commentaires encourageants sur le graphisme de l'affiche et du site.\n\nNous prenons bien note de votre remarque concernant la vitesse de chargement des horaires de Chabbat sur mobile. Nous menons une opération d'optimisation technique cette semaine afin d'accélérer les performances de notre serveur mobile.\n\nBien cordialement,\nL'équipe Easycom AI`;
      } else {
        draftText = `Bonjour Sarah,\n\nUn grand merci pour ce retour chaleureux ! Nous sommes ravis que notre communauté et nos outils d'IA vous apportent satisfaction.\n\nAu plaisir de vous croiser lors d'un prochain événement !\n\nBien chaleureusement,\nL'équipe Easycom AI`;
      }
      setAiDraft(draftText);
      setIsAiDrafting(false);
    }, 1200);
  };

  const handleInsertDraft = () => {
    setReplyText(aiDraft);
    setAiDraft("");
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedReview) return;

    const updatedReviews = reviews.map((r) => {
      if (r.id === selectedReview.id) {
        return {
          ...r,
          answered: true,
          replyText: replyText,
        };
      }
      return r;
    });

    setReviews(updatedReviews);
    window.localStorage.setItem("easycom_gmb_reviews", JSON.stringify(updatedReviews));
    setReplyText("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-cyan-800/60 bg-gradient-to-br from-[#081f36] via-[#0d304f] to-[#08192d] p-6 shadow-lg shadow-slate-950/35">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-300" />
            <h1 className="mt-2 text-2xl font-bold text-white">Avis Google</h1>
            <p className="mt-1 text-sm text-cyan-100/80">
              Visualisez les avis de votre fiche Google My Business et rédigez des réponses adaptées assistées par intelligence artificielle.
            </p>
          </div>
          <div>
            <Button
              variant={gmbConnected ? "destructive" : "outline"}
              onClick={handleConnectGMB}
              className={cn(
                "rounded-full px-5 py-5 text-sm font-semibold transition-all hover:scale-[1.02]",
                gmbConnected
                  ? "bg-rose-600 hover:bg-rose-700 text-white border-none"
                  : "bg-white text-cyan-950 border-cyan-200 hover:bg-cyan-50"
              )}
            >
              {gmbConnected ? "Déconnecter la fiche" : "Connecter Google My Business"}
            </Button>
          </div>
        </div>
      </div>

      {!gmbConnected ? (
        <Card className="rounded-[28px] border border-slate-200/80 bg-white p-12 text-center shadow-[0_18px_45px_-30px_rgba(8,31,54,0.28)]">
          <CardContent className="space-y-4 max-w-md mx-auto pt-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-600 shadow-inner">
              <Star className="size-8 fill-cyan-600 text-cyan-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Google My Business non connecté</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Connectez votre fiche d&apos;établissement Google pour commencer à charger vos avis clients, analyser leur degré d&apos;urgence par l&apos;IA et y répondre automatiquement.
            </p>
            <Button
              onClick={handleConnectGMB}
              className="w-full rounded-full bg-cyan-700 text-white hover:bg-cyan-800 px-6 py-5 text-sm font-semibold transition-all"
            >
              Connecter ma fiche Google
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* List Section (Left) */}
          <Card className="lg:col-span-5 rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 space-y-4">
              <div>
                <CardTitle className="text-base text-slate-900 font-bold">Fiche : {gmbLocation}</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Google My Business connecté · {counts.total} avis chargés
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveFilter("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    activeFilter === "ALL"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Tous ({counts.total})
                </button>
                <button
                  onClick={() => setActiveFilter("URGENT_ONLY")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1",
                    activeFilter === "URGENT_ONLY"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100"
                  )}
                >
                  🚨 Urgents IA ({counts.urgent})
                </button>
                <button
                  onClick={() => setActiveFilter("UNANSWERED")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    activeFilter === "UNANSWERED"
                      ? "bg-cyan-700 text-white border-cyan-700"
                      : "bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100"
                  )}
                >
                  Sans réponse ({counts.unanswered})
                </button>
                <button
                  onClick={() => setActiveFilter("BAD_ONLY")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                    activeFilter === "BAD_ONLY"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"
                  )}
                >
                  Critiques ({counts.bad})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredReviews.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="size-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-700">Tout est en ordre !</p>
                  <p className="text-xs text-slate-400 mt-0.5">Aucun avis ne correspond à ce filtre.</p>
                </div>
              ) : (
                filteredReviews.map((rev) => {
                  const analysis = getAiAnalysis(rev);
                  return (
                    <button
                      key={rev.id}
                      onClick={() => setSelectedReviewId(rev.id)}
                      className={cn(
                        "w-full text-left p-4 transition-all hover:bg-slate-50 flex items-start gap-3",
                        selectedReviewId === rev.id ? "bg-cyan-50/50 border-l-4 border-cyan-700 pl-3" : "",
                        !rev.answered ? "bg-slate-50/20 font-semibold" : ""
                      )}
                    >
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 font-bold text-slate-600 text-sm">
                        {rev.avatarLetter}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">{rev.author}</span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">{rev.relativeTime}</span>
                        </div>
                        {/* Stars */}
                        <div className="flex items-center gap-0.5 my-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-3",
                                i < rev.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-200"
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1">
                          {rev.comment}
                        </p>

                        <div className="mt-2 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold border",
                              analysis.color
                            )}
                          >
                            {analysis.badgeIcon}
                            {analysis.label}
                          </span>
                          {rev.answered && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Répondu
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Details & Action Section (Right) */}
          <Card className="lg:col-span-7 rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            {selectedReview ? (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="border-b border-slate-100 p-4 bg-slate-50/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Avis de {selectedReview.author}</h2>
                      <p className="text-xs text-slate-500">{selectedReview.relativeTime}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "size-4.5",
                            i < selectedReview.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {/* Review Text */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/50 text-sm text-slate-800 leading-relaxed">
                    &ldquo;{selectedReview.comment}&rdquo;
                  </div>

                  {/* AI Diagnosis Panel */}
                  {(() => {
                    const analysis = getAiAnalysis(selectedReview);
                    return (
                      <div className={cn("p-4 rounded-2xl border space-y-2 bg-gradient-to-r", 
                        analysis.level === "EXTREME" ? "from-rose-50/50 to-white border-rose-200" :
                        analysis.level === "URGENT" ? "from-amber-50/50 to-white border-amber-200" :
                        analysis.level === "IMPORTANT" ? "from-cyan-50/50 to-white border-cyan-200" :
                        "from-slate-50/50 to-white border-slate-200"
                      )}>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Bot className="size-4 text-cyan-700" />
                          <span>ANALYSE IA : {analysis.label.toUpperCase()}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {analysis.explanation}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Answers timeline */}
                  {selectedReview.answered && selectedReview.replyText && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Réponse publiée</p>
                      <div className="flex flex-col max-w-[85%] ml-auto items-end space-y-1">
                        <div className="rounded-2xl p-4 text-sm leading-relaxed bg-cyan-700 text-white rounded-tr-none shadow-sm">
                          <p className="whitespace-pre-line">{selectedReview.replyText}</p>
                        </div>
                        <span className="text-[10px] text-slate-400">Publié avec Easycom AI</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Draft Suggestion Box */}
                {aiDraft && (
                  <div className="mx-6 my-2 p-4 rounded-2xl bg-cyan-50 border border-cyan-200/80 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-800">
                        <Bot className="size-4 text-cyan-700 animate-bounce" />
                        Réponse IA Proposée
                      </span>
                      <button
                        onClick={() => setAiDraft("")}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Annuler
                      </button>
                    </div>
                    <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed border-l-2 border-cyan-300 pl-3">
                      {aiDraft}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleInsertDraft}
                        className="rounded-full bg-cyan-700 text-white hover:bg-cyan-800 text-xs font-semibold px-3 py-1 flex items-center gap-1"
                      >
                        Insérer dans la réponse
                      </Button>
                    </div>
                  </div>
                )}

                {/* Footer Input Area */}
                {!selectedReview.answered ? (
                  <div className="border-t border-slate-100 p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDraftWithAi}
                        disabled={isAiDrafting}
                        className="rounded-full text-xs font-semibold text-cyan-700 border-cyan-200 bg-cyan-50/30 hover:bg-cyan-50 flex items-center gap-1.5 py-1"
                      >
                        {isAiDrafting ? (
                          <>
                            <RefreshCw className="size-3 animate-spin" />
                            Rédaction en cours...
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3 text-cyan-600" />
                            Rédiger une réponse IA adaptée
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Répondre à ${selectedReview.author}...`}
                        rows={3}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                      />
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                        className="rounded-xl bg-cyan-700 text-white hover:bg-cyan-800 flex flex-col justify-center px-4 self-end h-[76px] transition-all"
                      >
                        <Send className="size-4 mb-1" />
                        <span className="text-[10px] font-semibold">Publier</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 text-center text-xs text-slate-400">
                    Cet avis a été traité. Pour modifier la réponse, veuillez vous rendre sur Google My Business.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 bg-slate-50/10">
                <Star className="size-12 mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">Aucun avis sélectionné</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1 leading-normal">
                  Sélectionnez un avis dans la liste de gauche pour lire le message et rédiger une réponse.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
