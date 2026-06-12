"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Send,
  Bot,
  Sparkles,
  Clock3,
  BellRing,
  TriangleAlert,
  RefreshCw,
  CheckCircle2,
  Search,
  User,
  Plus,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Priority = "EXTREME" | "URGENT" | "IMPORTANT" | "LOW";

interface EmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  date: string;
  timestamp: Date;
  read: boolean;
  priority: Priority;
  history: Array<{
    role: "user" | "assistant";
    body: string;
    date: string;
  }>;
}

const DEFAULT_EMAILS: EmailMessage[] = [
  {
    id: "mail-1",
    sender: "Sarah Cohen",
    senderEmail: "chlomitaieb@gmail.com",
    subject: "Demande urgente : Horaires de Chabbat et inscription repas",
    body: "Bonjour l'équipe d'Yad.ia, nous venons d'arriver dans la région et nous aimerions assister aux offices de ce week-end. Pouvez-vous nous donner les horaires précis de l'entrée et sortie de Chabbat pour notre ville de Paris ? De plus, reste-t-il de la place pour le dîner communautaire de vendredi soir ? C'est très important car nous sommes avec des enfants en bas âge. Merci !",
    date: "Il y a 10 min",
    timestamp: new Date(Date.now() - 10 * 60000),
    read: false,
    priority: "EXTREME",
    history: [
      {
        role: "user",
        body: "Bonjour l'équipe d'Yad.ia, nous venons d'arriver dans la région et nous aimerions assister aux offices de ce week-end. Pouvez-vous nous donner les horaires précis de l'entrée et sortie de Chabbat pour notre ville de Paris ? De plus, reste-t-il de la place pour le dîner communautaire de vendredi soir ? C'est très important car nous sommes avec des enfants en bas âge. Merci !",
        date: "Il y a 10 min",
      }
    ],
  },
  {
    id: "mail-2",
    sender: "David Abitbol",
    senderEmail: "david.a@example.com",
    subject: "Problème d'accès aux cours de Torah en ligne",
    body: "Shalom, je me suis inscrit la semaine dernière pour les cours de Torah IA et je n'ai toujours pas reçu mes accès par e-mail. Pouvez-vous débloquer mon compte ? Les cours commencent ce soir et j'aimerais vraiment pouvoir me connecter à temps. Mon identifiant de connexion est david.a@example.com. Merci pour votre aide rapide.",
    date: "Il y a 1 heure",
    timestamp: new Date(Date.now() - 60 * 60000),
    read: false,
    priority: "URGENT",
    history: [
      {
        role: "user",
        body: "Shalom, je me suis inscrit la semaine dernière pour les cours de Torah IA et je n'ai toujours pas reçu mes accès par e-mail. Pouvez-vous débloquer mon compte ? Les cours commencent ce soir et j'aimerais vraiment pouvoir me connecter à temps. Mon identifiant de connexion est david.a@example.com. Merci pour votre aide rapide.",
        date: "Il y a 1 heure",
      }
    ],
  },
  {
    id: "mail-3",
    sender: "Miriam Levy",
    senderEmail: "miriam.levy@example.com",
    subject: "Affiche de la kermesse de fin d'année",
    body: "Bonjour, je tenais à vous féliciter pour la superbe affiche que l'IA a générée pour notre kermesse de fin d'année. C'est magnifique ! Serait-il possible de m'envoyer le fichier en haute définition pour que nous puissions l'imprimer en format A2 pour l'affichage de rue ? Merci pour tout votre travail pour notre communauté.",
    date: "Il y a 1 jour",
    timestamp: new Date(Date.now() - 24 * 60 * 60000),
    read: true,
    priority: "IMPORTANT",
    history: [
      {
        role: "user",
        body: "Bonjour, je tenais à vous féliciter pour la superbe affiche que l'IA a générée pour notre kermesse de fin d'année. C'est magnifique ! Serait-il possible de m'envoyer le fichier en haute définition pour que nous puissions l'imprimer en format A2 pour l'affichage de rue ? Merci pour tout votre travail pour notre communauté.",
        date: "Il y a 1 jour",
      }
    ],
  },
  {
    id: "mail-4",
    sender: "Jérôme Benhamou",
    senderEmail: "j.benhamou@example.com",
    subject: "Question sur le fonctionnement de la boutique solidaire",
    body: "Bonjour, j'aimerais savoir si la boutique accepte les dons de vêtements neufs pour les fêtes à venir et si vous délivrez des reçus Cerfa de déduction fiscale pour ces dons en nature. Je n'ai pas trouvé l'info précise sur votre site. Bien cordialement.",
    date: "Il y a 3 jours",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60000),
    read: true,
    priority: "LOW",
    history: [
      {
        role: "user",
        body: "Bonjour, j'aimerais savoir si la boutique accepte les dons de vêtements neufs pour les fêtes à venir et si vous délivrez des reçus Cerfa de déduction fiscale pour ces dons en nature. Je n'ai pas trouvé l'info précise sur votre site. Bien cordialement.",
        date: "Il y a 3 jours",
      }
    ],
  },
];

