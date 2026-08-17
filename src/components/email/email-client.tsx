"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BellRing,
  Bot,
  Check,
  Clock3,
  Filter,
  Mail,
  MessageSquareText,
  Search,
  Settings2,
  Trash2,
  TriangleAlert,
  WandSparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
import { ensurePushRegistered, enablePushNotifications, getPushPermission } from "@/lib/push/client";
import type {
  EmailAiClassification,
  EmailAiState,
  EmailCategory,
  EmailNotificationRule,
} from "@/lib/email/ai-settings";
import { describeRule } from "@/lib/email/notification-rules";

const LEVIK_EMAIL_IMAGE = AGENT_IMAGE_URLS.levik;

const CATEGORY_META: Record<
  EmailCategory,
  {
    title: string;
    icon: React.ReactNode;
    badgeClass: string;
    listBadgeClass: string;
    cardClass: string;
  }
> = {
  urgent: {
    title: "Urgent",
    icon: <TriangleAlert className="size-4" />,
    badgeClass: "border-white/20 bg-white/10 text-white",
    listBadgeClass: "border-rose-300 bg-[#e9333d] text-white",
    cardClass: "border-[#e9333d] bg-gradient-to-br from-[#ff5357] to-[#df343e] shadow-red-200",
  },
  important: {
    title: "Important",
    icon: <BellRing className="size-4" />,
    badgeClass: "border-orange-300/30 bg-orange-300/15 text-orange-50",
    listBadgeClass: "border-orange-300 bg-orange-500 text-white",
    cardClass: "border-amber-500 bg-gradient-to-br from-[#ffbd17] to-[#ee9100] shadow-amber-200",
  },
  non_important: {
    title: "Non important",
    icon: <Clock3 className="size-4" />,
    badgeClass: "border-teal-200 bg-teal-50 text-teal-800",
    listBadgeClass: "border-teal-200 bg-teal-50 text-teal-800",
    cardClass: "border-teal-200 bg-[#fffaf4] shadow-teal-100",
  },
};

const OAUTH_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  gmail_success: { tone: "success", text: "Gmail connecte avec succes." },
  gmail_cancelled: { tone: "error", text: "Connexion Gmail annulee." },
  gmail_missing_env: { tone: "error", text: "La configuration Gmail est incomplète côté serveur." },
  gmail_invalid_client: { tone: "error", text: "Le client OAuth Gmail est invalide : vérifiez que GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET proviennent du même client Google." },
  gmail_invalid_grant: { tone: "error", text: "Le code Google a expiré ou n’est plus valide. Relancez la connexion Gmail." },
  gmail_redirect_uri_mismatch: { tone: "error", text: "L’URL de redirection Gmail n’est pas autorisée dans Google Cloud." },
  gmail_no_token: { tone: "error", text: "Google n’a renvoyé aucun jeton d’accès. Relancez la connexion Gmail." },
  gmail_no_community: { tone: "error", text: "Aucune communauté n’est associée à votre compte." },
  gmail_error: { tone: "error", text: "Erreur lors de la connexion Gmail." },
};

const ALERT_OPTIONS = [
  { id: "urgent", title: "Emails urgents", description: "Recevoir une alerte uniquement pour les messages detectes comme urgents." },
  { id: "important", title: "Emails importants", description: "Suivre aussi les messages importants mais moins critiques." },
  { id: "sender", title: "Expediteur precis", description: "Notifier les emails venant d'une adresse exacte." },
  { id: "domain", title: "Domaine precis", description: "Surveiller un domaine comme association.fr." },
  { id: "subject", title: "Mot-cle dans le sujet", description: "Declencher une alerte si l'objet contient un mot important." },
  { id: "body", title: "Mot-cle dans le message", description: "Declencher une alerte sur le contenu du message." },
  { id: "attachment", title: "Piece jointe presente", description: "Etre alerte lorsqu'un document est recu." },
  { id: "unanswered", title: "Sans reponse depuis X jours", description: "Suivre les emails qui attendent une reponse depuis plusieurs jours." },
] as const;

interface EmailClientProps {
  communityId: string;
  initialConnected: boolean;
  initialEmail: string;
  initialState: EmailAiState;
  timezone: string;
}

type RuleModalState = {
  open: boolean;
  prompt: string;
  editingRuleId: string | null;
};

