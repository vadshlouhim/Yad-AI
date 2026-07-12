"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
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
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  TriangleAlert,
  WandSparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ensurePushRegistered, enablePushNotifications, getPushPermission } from "@/lib/push/client";
import type {
  EmailAiClassification,
  EmailAiState,
  EmailCategory,
  EmailNotificationRule,
} from "@/lib/email/ai-settings";
import { describeRule } from "@/lib/email/notification-rules";

const CATEGORY_META: Record<
  EmailCategory,
  {
    title: string;
    icon: React.ReactNode;
    badgeClass: string;
    cardClass: string;
  }
> = {
  urgent: {
    title: "Urgent",
    icon: <TriangleAlert className="size-4" />,
    badgeClass: "border-rose-200 bg-rose-100 text-rose-800",
    cardClass: "border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-red-50/40",
  },
  important: {
    title: "Important",
    icon: <BellRing className="size-4" />,
    badgeClass: "border-amber-200 bg-amber-100 text-amber-800",
    cardClass: "border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/30",
  },
  non_important: {
    title: "Non important",
    icon: <Clock3 className="size-4" />,
    badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
    cardClass: "border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/30",
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
  const [selectedId, setSelectedId] = useState<string | null>(initialState.classifications[0]?.id ?? null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [draftSuggestion, setDraftSuggestion] = useState("");
  const [ruleModal, setRuleModal] = useState<RuleModalState>({ open: false, prompt: "", editingRuleId: null });
  const [ruleBuilder, setRuleBuilder] = useState<RuleBuilderState>(EMPTY_RULE_BUILDER);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
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
    setClassificationError(null);
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
      if (data?.syncError) {
        setClassificationError(data.syncError);
      }
      const items = Array.isArray(data?.classifications) ? data.classifications : [];
      setClassifications(items);
      setLastClassifiedAt(typeof data?.lastClassifiedAt === "string" ? data.lastClassifiedAt : null);
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].id);
      }
    } catch (error) {
      setClassificationError(error instanceof Error ? error.message : "Classification impossible.");
    } finally {
      setIsClassifying(false);
    }
  }

  async function refreshEmails() {
    if (!googleConnected) return;
    setIsLoadingEmails(true);
    try {
      await runClassification("manual");
    } finally {
      setIsLoadingEmails(false);
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

  async function handleDraftWithAi() {
    if (!selectedMail || isDrafting) return;
    setIsDrafting(true);
    setDraftSuggestion("");
    try {
      const response = await fetch("/api/email/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: selectedMail.sender,
          subject: selectedMail.subject,
          body: selectedMail.body,
          history: selectedMail.history,
        }),
      });
      const data = (await readJsonSafely<{ error?: string; draft?: string }>(response)) ?? {};
      if (!response.ok) {
        throw new Error(data.error ?? "Rédaction IA impossible.");
      }
      setDraftSuggestion(data.draft ?? "");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Rédaction IA impossible.");
    } finally {
      setIsDrafting(false);
    }
  }

  async function handleSendReply() {
    if (!selectedMail || !replyText.trim() || isSending) return;
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
      const data = (await readJsonSafely<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        throw new Error(data.error ?? "Envoi impossible.");
      }
      setReplyText("");
      setDraftSuggestion("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setIsSending(false);
    }
  }

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-cyan-800/60 bg-gradient-to-br from-[#081f36] via-[#0d304f] to-[#08192d] p-6 shadow-lg shadow-slate-950/35">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 h-1.5 w-10 rounded-full bg-cyan-300" />
            <h1 className="mt-2 text-2xl font-bold text-white">Email</h1>
            <p className="mt-1 text-sm text-cyan-100/80">
              Classement intelligent, reponses assistees et alertes utiles, sans bruit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isClassifying && (
              <Badge className="border-cyan-200/30 bg-cyan-400/15 text-cyan-50">
                Classement en cours
              </Badge>
            )}
            {lastClassifiedAt && (
              <Badge className="border-white/20 bg-white/10 text-white">
                Dernier classement : {new Date(lastClassifiedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            )}
            {googleConnected && googleEmail && (
              <Badge className="border-cyan-200/30 bg-white/10 text-cyan-50">{googleEmail}</Badge>
            )}
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

      {classificationError && googleConnected && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{classificationError}</p>
        </div>
      )}

      {!googleConnected ? (
        <Card className="rounded-[28px] border border-slate-200/80 bg-white p-10 text-center shadow-[0_18px_45px_-30px_rgba(8,31,54,0.28)]">
          <CardContent className="mx-auto max-w-md space-y-4 pt-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-600 shadow-inner">
              <Mail className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Google Email non connecte</h2>
            <p className="text-sm text-slate-500">
              Connectez votre boite email Google (ex: <strong>xxxx@gmail.com</strong>) pour recuperer vos conversations et utiliser la redaction assistee par IA.
            </p>
            <Button
              onClick={handleConnectGoogle}
              disabled={isConnecting}
              className="w-full rounded-full bg-cyan-700 px-6 py-5 text-sm font-semibold text-white hover:bg-cyan-800"
            >
              {isConnecting ? "Connexion en cours..." : "Connecter Google Email"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={refreshEmails}
                disabled={isLoadingEmails || isClassifying}
                className="rounded-full border-slate-200"
              >
                <RefreshCw className={cn("size-4", (isLoadingEmails || isClassifying) && "animate-spin")} />
                {isLoadingEmails ? "Actualisation..." : "Classer les emails par IA"}
              </Button>
              <Button
                variant="outline"
                onClick={() => openRuleModal()}
                className="rounded-full border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
              >
                <Settings2 className="size-4" />
                Configurer mes alertes email
              </Button>
            </div>
            <Badge className="border-slate-200 bg-white text-slate-600">
              Push navigateur : {pushPermission === "granted" ? "active" : pushPermission === "denied" ? "bloque" : "a autoriser"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(CATEGORY_META) as EmailCategory[]).map((category) => {
              const meta = CATEGORY_META[category];
              const count = classifications.filter((item) => item.category === category).length;
              const preview = classifications.filter((item) => item.category === category).slice(0, 2);
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(activeCategory === category ? "all" : category)}
                  className={cn(
                    "rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5",
                    meta.cardClass,
                    activeCategory === category && "ring-2 ring-cyan-500/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge className={cn("border", meta.badgeClass)}>
                      {meta.icon}
                      {meta.title}
                    </Badge>
                    <span className="text-sm font-bold text-slate-900">{count}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {preview.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-3 py-4 text-sm text-slate-400">
                        Aucun email
                      </div>
                    ) : (
                      preview.map((mail) => (
                        <div key={mail.id} className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3">
                          <p className="truncate text-sm font-semibold text-slate-900">{mail.subject}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{mail.sender}</p>
                        </div>
                      ))
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader className="space-y-4 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">Boite de reception</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Rechercher un email..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </CardHeader>
              <CardContent className="max-h-[760px] overflow-y-auto p-0">
                {filteredEmails.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Mail className="mx-auto mb-3 size-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">Aucun email</p>
                  </div>
                ) : (
                  filteredEmails.map((mail) => (
                    <button
                      key={mail.id}
                      onClick={() => setSelectedId(mail.id)}
                      className={cn(
                        "w-full border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50",
                        selectedId === mail.id && "bg-cyan-50/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{mail.sender}</p>
                          <p className="truncate text-sm text-slate-700">{mail.subject}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{mail.body}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={cn("border", CATEGORY_META[mail.category].badgeClass)}>
                            {CATEGORY_META[mail.category].title}
                          </Badge>
                          <span className="text-[11px] text-slate-400">{mail.date}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              {selectedMail ? (
                <>
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg font-bold text-slate-950">{selectedMail.subject}</CardTitle>
                        <p className="mt-1 text-sm text-slate-500">
                          {selectedMail.sender} · {selectedMail.senderEmail}
                        </p>
                      </div>
                      <Badge className={cn("border", CATEGORY_META[selectedMail.category].badgeClass)}>
                        {CATEGORY_META[selectedMail.category].title}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{selectedMail.body}</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Raison du classement</p>
                        <p className="mt-2 text-sm text-slate-700">{selectedMail.classificationReason}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Action recommandee</p>
                        <p className="mt-2 text-sm text-slate-700">{selectedMail.actionRecommended ?? "Aucune action immediate."}</p>
                      </div>
                    </div>

                    {(selectedMail.category === "urgent" || selectedMail.category === "important") && (
                      <div className="space-y-3 rounded-3xl border border-cyan-100 bg-cyan-50/50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Redaction assistee par IA</p>
                            <p className="text-xs text-slate-500">Resume court, ton professionnel et reponse modifiable.</p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={handleDraftWithAi}
                            disabled={isDrafting}
                            className="rounded-full border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-100"
                          >
                            {isDrafting ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                            {isDrafting ? "Generation..." : "Rediger avec l'IA"}
                          </Button>
                        </div>

                        {draftSuggestion && (
                          <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Suggestion IA</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyText(draftSuggestion)}
                                className="text-cyan-700"
                              >
                                Inserer
                              </Button>
                            </div>
                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{draftSuggestion}</p>
                          </div>
                        )}

                        <textarea
                          rows={6}
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          placeholder={`Reponse modifiable pour ${selectedMail.sender}...`}
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={handleSendReply}
                            disabled={!replyText.trim() || isSending}
                            className="rounded-2xl bg-cyan-700 text-white hover:bg-cyan-800"
                          >
                            {isSending ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}
                            {isSending ? "Envoi..." : "Envoyer apres validation"}
                          </Button>
                        </div>
                      </div>
                    )}
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

          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-lg font-bold text-slate-950">Mes regles de notification</CardTitle>
              </div>
              <Button
                variant="outline"
                onClick={() => openRuleModal()}
                className="rounded-full border-slate-200"
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
                  <div key={rule.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{describeRule(rule)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <Card className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            <CardHeader className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                    <BellRing className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-950">Configurer mes alertes email</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">Choisissez les emails qui meritent une notification.</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRuleModal({ open: false, prompt: "", editingRuleId: null });
                    setRuleBuilder(EMPTY_RULE_BUILDER);
                  }}
                  className="rounded-full text-slate-500 hover:bg-slate-100"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="max-h-[calc(92vh-84px)] overflow-y-auto bg-slate-50 p-6">
              <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Filter className="size-4 text-cyan-700" />
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
                              ? "border-cyan-400 bg-white shadow-sm"
                              : "border-slate-200 bg-white/70 hover:border-cyan-200 hover:bg-white"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                              checked ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 bg-white"
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
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
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

                  <label className="block rounded-xl border border-slate-200 bg-white p-4">
                    <span className="text-sm font-semibold text-slate-900">Reponse libre</span>
                    <textarea
                      rows={4}
                      value={ruleBuilder.customPrompt}
                      onChange={(event) => setRuleBuilder((current) => ({ ...current, customPrompt: event.target.value }))}
                      placeholder="Ajouter une precision si besoin."
                      className="mt-3 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                  </label>

                  <div className="rounded-xl border border-cyan-100 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">Apercu</p>
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
                  className="rounded-full"
                >
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
    </div>
  );
}