const PRIORITY_META = {
  EXTREME: {
    title: "Extrême urgence",
    icon: <TriangleAlert className="size-4" />,
    accentClassName: "text-rose-700 bg-rose-50 border-rose-200",
    surfaceClassName: "from-rose-50/60 via-white to-rose-100/10 border-rose-200",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
  },
  URGENT: {
    title: "Urgent",
    icon: <BellRing className="size-4" />,
    accentClassName: "text-amber-700 bg-amber-50 border-amber-200",
    surfaceClassName: "from-amber-50/60 via-white to-orange-50/10 border-amber-200",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  IMPORTANT: {
    title: "Important",
    icon: <Sparkles className="size-4" />,
    accentClassName: "text-cyan-700 bg-cyan-50 border-cyan-200",
    surfaceClassName: "from-cyan-50/60 via-white to-sky-50/10 border-cyan-200",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  LOW: {
    title: "Non important",
    icon: <Clock3 className="size-4" />,
    accentClassName: "text-slate-600 bg-slate-50 border-slate-200",
    surfaceClassName: "from-slate-50/60 via-white to-slate-100/10 border-slate-200",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

interface EmailClientProps {
  communityId: string;
  initialConnected: boolean;
  initialEmail: string;
}

const GMAIL_OAUTH_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  gmail_success: { tone: "success", text: "Gmail connecté avec succès." },
  gmail_cancelled: { tone: "error", text: "Connexion Gmail annulée." },
  gmail_missing_code: { tone: "error", text: "Google n'a pas renvoyé de code d'autorisation." },
  gmail_missing_env: { tone: "error", text: "Configuration Gmail manquante côté serveur." },
  gmail_invalid_client: {
    tone: "error",
    text: "Client Gmail invalide : vérifiez que GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET correspondent au même client OAuth Google.",
  },
  gmail_invalid_grant: { tone: "error", text: "Code ou refresh token Gmail invalide. Révoquez l'accès Google puis reconnectez Gmail." },
  gmail_redirect_uri_mismatch: { tone: "error", text: "URL de redirection Gmail non autorisée dans Google Cloud." },
  gmail_no_token: { tone: "error", text: "Aucun token Gmail reçu. Réessayez en forçant le consentement." },
  gmail_no_community: { tone: "error", text: "Communauté introuvable. Vérifiez votre profil." },
  gmail_error: { tone: "error", text: "Erreur lors de la connexion Gmail. Réessayez." },
};

export function EmailClient({ communityId, initialConnected, initialEmail }: EmailClientProps) {
  const searchParams = useSearchParams();
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const [googleConnected, setGoogleConnected] = useState(initialConnected);
  const [googleEmail, setGoogleEmail] = useState(initialEmail);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [hasClassified, setHasClassified] = useState(false);
  const [activePriorityTab, setActivePriorityTab] = useState<Priority | "ALL">("ALL");
  const [replyText, setReplyText] = useState("");
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [aiDraft, setAiDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<{ tone: "success" | "error"; text: string } | null>(() => {
    const status = searchParams.get("oauth");
    return status ? GMAIL_OAUTH_MESSAGES[status] ?? null : null;
  });

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/email/gmail/list");
      if (response.ok) {
        const data = await response.json();
        setEmails(data.messages || []);
        if (data.messages?.length > 0 && !selectedMailId) {
          setSelectedMailId(data.messages[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch emails", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (googleConnected) {
      fetchEmails();
    }
  }, [googleConnected]);

  // Écouter le postMessage du popup OAuth Gmail
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin && event.origin !== appOrigin) return;
      if (event.data?.type === "gmail_oauth_success") {
        setGoogleConnected(true);
        setIsConnecting(false);
        setOauthNotice(GMAIL_OAUTH_MESSAGES.gmail_success);
        // Recharger la page pour récupérer les données à jour depuis le serveur
        window.location.reload();
      } else if (event.data?.type === "gmail_oauth_error") {
        setIsConnecting(false);
        const status = typeof event.data.oauth === "string" ? event.data.oauth : "gmail_error";
        setOauthNotice(GMAIL_OAUTH_MESSAGES[status] ?? GMAIL_OAUTH_MESSAGES.gmail_error);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [appOrigin]);

  const handleConnectGoogle = () => {
    if (googleConnected) {
      // Déconnexion — on recharge pour mettre à jour l'état serveur
      window.location.href = "/api/email/gmail/disconnect";
      return;
    }

    setIsConnecting(true);
    const authUrl = new URL("/api/email/gmail/auth", window.location.origin);
    authUrl.searchParams.set("communityId", communityId);
    authUrl.searchParams.set("returnTo", "email_popup");

    const popup = window.open(
      authUrl.toString(),
      "gmail_oauth",
      "width=520,height=660,left=200,top=100,toolbar=0,menubar=0,location=0"
    );

    // Fallback : si le popup est bloqué
    if (!popup) {
      setIsConnecting(false);
      window.location.href = authUrl.toString().replace("email_popup", "settings");
    }
  };

  const selectedMail = useMemo(() => {
    return emails.find((m) => m.id === selectedMailId) || null;
  }, [emails, selectedMailId]);

  const filteredEmails = useMemo(() => {
    return emails.filter((mail) => {
      // Filtre recherche
      const matchesSearch =
        mail.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mail.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mail.body.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtre priorité
      const matchesPriority =
        activePriorityTab === "ALL" || mail.priority === activePriorityTab;

      return matchesSearch && matchesPriority;
    });
  }, [emails, searchQuery, activePriorityTab]);

  const handleClassify = () => {
    setIsClassifying(true);
    setTimeout(() => {
      setIsClassifying(false);
      setHasClassified(true);
    }, 2000);
  };

  const handleDraftWithAi = () => {
    if (!selectedMail) return;
    setIsAiDrafting(true);
    setAiDraft("");

    setTimeout(() => {
      let draftText = "";
      if (selectedMail.id === "mail-1") {
        draftText = `Bonjour Sarah,\n\nBienvenue à Paris ! C'est un plaisir de vous accueillir dans notre communauté.\n\nVoici les horaires de Chabbat pour ce week-end à Paris :\n- Entrée de Chabbat : 21h12\n- Sortie de Chabbat : 22h24\n\nPour ce qui est du dîner communautaire de vendredi soir, il nous reste effectivement quelques places adaptées aux familles. Pouvez-vous nous confirmer le nombre exact d'adultes et d'enfants afin de valider votre réservation ?\n\nNous restons à votre entière disposition.\n\nChabbat Chalom,\nL'équipe Yad.ia`;
      } else if (selectedMail.id === "mail-2") {
        draftText = `Shalom David,\n\nNous vous présentons toutes nos excuses pour ce contretemps technique. Après vérification de notre base de données, vos accès pour les cours de Torah IA ont bien été activés.\n\nUn e-mail de connexion automatique contenant votre mot de passe temporaire vient de vous être renvoyé à l'adresse david.a@example.com. Pensez à vérifier vos courriers indésirables (spams) si vous ne le voyez pas dans votre boîte de réception d'ici quelques minutes.\n\nNous vous souhaitons d'excellents moments d'étude en ligne.\n\nCordialement,\nL'équipe Yad.ia`;
      } else if (selectedMail.id === "mail-3") {
        draftText = `Bonjour Miriam,\n\nUn grand merci pour vos encouragements ! Nous transmettons vos chaleureux remerciements à l'équipe technique.\n\nC'est avec grand plaisir que nous vous envoyons ci-joint le fichier haute définition (PDF 300 DPI) optimisé pour un tirage A2 grand format.\n\nExcellente kermesse à toute la communauté !\n\nBien chaleureusement,\nL'équipe Yad.ia`;
      } else {
        draftText = `Bonjour Jérôme,\n\nNous vous remercions pour votre intérêt pour notre boutique solidaire.\n\nNous acceptons avec joie les dons de vêtements neufs pour les fêtes. Concernant les déductions fiscales, notre structure étant reconnue d'utilité publique, nous pouvons effectivement vous délivrer un reçu Cerfa de don en nature sur présentation de la facture ou justificatif de valeur d'achat des vêtements neufs concernés.\n\nN'hésitez pas à nous recontacter pour organiser le dépôt.\n\nBien cordialement,\nL'équipe Yad.ia`;
      }
      setAiDraft(draftText);
      setIsAiDrafting(false);
    }, 1500);
  };

  const handleInsertDraft = () => {
    setReplyText(aiDraft);
    setAiDraft("");
  };

  const [isSending, setIsSending] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMail || isSending) return;

    setIsSending(false); // Reset state just in case
    setIsSending(true);
    try {
      const response = await fetch("/api/email/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedMail.senderEmail,
          subject: `Re: ${selectedMail.subject}`,
          bodyText: replyText,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        alert(`Erreur Gmail : ${errData.error || "Une erreur est survenue lors de l'envoi."}`);
        setIsSending(false);
        return;
      }

      const updatedEmails = emails.map((mail) => {
        if (mail.id === selectedMail.id) {
          return {
            ...mail,
            read: true,
            priority: "LOW" as Priority,
            history: [
              ...mail.history,
              {
                role: "assistant" as const,
                body: replyText,
                date: "À l'instant",
              },
            ],
          };
        }
        return mail;
      });

      setEmails(updatedEmails);
      window.localStorage.setItem("easycom_emails", JSON.stringify(updatedEmails));
      setReplyText("");
    } catch (err) {
      alert(`Erreur de connexion : ${err instanceof Error ? err.message : "Impossible de contacter le serveur Gmail."}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-cyan-800/60 bg-gradient-to-br from-[#081f36] via-[#0d304f] to-[#08192d] p-6 shadow-lg shadow-slate-950/35">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-300" />
            <h1 className="mt-2 text-2xl font-bold text-white">Email</h1>
            <p className="mt-1 text-sm text-cyan-100/80">
              Gérez votre messagerie Google et automatisez les réponses à vos e-mails grâce à l&apos;intelligence artificielle de Yad.ia.
            </p>
          </div>
          <div>
            <div className="flex flex-col items-end gap-2">
              {googleConnected && googleEmail && (
                <p className="text-xs text-cyan-200/70">{googleEmail}</p>
              )}
              {googleConnected && (
                <Button
                  variant="outline"
                  onClick={fetchEmails}
                  disabled={isLoading}
                  className="rounded-full border-cyan-200/40 bg-white/10 px-5 py-5 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                  {isLoading ? "Actualisation…" : "Actualiser les emails"}
                </Button>
              )}
              <Button
                variant={googleConnected ? "destructive" : "outline"}
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className={cn(
                  "rounded-full px-5 py-5 text-sm font-semibold transition-all hover:scale-[1.02]",
                  googleConnected
                    ? "bg-rose-600 hover:bg-rose-700 text-white border-none"
                    : "bg-white text-cyan-950 border-cyan-200 hover:bg-cyan-50"
                )}
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="size-4 animate-spin" />
                    Connexion en cours…
                  </span>
                ) : googleConnected ? "Déconnecter Google" : "Connecter ma messagerie"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {oauthNotice && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
            oauthNotice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{oauthNotice.text}</p>
        </div>
      )}

      {/* Encarts de priorité IA */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(PRIORITY_META) as Priority[]).map((key) => {
          const meta = PRIORITY_META[key];
          const count = emails.filter((mail) => mail.priority === key && !mail.read).length;

          return (
            <button
              key={key}
              onClick={() => setActivePriorityTab(activePriorityTab === key ? "ALL" : key)}
              className={cn(
                "rounded-[24px] border bg-gradient-to-br p-5 text-left shadow-[0_14px_34px_-28px_rgba(8,31,54,0.45)] transition-all duration-200 hover:-translate-y-0.5",
                meta.surfaceClassName,
                activePriorityTab === key ? "ring-2 ring-cyan-500/50 shadow-md scale-[1.01]" : ""
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                    meta.accentClassName
                  )}
                >
                  {meta.icon}
                  {meta.title}
                </span>
                {hasClassified && count > 0 && (
                  <Badge className={cn("border", meta.badgeColor)}>
                    {count} non géré{count > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              <div className="mt-4 min-h-[90px] flex flex-col justify-center">
                {!hasClassified ? (
                  <>
                    <p className="text-sm font-semibold text-slate-700">Aucune donnée classée pour le moment</p>
                    <p className="mt-1 text-xs text-slate-500 leading-normal">
                      Cette zone affichera les messages identifiés comme {meta.title.toLowerCase()} dès que la classification IA sera alimentée.
                    </p>
                  </>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {emails.filter((m) => m.priority === key).length} e-mail{emails.filter((m) => m.priority === key).length > 1 ? "s" : ""} identifié{emails.filter((m) => m.priority === key).length > 1 ? "s" : ""}
                    </p>
                    <div className="mt-2 space-y-1">
                      {emails
                        .filter((m) => m.priority === key)
                        .slice(0, 2)
                        .map((m) => (
                          <div key={m.id} className="text-xs text-slate-500 truncate">
                            • <strong>{m.sender}</strong> : {m.subject}
                          </div>
                        ))}
                      {emails.filter((m) => m.priority === key).length > 2 && (
                        <div className="text-[10px] text-cyan-600 font-medium">
                          + {emails.filter((m) => m.priority === key).length - 2} autres...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main interface */}
      {!googleConnected ? (
        <Card className="rounded-[28px] border border-slate-200/80 bg-white p-12 text-center shadow-[0_18px_45px_-30px_rgba(8,31,54,0.28)]">
          <CardContent className="space-y-4 max-w-md mx-auto pt-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-600 shadow-inner">
              <Mail className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Messagerie non connectée</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Connectez votre boîte email Google (ex: <strong>chlomitaieb@gmail.com</strong>) pour récupérer vos conversations et utiliser la rédaction assistée par IA.
            </p>
            <Button
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className="w-full rounded-full bg-cyan-700 text-white hover:bg-cyan-800 px-6 py-5 text-sm font-semibold transition-all"
            >
              {isConnecting ? (
                <span className="flex items-center gap-2 justify-center">
                  <RefreshCw className="size-4 animate-spin" />
                  Connexion en cours…
                </span>
              ) : (
                "Se connecter avec Google"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* List Section (Left) */}
          <Card className="lg:col-span-5 rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base text-slate-900 font-bold">Boîte de réception</CardTitle>
                <Button
                  size="sm"
                  onClick={handleClassify}
                  disabled={isClassifying}
                  className="rounded-full bg-cyan-700 text-white hover:bg-cyan-800 text-xs font-semibold px-3 py-1 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {isClassifying ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      Scan IA...
                    </>
                  ) : (
                    <>
                      <Bot className="size-3.5" />
                      Classer par IA
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {activePriorityTab !== "ALL" && (
                <div className="flex items-center justify-between bg-cyan-50 text-cyan-800 text-xs px-3 py-2 rounded-xl border border-cyan-100">
                  <span>Filtré par : <strong>{PRIORITY_META[activePriorityTab].title}</strong></span>
                  <button
                    onClick={() => setActivePriorityTab("ALL")}
                    className="text-[10px] font-bold text-cyan-600 hover:text-cyan-900 underline"
                  >
                    Effacer le filtre
                  </button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredEmails.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Mail className="size-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold">Aucun e-mail trouvé</p>
                  <p className="text-xs text-slate-400">Essayez de modifier vos critères de recherche.</p>
                </div>
              ) : (
                filteredEmails.map((mail) => (
                  <button
                    key={mail.id}
                    onClick={() => setSelectedMailId(mail.id)}
                    className={cn(
                      "w-full text-left p-4 transition-all hover:bg-slate-50 flex items-start gap-3",
                      selectedMailId === mail.id ? "bg-cyan-50/50 border-l-4 border-cyan-700 pl-3" : "",
                      !mail.read ? "bg-slate-50/20 font-semibold" : ""
                    )}
                  >
                    <div className="relative h-9 w-9 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="size-5 text-slate-500" />
                      {!mail.read && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cyan-600 ring-2 ring-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm text-slate-900", !mail.read ? "font-bold" : "font-semibold")}>
                          {mail.sender}
                        </span>
                        <span className="flex-shrink-0 text-[11px] text-slate-400">{mail.date}</span>
                      </div>
                      <p className={cn("truncate text-sm", !mail.read ? "font-semibold text-slate-900" : "text-slate-700")}>
                        {mail.subject}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{mail.body}</p>

                      {hasClassified && (
                        <div className="mt-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border",
                              PRIORITY_META[mail.priority].badgeColor
                            )}
                          >
                            {PRIORITY_META[mail.priority].icon}
                            {PRIORITY_META[mail.priority].title}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chat/Reader Section (Right) */}
          <Card className="lg:col-span-7 rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            {selectedMail ? (
              <div className="flex flex-col h-full">
                {/* Mail Header */}
                <div className="border-b border-slate-100 p-4 bg-slate-50/30 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{selectedMail.subject}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      De : <strong>{selectedMail.sender}</strong> ({selectedMail.senderEmail})
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Google Connecté
                  </Badge>
                </div>

                {/* Messages Box (Messenger Bubble Style) */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/10 min-h-[350px]">
                  {selectedMail.history.map((msg, index) => {
                    const isAssistant = msg.role === "assistant";
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex flex-col max-w-[85%] space-y-1",
                          isAssistant ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                            isAssistant
                              ? "bg-cyan-700 text-white rounded-tr-none"
                              : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50"
                          )}
                        >
                          <p className="whitespace-pre-line">{msg.body}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 px-1">{msg.date}</span>
                      </div>
                    );
                  })}
                </div>

                {/* AI Draft Suggestion Box */}
                {aiDraft && (
                  <div className="mx-6 my-2 p-4 rounded-2xl bg-cyan-50 border border-cyan-200/80 shadow-sm space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-800">
                        <Bot className="size-4 text-cyan-700 animate-bounce" />
                        Réponse IA Proposée
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAiDraft("")}
                        className="text-xs text-slate-400 hover:text-slate-600 h-6 px-1.5"
                      >
                        Annuler
                      </Button>
                    </div>
                    <div className="text-xs text-slate-700 max-h-[150px] overflow-y-auto whitespace-pre-line leading-relaxed border-l-2 border-cyan-300 pl-3">
                      {aiDraft}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleInsertDraft}
                        className="rounded-full bg-cyan-700 text-white hover:bg-cyan-800 text-xs font-semibold px-3 py-1 flex items-center gap-1"
                      >
                        Insérer dans le message
                      </Button>
                    </div>
                  </div>
                )}

                {/* Footer Input Area */}
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
                          Rédiger avec Yad.ia
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Répondre à ${selectedMail.sender}...`}
                      rows={3}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || isSending}
                      className="rounded-xl bg-cyan-700 text-white hover:bg-cyan-800 flex flex-col justify-center px-4 self-end h-[76px] transition-all"
                    >
                      {isSending ? (
                        <>
                          <RefreshCw className="size-4 mb-1 animate-spin" />
                          <span className="text-[10px] font-semibold">Envoi...</span>
                        </>
                      ) : (
                        <>
                          <Send className="size-4 mb-1" />
                          <span className="text-[10px] font-semibold">Envoyer</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 bg-slate-50/10">
                <Mail className="size-12 mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">Aucun message sélectionné</p>
                <p className="text-xs text-slate-500 max-w-xs mt-1 leading-normal">
                  Sélectionnez un email dans la liste de gauche pour lire la conversation et y répondre.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