type AlertOptionId = (typeof ALERT_OPTIONS)[number]["id"];

type RuleBuilderState = {
  selected: AlertOptionId[];
  senderEmail: string;
  senderDomain: string;
  subjectKeyword: string;
  bodyKeyword: string;
  unansweredDays: string;
  customPrompt: string;
};

const EMPTY_RULE_BUILDER: RuleBuilderState = {
  selected: [],
  senderEmail: "",
  senderDomain: "",
  subjectKeyword: "",
  bodyKeyword: "",
  unansweredDays: "",
  customPrompt: "",
};

function buildRuleBuilderFromRule(rule?: EmailNotificationRule): RuleBuilderState {
  if (!rule) return EMPTY_RULE_BUILDER;
  const selected: AlertOptionId[] = [];
  if (rule.conditions.categories?.includes("urgent")) selected.push("urgent");
  if (rule.conditions.categories?.includes("important")) selected.push("important");
  if (rule.conditions.senderEmail) selected.push("sender");
  if (rule.conditions.senderDomain) selected.push("domain");
  if (rule.conditions.subjectKeywords?.length) selected.push("subject");
  if (rule.conditions.bodyKeywords?.length) selected.push("body");
  if (rule.conditions.hasAttachment) selected.push("attachment");
  if (rule.conditions.unansweredSinceDays) selected.push("unanswered");

  return {
    selected,
    senderEmail: rule.conditions.senderEmail ?? "",
    senderDomain: rule.conditions.senderDomain ?? "",
    subjectKeyword: rule.conditions.subjectKeywords?.[0] ?? "",
    bodyKeyword: rule.conditions.bodyKeywords?.[0] ?? "",
    unansweredDays: rule.conditions.unansweredSinceDays ? String(rule.conditions.unansweredSinceDays) : "",
    customPrompt: rule.conditions.customPrompt ?? "",
  };
}

function buildRulePrompt(builder: RuleBuilderState) {
  const parts: string[] = [];
  if (builder.selected.includes("urgent")) parts.push("Notifier seulement les emails urgents");
  if (builder.selected.includes("important")) parts.push("Notifier aussi les emails importants");
  if (builder.selected.includes("sender") && builder.senderEmail.trim()) {
    parts.push(`Notifier les emails de ${builder.senderEmail.trim()}`);
  }
  if (builder.selected.includes("domain") && builder.senderDomain.trim()) {
    parts.push(`Notifier les emails du domaine ${builder.senderDomain.trim()}`);
  }
  if (builder.selected.includes("subject") && builder.subjectKeyword.trim()) {
    parts.push(`Notifier si le sujet contient "${builder.subjectKeyword.trim()}"`);
  }
  if (builder.selected.includes("body") && builder.bodyKeyword.trim()) {
    parts.push(`Notifier si le message contient "${builder.bodyKeyword.trim()}"`);
  }
  if (builder.selected.includes("attachment")) {
    parts.push("Notifier si une piece jointe est presente");
  }
  if (builder.selected.includes("unanswered") && builder.unansweredDays.trim()) {
    parts.push(`Notifier les emails restes sans reponse depuis ${builder.unansweredDays.trim()} jours`);
  }
  if (builder.customPrompt.trim()) {
    parts.push(builder.customPrompt.trim());
  }
  if (parts.length > 0) {
    parts.push("Ne jamais notifier les newsletters");
  }

  return parts.join(". ").trim();
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function EmailClient({
  communityId,
  initialConnected,
  initialEmail,
  initialState,
  timezone,
}: EmailClientProps) {
  const searchParams = useSearchParams();
  const [googleConnected, setGoogleConnected] = useState(initialConnected);
  const [googleEmail] = useState(initialEmail);
  const [classifications, setClassifications] = useState<EmailAiClassification[]>(initialState.classifications);
  const [rules, setRules] = useState<EmailNotificationRule[]>(initialState.rules);
  const [lastClassifiedAt, setLastClassifiedAt] = useState<string | null>(initialState.lastClassifiedAt);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<EmailCategory | "all">("all");
  const [openCategory, setOpenCategory] = useState<EmailCategory | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialState.classifications[0]?.id ?? null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [ruleModal, setRuleModal] = useState<RuleModalState>({ open: false, prompt: "", editingRuleId: null });
  const [ruleBuilder, setRuleBuilder] = useState<RuleBuilderState>(EMPTY_RULE_BUILDER);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [oauthNotice, setOauthNotice] = useState<{ tone: "success" | "error"; text: string } | null>(() => {
    const status = searchParams.get("oauth");
    return status ? OAUTH_MESSAGES[status] ?? null : null;
  });
  const [pushPermission, setPushPermission] = useState(() => getPushPermission());

  const selectedMail = useMemo(
    () => classifications.find((mail) => mail.id === selectedId) ?? null,
    [classifications, selectedId]
  );

  const filteredEmails = useMemo(() => {
    return classifications.filter((mail) => {
      const matchCategory = activeCategory === "all" || mail.category === activeCategory;
      const needle = searchQuery.trim().toLowerCase();
      const matchSearch =
        !needle ||
        mail.sender.toLowerCase().includes(needle) ||
        mail.senderEmail.toLowerCase().includes(needle) ||
        mail.subject.toLowerCase().includes(needle) ||
        mail.body.toLowerCase().includes(needle);
      return matchCategory && matchSearch;
    });
  }, [activeCategory, classifications, searchQuery]);

  const visibleEmails = showAllEmails ? filteredEmails : filteredEmails.slice(0, 5);

  useEffect(() => {
    setShowAllEmails(false);
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    if (!googleConnected) return;
    void ensurePushRegistered();
    setPushPermission(getPushPermission());
  }, [googleConnected]);

  const loadRulesEvent = useEffectEvent(async () => {
    await loadRules();
  });

  const runClassificationEvent = useEffectEvent(async (trigger: "page_open" | "manual") => {
    await runClassification(trigger);
  });

  useEffect(() => {
    if (!googleConnected) return;
    void loadRulesEvent();
    void runClassificationEvent("page_open");
  }, [googleConnected]);

  useEffect(() => {
    if (!selectedId && classifications.length > 0) {
      setSelectedId(classifications[0].id);
    }
  }, [classifications, selectedId]);

  async function loadRules() {
    setRulesLoading(true);
    try {
      const response = await fetch("/api/email/notification-rules");
      const data = await readJsonSafely<{ rules?: EmailNotificationRule[] }>(response);
      if (response.ok) {
        setRules(Array.isArray(data?.rules) ? data.rules : []);
      }
    } finally {
      setRulesLoading(false);
    }
  }

  async function runClassification(trigger: "page_open" | "manual") {
    if (isClassifying) return;
    setIsClassifying(true);
    try {
      const response = await fetch("/api/email/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger, timezone }),
      });
      const data = await readJsonSafely<{
        error?: string;
        classifications?: EmailAiClassification[];
        lastClassifiedAt?: string | null;
        syncError?: string | null;
      }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "Classification impossible.");
      }
      if (data?.syncError) console.warn("[Email] Synchronisation incomplète:", data.syncError);
      const items = Array.isArray(data?.classifications) ? data.classifications : [];
      setClassifications(items);
      setLastClassifiedAt(typeof data?.lastClassifiedAt === "string" ? data.lastClassifiedAt : null);
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].id);
      }
    } catch (error) {
      console.error("[Email] Classification impossible:", error);
    } finally {
      setIsClassifying(false);
    }
  }

  function handleConnectGoogle() {
    if (googleConnected) {
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

    if (!popup) {
      setIsConnecting(false);
      window.location.href = authUrl.toString();
    }
  }

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "gmail_oauth_success") {
        setGoogleConnected(true);
        setIsConnecting(false);
        setOauthNotice(OAUTH_MESSAGES.gmail_success);
        window.location.reload();
      }
      if (event.data?.type === "gmail_oauth_error") {
        setIsConnecting(false);
        setOauthNotice(OAUTH_MESSAGES[event.data.oauth] ?? OAUTH_MESSAGES.gmail_error);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function saveRulePrompt() {
    const builtPrompt = buildRulePrompt(ruleBuilder);
    if (!builtPrompt.trim()) return;
    try {
      const response = await fetch(
        ruleModal.editingRuleId
          ? `/api/email/notification-rules/${ruleModal.editingRuleId}`
          : "/api/email/notification-rules",
        {
          method: ruleModal.editingRuleId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: builtPrompt }),
        }
      );
      const data = (await readJsonSafely<{ error?: string }>(response)) ?? {};
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      setRuleModal({ open: false, prompt: "", editingRuleId: null });
      setRuleBuilder(EMPTY_RULE_BUILDER);
      await loadRules();
      if (pushPermission !== "granted") {
        await enablePushNotifications();
        setPushPermission(getPushPermission());
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Enregistrement impossible.");
    }
  }

  async function toggleRule(rule: EmailNotificationRule) {
    const nextStatus = rule.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const response = await fetch(`/api/email/notification-rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (response.ok) {
      await loadRules();
    }
  }

  async function deleteRule(ruleId: string) {
    const response = await fetch(`/api/email/notification-rules/${ruleId}`, { method: "DELETE" });
    if (response.ok) {
      await loadRules();
    }
  }

  function openRuleModal(rule?: EmailNotificationRule) {
    const initialPrompt = rule?.conditions.customPrompt ?? "";
    setRuleModal({
      open: true,
      prompt: initialPrompt,
      editingRuleId: rule?.id ?? null,
    });
    setRuleBuilder(buildRuleBuilderFromRule(rule));
  }

  function toggleAlertOption(optionId: AlertOptionId) {
    setRuleBuilder((current) => ({
      ...current,
      selected: current.selected.includes(optionId)
        ? current.selected.filter((item) => item !== optionId)
        : [...current.selected, optionId],
    }));
  }

  function openEmail(mailId: string, scrollToReader = false) {
    setSelectedId(mailId);
    if (!scrollToReader || !window.matchMedia("(max-width: 1023px)").matches) return;

    window.requestAnimationFrame(() => {
      document.getElementById("email-reader")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 overflow-x-clip px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      <div className="relative min-h-[11rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_72%_12%,#7028bd_0%,#421388_45%,#210763_100%)] px-5 py-5 text-white shadow-[0_24px_58px_rgba(49,13,108,0.26)] sm:min-h-[17rem] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-8 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-52 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="relative z-10 max-w-[68%] sm:max-w-3xl">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20 sm:size-12"><Mail className="size-6" /></span>
          <h1 className="mt-4 text-[clamp(1.75rem,8vw,2.6rem)] font-black leading-[1.03] tracking-[-0.04em] sm:mt-5 sm:text-4xl">Email</h1>
          <p className="mt-3 hidden max-w-2xl text-sm font-semibold leading-6 text-white/80 sm:block sm:text-base">Classement intelligent, réponses assistées et alertes utiles pour garder une boîte email claire.</p>
          <div className="mt-4 hidden flex-wrap items-center gap-2 text-xs sm:flex">
            {isClassifying && (
              <Badge className="border-white/20 bg-white/10 text-white">
                Classement en cours
              </Badge>
            )}
            {lastClassifiedAt && (
              <Badge className="border-white/20 bg-white/10 text-white">
                Dernier classement : {new Date(lastClassifiedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            )}
            {googleConnected && googleEmail && (
              <Badge className="border-white/20 bg-white/10 text-white">{googleEmail}</Badge>
            )}
          </div>
        </div>
        <Image src={LEVIK_EMAIL_IMAGE} alt="Levik, agent IA Email" width={240} height={280} className="pointer-events-none absolute -bottom-3 -right-5 z-10 h-[10.5rem] w-auto object-contain object-bottom drop-shadow-[0_18px_24px_rgba(12,2,35,0.34)] sm:-right-2 sm:h-[16rem]" priority />
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

      {!googleConnected ? (
        <Card className="rounded-[2rem] border border-violet-100 bg-[#fffaf4] p-5 text-center shadow-[0_18px_46px_rgba(66,19,136,0.09)] sm:p-10">
          <CardContent className="mx-auto max-w-md space-y-4 pt-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0faeb3] to-[#078e9b] text-white shadow-lg shadow-teal-200">
              <Mail className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Google Email non connecte</h2>
            <p className="text-sm text-slate-500">
              Connectez votre boite email Google (ex: <strong>xxxx@gmail.com</strong>) pour recuperer vos conversations et utiliser la redaction assistee par IA.
            </p>
            <Button
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className="w-full rounded-2xl bg-gradient-to-r from-[#7130d8] to-[#d92d7c] px-6 py-5 text-sm font-black text-white shadow-lg shadow-violet-200 hover:brightness-105"
            >
              {isConnecting ? "Connexion en cours..." : "Connecter Google Email"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                variant="outline"
                onClick={() => openRuleModal()}
                className="w-full rounded-xl border-fuchsia-200 bg-fuchsia-50 font-black text-fuchsia-700 hover:bg-fuchsia-100 sm:w-auto"
              >
                <Settings2 className="size-4" />
                Configurer mes alertes email
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="w-fit border-violet-200 bg-violet-50 text-violet-700">Classement IA automatique</Badge>
              <Badge className="w-fit border-slate-200 bg-white text-slate-600">
                Push : {pushPermission === "granted" ? "actif" : pushPermission === "denied" ? "bloqué" : "à autoriser"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {(Object.keys(CATEGORY_META) as EmailCategory[]).map((category) => {
              const meta = CATEGORY_META[category];
              const count = classifications.filter((item) => item.category === category).length;
              const preview = classifications.filter((item) => item.category === category).slice(0, 2);
              const isOpen = openCategory === category;
              const isLightCard = category === "non_important";
              return (
                <section
                  key={category}
                  className={cn(
                    "rounded-[1.6rem] border p-4 text-left shadow-lg",
                    meta.cardClass,
                    activeCategory === category && "ring-2 ring-cyan-500/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge className={cn("border", meta.badgeClass)}>
                      {meta.icon}
                      {meta.title}
                    </Badge>
                    <span className={cn("text-sm font-bold", isLightCard ? "text-slate-950" : "text-white")}>{count} {count > 1 ? "emails" : "email"}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className={cn("text-xs", isLightCard ? "text-slate-500" : "text-white/65")}>{count === 0 ? "Aucun email à consulter" : `${count} email${count > 1 ? "s" : ""} à consulter`}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOpenCategory(isOpen ? null : category);
                        setActiveCategory(category);
                      }}
                      className={cn(
                        "h-8 shrink-0 px-3 text-xs",
                        isLightCard
                          ? "border-slate-900 bg-white text-slate-900 hover:bg-slate-900 hover:text-white"
                          : "border-white/25 bg-white/10 text-white hover:bg-white hover:text-slate-950"
                      )}
                    >
                      {isOpen ? "Fermer" : "Ouvrir"}
                    </Button>
                  </div>
                  {isOpen && (
                    <div className={cn("mt-3 space-y-2 border-t pt-3", isLightCard ? "border-slate-200" : "border-white/10")}>
                      {preview.length === 0 ? (
                        <p className={cn("text-sm", isLightCard ? "text-slate-500" : "text-white/60")}>Aucun email</p>
                      ) : (
                        preview.map((mail) => (
                          <button
                            key={mail.id}
                            type="button"
                            onClick={() => openEmail(mail.id)}
                            className={cn("block w-full rounded-md px-3 py-2 text-left", isLightCard ? "bg-slate-100 hover:bg-slate-200" : "bg-white/10 hover:bg-white/15")}
                          >
                            <p className={cn("truncate text-sm font-semibold", isLightCard ? "text-slate-900" : "text-white")}>{mail.subject}</p>
                            <p className={cn("mt-0.5 truncate text-xs", isLightCard ? "text-slate-500" : "text-white/65")}>{mail.sender}</p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.25fr] lg:gap-6">
            <Card className="min-w-0 overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_14px_36px_rgba(66,19,136,0.08)]">
              <CardHeader className="space-y-4 border-b border-violet-100 bg-[#fffaf4] p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base font-black text-slate-900"><span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2878ef] to-[#175acb] text-white shadow-md shadow-blue-200"><Mail className="size-4" /></span>Boite de reception</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Rechercher un email..."
                    className="w-full rounded-xl border border-violet-100 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              </CardHeader>
              <CardContent className="min-w-0 overflow-x-hidden p-0">
                {filteredEmails.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Mail className="mx-auto mb-3 size-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">Aucun email</p>
                  </div>
                ) : (
                  visibleEmails.map((mail) => {
                    return (
                    <div
                      key={mail.id}
                      className={cn(
                        "min-w-0 border-b border-slate-100 px-4 py-4",
                        selectedId === mail.id && "bg-violet-50/65"
                      )}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <button type="button" onClick={() => openEmail(mail.id)} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-semibold text-slate-900">{mail.sender}</p>
                          <p className="truncate text-sm text-slate-700">{mail.subject}</p>
                        </button>
                        <div className="flex shrink-0 flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                          <Badge className={cn("border", CATEGORY_META[mail.category].listBadgeClass)}>
                            {CATEGORY_META[mail.category].title}
                          </Badge>
                          <span className="text-[11px] text-slate-400">{mail.date}</span>
                        </div>
                      </div>
                      <p className="mt-2 max-w-full break-words text-xs leading-5 text-slate-500 line-clamp-2">
                        {mail.body}
                      </p>
                      {mail.body.length > 140 && (
                        <button
                          type="button"
                          onClick={() => openEmail(mail.id, true)}
                          className="mt-1 text-xs font-semibold text-cyan-700 hover:text-cyan-900"
                        >
                          Voir la suite
                        </button>
                      )}
                    </div>
                    );
                  })
                )}
                {filteredEmails.length > 5 && (
                  <div className="p-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAllEmails((current) => !current)}
                      className="min-h-11 w-full rounded-2xl border-violet-200 bg-violet-50 font-black text-[#421388] hover:bg-violet-100"
                    >
                      {showAllEmails ? "Afficher seulement les 5 derniers" : `Voir les ${filteredEmails.length - 5} autres emails`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card id="email-reader" className="scroll-mt-4 overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_14px_36px_rgba(66,19,136,0.08)]">
              {selectedMail ? (
                <>
                  <CardHeader className="border-b border-violet-100 bg-[#fffaf4]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="break-words text-lg font-bold text-slate-950">{selectedMail.subject}</CardTitle>
                        <p className="mt-1 break-all text-sm text-slate-500">
                          {selectedMail.sender} · {selectedMail.senderEmail}
                        </p>
                      </div>
                      <Badge className={cn("border", CATEGORY_META[selectedMail.category].listBadgeClass)}>
                        {CATEGORY_META[selectedMail.category].title}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-4 sm:p-6">
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/45 p-4 text-center sm:text-left">
                      <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-700">{selectedMail.body}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Raison du classement</p>
                        <p className="mt-2 text-sm text-slate-700">{selectedMail.classificationReason}</p>
                      </div>
                      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Action recommandee</p>
                        <p className="mt-2 text-sm text-slate-700">{selectedMail.actionRecommended ?? "Aucune action immediate."}</p>
                      </div>
                    </div>

                  </CardContent>
                </>
              ) : (
                <CardContent className="flex min-h-[520px] flex-col items-center justify-center gap-3 text-center text-slate-400">
                  <Mail className="size-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">Selectionnez un email</p>
                </CardContent>
              )}
            </Card>
          </div>

          <Card className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_14px_36px_rgba(66,19,136,0.08)]">
            <CardHeader className="flex flex-col items-stretch gap-3 border-b border-violet-100 bg-[#fffaf4] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-950">Mes regles de notification</CardTitle>
              </div>
              <Button
                variant="outline"
                onClick={() => openRuleModal()}
                className="w-full rounded-xl border-violet-200 bg-violet-50 font-black text-violet-700 hover:bg-violet-100 sm:w-auto"
              >
                <WandSparkles className="size-4" />
                Configurer mes alertes email
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              {rulesLoading ? (
                <p className="text-sm text-slate-500">Chargement...</p>
              ) : rules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm text-slate-400">
                  Aucune regle pour le moment.
                </div>
              ) : (
                rules.map((rule) => (
                  <div key={rule.id} className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-[#fffaf4] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{describeRule(rule)}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                      <Badge className={rule.status === "ACTIVE" ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-700"}>
                        {rule.status === "ACTIVE" ? "Active" : "Desactivee"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => openRuleModal(rule)} className="rounded-full">
                        <MessageSquareText className="size-3.5" />
                        Modifier
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleRule(rule)} className="rounded-full">
                        {rule.status === "ACTIVE" ? "Desactiver" : "Activer"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteRule(rule.id)} className="rounded-full border-red-200 text-red-600 hover:bg-red-50">
                        <Trash2 className="size-3.5" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {ruleModal.open && false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl overflow-hidden border-cyan-100 bg-white shadow-2xl shadow-slate-950/20">
            <CardHeader className="border-b border-slate-100 bg-slate-950 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl font-black">
                    <Bot className="size-5 text-cyan-200" />
                    Configurer mes alertes email
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-300">Dites a l&apos;IA quand vous voulez etre notifie.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setRuleModal({ open: false, prompt: "", editingRuleId: null });
                  setRuleBuilder(EMPTY_RULE_BUILDER);
                }} className="text-white hover:bg-white/15 hover:text-white">
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 bg-[linear-gradient(180deg,#f8fbfd_0%,#eef7fb_100%)] p-5">
              <div className="rounded-3xl border border-cyan-100 bg-white/90 p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">Choisissez quand vous voulez etre notifie</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Vous pouvez cocher plusieurs cas puis completer seulement les champs utiles.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {ALERT_OPTIONS.map((option) => {
                  const checked = ruleBuilder.selected.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleAlertOption(option.id)}
                      className={cn(
                        "rounded-3xl border p-4 text-left transition",
                        checked
                          ? "border-cyan-500 bg-cyan-50 shadow-[0_12px_30px_-20px_rgba(14,116,144,0.55)]"
                          : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border text-xs font-bold",
                            checked
                              ? "border-cyan-600 bg-cyan-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          )}
                        >
                          ✓
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-2">
                {ruleBuilder.selected.includes("sender") && (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Adresse email a surveiller</span>
                    <input
                      value={ruleBuilder.senderEmail}
                      onChange={(event) => setRuleBuilder((current) => ({ ...current, senderEmail: event.target.value }))}
                      placeholder="contact@association.fr"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>
                )}

                {ruleBuilder.selected.includes("domain") && (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Domaine a surveiller</span>
                    <input
                      value={ruleBuilder.senderDomain}
                      onChange={(event) => setRuleBuilder((current) => ({ ...current, senderDomain: event.target.value }))}
                      placeholder="association.fr"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>
                )}

                {ruleBuilder.selected.includes("subject") && (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Mot-cle dans le sujet</span>
                    <input
                      value={ruleBuilder.subjectKeyword}
                      onChange={(event) => setRuleBuilder((current) => ({ ...current, subjectKeyword: event.target.value }))}
                      placeholder="don, urgence, reunion..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>
                )}

                {ruleBuilder.selected.includes("body") && (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Mot-cle dans le message</span>
                    <input
                      value={ruleBuilder.bodyKeyword}
                      onChange={(event) => setRuleBuilder((current) => ({ ...current, bodyKeyword: event.target.value }))}
                      placeholder="inscription, paiement, confirmation..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>
                )}

                {ruleBuilder.selected.includes("unanswered") && (
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Nombre de jours sans reponse</span>
                    <input
                      type="number"
                      min="1"
                      value={ruleBuilder.unansweredDays}
                      onChange={(event) => setRuleBuilder((current) => ({ ...current, unansweredDays: event.target.value }))}
                      placeholder="3"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Demande libre</p>
                    <p className="mt-1 text-xs text-slate-500">Ajoutez une precision complementaire si besoin.</p>
                  </div>
                  <Badge className="border-cyan-200 bg-cyan-50 text-cyan-800">Optionnel</Badge>
                </div>
                <textarea
                  rows={4}
                  value={ruleBuilder.customPrompt}
                  onChange={(event) => setRuleBuilder((current) => ({ ...current, customPrompt: event.target.value }))}
                  placeholder="Ex. Seulement pendant les jours d'evenement ou pour les contacts sensibles."
                  className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                />
              </div>

              <div className="rounded-3xl border border-cyan-100 bg-cyan-50/60 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Apercu de la regle</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {buildRulePrompt(ruleBuilder) || "Selectionnez au moins une case ou ajoutez une demande libre."}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setRuleModal({ open: false, prompt: "", editingRuleId: null });
                  setRuleBuilder(EMPTY_RULE_BUILDER);
                }} className="rounded-full">
                  Annuler
                </Button>
                <Button
                  onClick={saveRulePrompt}
                  disabled={!buildRulePrompt(ruleBuilder)}
                  className="rounded-full bg-cyan-700 text-white hover:bg-cyan-800 disabled:bg-slate-300"
                >
                  Enregistrer la regle
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {ruleModal.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#170534]/60 p-2 py-4 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="my-auto w-full max-w-4xl overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffaf4] shadow-[0_28px_80px_rgba(33,7,99,0.4)]">
            <CardHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_80%_0%,#7028bd_0%,#421388_48%,#210763_100%)] px-4 py-4 text-white sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20">
                    <BellRing className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-white">Configurer mes alertes email</CardTitle>
                    <p className="mt-1 text-sm text-white/75">Choisissez les emails qui meritent une notification.</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRuleModal({ open: false, prompt: "", editingRuleId: null });
                    setRuleBuilder(EMPTY_RULE_BUILDER);
                  }}
                  className="rounded-full text-white hover:bg-white/15 hover:text-white"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="max-h-[calc(100dvh-112px)] overflow-y-auto bg-[#fffaf4] p-4 sm:max-h-[calc(92vh-84px)] sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Filter className="size-4 text-violet-700" />
                    Conditions
                  </div>
                  <div className="grid gap-2">
                    {ALERT_OPTIONS.map((option) => {
                      const checked = ruleBuilder.selected.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleAlertOption(option.id)}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition",
                            checked
                              ? "border-violet-400 bg-violet-50 shadow-sm"
                              : "border-violet-100 bg-white/80 hover:border-violet-300 hover:bg-white"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                              checked ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"
                            )}
                          >
                            {checked && <Check className="size-3.5" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-500">{option.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">Precisions</p>
                    <div className="mt-4 space-y-3">
                      {ruleBuilder.selected.includes("sender") && (
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-slate-600">Adresse email</span>
                          <input
                            value={ruleBuilder.senderEmail}
                            onChange={(event) => setRuleBuilder((current) => ({ ...current, senderEmail: event.target.value }))}
                            placeholder="contact@association.fr"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>
                      )}

                      {ruleBuilder.selected.includes("domain") && (
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-slate-600">Domaine</span>
                          <input
                            value={ruleBuilder.senderDomain}
                            onChange={(event) => setRuleBuilder((current) => ({ ...current, senderDomain: event.target.value }))}
                            placeholder="association.fr"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>
                      )}

                      {ruleBuilder.selected.includes("subject") && (
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-slate-600">Mot-cle dans le sujet</span>
                          <input
                            value={ruleBuilder.subjectKeyword}
                            onChange={(event) => setRuleBuilder((current) => ({ ...current, subjectKeyword: event.target.value }))}
                            placeholder="don, urgence, reunion"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>
                      )}

                      {ruleBuilder.selected.includes("body") && (
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-slate-600">Mot-cle dans le message</span>
                          <input
                            value={ruleBuilder.bodyKeyword}
                            onChange={(event) => setRuleBuilder((current) => ({ ...current, bodyKeyword: event.target.value }))}
                            placeholder="inscription, paiement, confirmation"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>
                      )}

                      {ruleBuilder.selected.includes("unanswered") && (
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-slate-600">Jours sans reponse</span>
                          <input
                            type="number"
                            min="1"
                            value={ruleBuilder.unansweredDays}
                            onChange={(event) => setRuleBuilder((current) => ({ ...current, unansweredDays: event.target.value }))}
                            placeholder="3"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          />
                        </label>
                      )}

                      {!["sender", "domain", "subject", "body", "unanswered"].some((id) =>
                        ruleBuilder.selected.includes(id as AlertOptionId)
                      ) && (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-400">
                          Aucune precision necessaire pour les options choisies.
                        </div>
                      )}
                    </div>
                  </div>

                  <label className="block rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                    <span className="text-sm font-semibold text-slate-900">Reponse libre</span>
                    <textarea
                      rows={4}
                      value={ruleBuilder.customPrompt}
                      onChange={(event) => setRuleBuilder((current) => ({ ...current, customPrompt: event.target.value }))}
                      placeholder="Ajouter une precision si besoin."
                      className="mt-3 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>

                  <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-fuchsia-700">Apercu</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {buildRulePrompt(ruleBuilder) || "Selectionnez au moins une condition."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRuleModal({ open: false, prompt: "", editingRuleId: null });
                    setRuleBuilder(EMPTY_RULE_BUILDER);
                  }}
                  className="rounded-xl border-violet-200 bg-white font-black text-violet-700"
                >
                  Annuler
                </Button>
                <Button
                  onClick={saveRulePrompt}
                  disabled={!buildRulePrompt(ruleBuilder)}
                  className="rounded-xl bg-gradient-to-r from-[#7130d8] to-[#d92d7c] font-black text-white shadow-lg shadow-violet-200 hover:brightness-105 disabled:bg-slate-300"
                >
                  Enregistrer la regle
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
