"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ensurePushRegistered } from "@/lib/push/client";
import { Button } from "@/components/ui/button";
import { MessageLoading } from "@/components/ui/message-loading";
import {
  Send, Sparkles, Bot, Copy, Check, RefreshCw, Trash2, Info,
  Plus, MessageSquare, Pencil, MoreHorizontal, PanelLeftOpen, Share2,
  X, SlidersHorizontal, PlayCircle, PauseCircle,
  Power, ExternalLink, Zap, CalendarDays, BookOpen, Gift, HeartHandshake,
  Lightbulb, Clock3, Mail, ChevronDown, User, Settings, LogOut,
  Mic, FileText, Loader2,
} from "lucide-react";
import { CHANNEL_LABELS, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { formatArticlePrice } from "@/lib/articles/shared";
import { startArticleCheckout } from "@/lib/articles/checkout-client";
import { AUTOMATION_PRESETS, type AutomationPresetKey } from "@/lib/automation/presets";
import { DASHBOARD_NAV_ITEMS } from "@/components/layout/dashboard-nav";
import { DailyRoutineWizard } from "./daily-routine-wizard";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import type { RoutineItem } from "./daily-routine-wizard";
import type { BillingConfig } from "@/lib/billing";

// ============================================================
// TYPES
// ============================================================

// Typage minimal de la Web Speech API (non incluse dans les libs TS par défaut).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface ChatAttachment {
  url: string;
  type: string;
  name: string;
  isImage: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  templateSuggestions?: TemplateSuggestion[];
  articleSuggestions?: ArticleSuggestion[];
  posterDraft?: PosterDraft | null;
  generatedImageUrl?: string | null;
  publishDraft?: PublishDraft | null;
  assistantActions?: AssistantActionCard[];
  automationSetup?: AutomationSetupDraft;
}

interface TemplateSuggestion {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  tags: string[];
  isPremium: boolean;
  usageCount: number;
  editableZoneCount: number;
  reason: string;
}

interface ArticleSuggestion {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  tags: string[];
  reason: string;
  confidence: number;
}

interface PosterDraft {
  template: {
    id: string;
    name: string;
    category: string;
    thumbnailUrl: string | null;
    previewUrl: string | null;
  };
  generatedTexts: Record<string, string>;
  missingFields: string[];
}

interface PublishDraft {
  title: string;
  caption: string;
}

interface AutomationSetupDraft {
  preset: AutomationPresetKey;
  name: string;
  description: string;
  trigger: string;
  time: string;
  day?: string;
  dayOfWeek?: number;
  daysBeforeHoliday?: number;
  channels: string[];
  isActive: boolean;
}

interface AssistantActionCard {
  id: string;
  type: "automation" | "setting" | "navigation" | "creation" | "email";
  title: string;
  description: string;
  status?: string;
  href?: string;
  action?: {
    kind: "toggle_automation" | "trigger_automation" | "delete_automation" | "create_automation" | "create_shabbat_automation" | "open_daily_routine" | "switch_detailed" | "send_email" | "confirm_pending" | "done";
    automationId?: string;
    isActive?: boolean;
    preset?: AutomationPresetKey;
    presetId?: string;
    pendingActionId?: string;
    actionKind?: string;
    payload?: Record<string, unknown>;
    emailData?: {
      to: string;
      subject: string;
      body: string;
    };
  };
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  communityName: string;
  communityLogoUrl?: string | null;
  tone: string;
  channels: ChannelOption[];
  seasonalPrompts: QuickPrompt[];
  initialPrompt?: string;
  initialApprovalDraft?: ApprovalDraft | null;
  userName?: string;
  userAvatar?: string | null;
  communitySubtitle?: string;
  billingConfig: BillingConfig;
}

interface ApprovalDraft {
  id: string;
  title: string | null;
  body: string;
  hashtags: string[];
  status: string;
  channelTypes: string[];
}

interface ChannelOption {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  isConnected: boolean;
}

interface QuickPrompt {
  label: string;
  description?: string;
  prompt: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const QUICK_PROMPTS: QuickPrompt[] = [
  { label: "Plan Chabbat", description: "Post, affiche, horaires, rappel", prompt: "Prépare-moi un plan complet pour Chabbat cette semaine : message WhatsApp, post Instagram, affiche si disponible et rappel à programmer." },
  { label: "Créer automatisation", description: "Suggestions prêtes en un clic", prompt: "Propose-moi les automatisations les plus utiles pour mon Beth Habad et explique laquelle créer en premier." },
  { label: "Annonce événement", description: "J-10, J-5, J-1, jour J", prompt: "Aide-moi à préparer la communication complète d'un événement : annonce, rappels, visuel et canaux." },
  { label: "Vœux de fête", description: "Texte + affiche + timing", prompt: "Prépare les vœux pour la prochaine fête juive avec texte, canaux recommandés et affiche si disponible." },
  { label: "Cours de Torah", description: "Annonce et rappel régulier", prompt: "Prépare une annonce de cours de Torah hebdomadaire et propose une automatisation de rappel." },
  { label: "Collecte de fonds", description: "Message clair et sensible", prompt: "Écris une campagne de collecte de dons structurée avec message principal, WhatsApp, email et CTA." },
  { label: "Diagnostic compte", description: "Ce qui manque / quoi améliorer", prompt: "Fais un diagnostic simple de mon compte : automatisations, réseaux, quotidien, contenus et prochaines actions." },
  { label: "Pensée du jour", description: "Court, publiable, régulier", prompt: "Génère une pensée du jour courte et propose comment la publier régulièrement." },
];

const QUICK_PROMPT_STYLES = [
  "border-blue-100 bg-blue-50 text-blue-900 hover:border-blue-200 hover:bg-blue-100",
  "border-amber-100 bg-amber-50 text-amber-900 hover:border-amber-200 hover:bg-amber-100",
  "border-emerald-100 bg-emerald-50 text-emerald-900 hover:border-emerald-200 hover:bg-emerald-100",
  "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
];

const ASSISTANT_PLACEHOLDER_SUGGESTIONS = [
  "Prépare un email important à envoyer aujourd'hui",
  "Propose 3 idées de publication pour Instagram et Facebook",
  "Aide-moi à répondre à un avis Google négatif avec tact",
  "Organise mon agenda communautaire de la semaine",
  "Rédige un message WhatsApp clair et professionnel",
];

const STATIC_ASSISTANT_PLACEHOLDER = "Décrivez votre demande à l'Assistant IA...";

const EASYCOM_FULL_MESSAGE =
  "L'Assistant IA vous aide à gérer toute votre communication depuis un seul espace intelligent.\n\n" +
  "* Programmez vos publications sur WhatsApp, Instagram et Facebook, puis recevez une notification au bon moment avant validation.\n" +
  "* Enregistrez vos contacts, organisez vos groupes et envoyez des messages bien rédigés, structurés et adaptés aux bonnes personnes.\n" +
  "* Gérez vos emails intelligemment : l'IA trie les messages importants, repère les urgences et vous propose des réponses prêtes à envoyer.\n" +
  "* Suivez vos avis Google : l'IA détecte les avis prioritaires, vous alerte et prépare une réponse professionnelle.\n" +
  "* Utilisez l'Assistant du quotidien pour dire à l'IA un événement, une tâche ou un rappel, et il l'ajoute automatiquement dans votre Agenda IA.\n" +
  "* Centralisez vos automatisations, publications prévues, rappels et événements dans votre Agenda IA avec des notifications au bon moment.\n" +
  "* Créez des clips vidéo IA à partir de vos photos et vidéos, prêts à être publiés sur vos réseaux.\n" +
  "* Notez vos ressources personnelles, organisez-les dans votre espace, puis publiez-les ou partagez-les en un clic.\n\n" +
  "L'Assistant IA prépare, organise et automatise vos actions tout en vous laissant le contrôle : l'IA propose, vous validez, puis elle agit.\n\n" +
  "Cliquez dans le menu ou demandez à l'Assistant IA ce que vous souhaitez.";

function getQuickPromptStyle(index: number) {
  return QUICK_PROMPT_STYLES[index % QUICK_PROMPT_STYLES.length];
}

const AUTOMATION_DAYS = [
  { value: "monday", label: "Lundi", dayOfWeek: 1 },
  { value: "tuesday", label: "Mardi", dayOfWeek: 2 },
  { value: "wednesday", label: "Mercredi", dayOfWeek: 3 },
  { value: "thursday", label: "Jeudi", dayOfWeek: 4 },
  { value: "friday", label: "Vendredi", dayOfWeek: 5 },
  { value: "sunday", label: "Dimanche", dayOfWeek: 0 },
];

const AUTOMATION_CHANNELS = ["WHATSAPP", "INSTAGRAM", "FACEBOOK", "EMAIL", "TELEGRAM", "WEB"];

function buildAutomationSetupDraft(presetKey: AutomationPresetKey): AutomationSetupDraft {
  const preset = AUTOMATION_PRESETS[presetKey];
  const triggerConfig = preset.triggerConfig as {
    time?: string;
    day?: string;
    dayOfWeek?: number;
    daysBeforeHoliday?: number;
  };

  return {
    preset: presetKey,
    name: preset.name,
    description: preset.description,
    trigger: preset.trigger,
    time: triggerConfig.time ?? "10:00",
    day: triggerConfig.day,
    dayOfWeek: triggerConfig.dayOfWeek,
    daysBeforeHoliday: triggerConfig.daysBeforeHoliday,
    channels: [...preset.channels],
    isActive: true,
  };
}

function buildAutomationTriggerConfig(setup: AutomationSetupDraft) {
  if (setup.trigger === "JEWISH_HOLIDAY") {
    return {
      daysBeforeHoliday: setup.daysBeforeHoliday ?? 3,
      time: setup.time,
    };
  }

  if (setup.trigger === "CUSTOM_SCHEDULE" || setup.trigger === "WEEKLY_SHABBAT") {
    return {
      day: setup.day ?? "monday",
      dayOfWeek: setup.dayOfWeek ?? AUTOMATION_DAYS.find((day) => day.value === setup.day)?.dayOfWeek ?? 1,
      time: setup.time,
      ...(setup.trigger === "WEEKLY_SHABBAT" ? { daysBefore: 1 } : {}),
    };
  }

  return { time: setup.time };
}

function isAutomationAction(card: AssistantActionCard) {
  return card.type === "automation" || card.action?.kind === "create_automation" || card.action?.kind === "create_shabbat_automation";
}

function getAutomationIcon(card: AssistantActionCard) {
  const key = `${card.action?.preset ?? ""} ${card.title}`.toLowerCase();
  if (/shabbat|chabbat/.test(key)) return CalendarDays;
  if (/thought|pensée|pensee/.test(key)) return Lightbulb;
  if (/course|cours/.test(key)) return BookOpen;
  if (/holiday|fête|fetes|voeux|vœux/.test(key)) return Gift;
  if (/don|donation|collecte/.test(key)) return HeartHandshake;
  if (/rappel|reminder/.test(key)) return Clock3;
  return Zap;
}

function getCommunityInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BH";
}

function cleanConversationTitle(title: string) {
  return title
    .replace(/\*\*/g, "")
    .replace(/[*_`#]/g, "")
    .replace(/\s+/g, " ")
    .trim() || "Nouvelle conversation";
}

// ============================================================
// HELPERS — Groupement par date
// ============================================================

function groupByDate(conversations: ConversationSummary[]): { label: string; items: ConversationSummary[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

  const groups: Record<string, ConversationSummary[]> = {
    "Aujourd'hui": [],
    "Hier": [],
    "7 derniers jours": [],
    "30 derniers jours": [],
    "Plus ancien": [],
  };

  for (const conv of conversations) {
    const d = new Date(conv.updatedAt);
    if (d >= today) groups["Aujourd'hui"].push(conv);
    else if (d >= yesterday) groups["Hier"].push(conv);
    else if (d >= sevenDaysAgo) groups["7 derniers jours"].push(conv);
    else if (d >= thirtyDaysAgo) groups["30 derniers jours"].push(conv);
    else groups["Plus ancien"].push(conv);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function AssistantClient({
  communityName,
  communityLogoUrl,
  tone: _tone,
  channels,
  seasonalPrompts,
  initialPrompt,
  initialApprovalDraft,
  userName,
  userAvatar,
  communitySubtitle,
  billingConfig,
}: Props) {
  void _tone;
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }
  const [assistantExperience, setAssistantExperienceState] = useState<"simple" | "detailed">("simple");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [simpleMainMenuOpen, setSimpleMainMenuOpen] = useState(false);
  const [simpleHistoryOpen, setSimpleHistoryOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSuggestion | null>(null);
  const [preparingPoster, setPreparingPoster] = useState(false);
  const [renderingPoster, setRenderingPoster] = useState(false);
  const [publishingPosterId, setPublishingPosterId] = useState<string | null>(null);
  const [selectedPublishChannels, setSelectedPublishChannels] = useState<string[]>([]);
  const [publishCaption, setPublishCaption] = useState("");
  const [buyingArticleId, setBuyingArticleId] = useState<string | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [approvalDraft, setApprovalDraft] = useState<ApprovalDraft | null>(initialApprovalDraft ?? null);
  const [approvingDraft, setApprovingDraft] = useState(false);
  const [editingPosterId, setEditingPosterId] = useState<string | null>(null);
  const [posterDraftEdits, setPosterDraftEdits] = useState<Record<string, string>>({});
  // Quotidien
  const [, setDailyRoutineConfigured] = useState(false);
  const [dailyRoutineLoading, setDailyRoutineLoading] = useState(true);
  const [dailyRoutineMode, setDailyRoutineMode] = useState(false);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [showDailyRoutineBubble, setShowDailyRoutineBubble] = useState(true);
  const [showAllFeaturesMobile, setShowAllFeaturesMobile] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ x: 24, y: 24 });
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(ASSISTANT_PLACEHOLDER_SUGGESTIONS[0]);
  const [hasStartedPromptEntry, setHasStartedPromptEntry] = useState(false);
  // Pièces jointes (images / documents) en attente d'envoi avec le prochain message.
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  // Dictée vocale (Web Speech API).
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechBaseRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bubbleDragState = useRef({ active: false, moved: false, offsetX: 0, offsetY: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const showQuickPrompts = messages.length === 0;
  const hasStreamingAssistantMessage =
    loading && messages.some((message) => message.role === "assistant" && !message.content);
  const shouldAnimatePlaceholder = showQuickPrompts && !hasStartedPromptEntry && !loading;

  // Charger l'historique + routine au montage
  useEffect(() => {
    fetchConversations();
    fetchDailyRoutine();
    setAssistantExperienceState("simple");
    window.localStorage.setItem("easycom-assistant-experience", "simple");
    // Réenregistre le push si déjà autorisé (silencieux).
    ensurePushRegistered();
    // Lien profond depuis email/push : ?action=<id> → afficher la carte à valider.
    void handleDeepLinkAction();
  }, []);

  async function handleDeepLinkAction() {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const actionId = params.get("action");
    if (!actionId) return;
    try {
      const res = await fetch(`/api/ai/action?id=${encodeURIComponent(actionId)}`);
      if (!res.ok) return;
      const { action } = (await res.json()) as {
        action?: { id: string; kind: string; summary: string; status: string };
      };
      if (!action) return;
      // Nettoie l'URL.
      window.history.replaceState({}, "", window.location.pathname);

      if (action.status !== "PENDING") {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              action.status === "CONFIRMED"
                ? "Cette action a déjà été validée. ✅"
                : "Cette action n'est plus en attente.",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Voici l'action en attente de votre validation :",
          timestamp: new Date(),
          assistantActions: [
            {
              id: `pending-${action.id}`,
              type: action.kind.includes("automation") ? "automation" : action.kind === "send_email" ? "email" : "creation",
              title: "Action à valider",
              description: action.summary,
              status: "À valider",
              action: { kind: "confirm_pending", pendingActionId: action.id, actionKind: action.kind },
            },
          ],
        },
      ]);
    } catch {
      // silencieux
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversationId]);

  useEffect(() => {
    if (!initialPrompt) return;
    setInput(initialPrompt);
    setHasStartedPromptEntry(true);
  }, [initialPrompt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBubblePosition({
      x: Math.max(16, window.innerWidth - 250),
      y: 90,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncMobileMode = () => {
      if (window.innerWidth < 768) {
        setAssistantExperienceState("simple");
      }
    };
    syncMobileMode();
    window.addEventListener("resize", syncMobileMode);
    return () => window.removeEventListener("resize", syncMobileMode);
  }, []);

  useEffect(() => {
    if (!shouldAnimatePlaceholder) {
      setAnimatedPlaceholder(STATIC_ASSISTANT_PLACEHOLDER);
      return;
    }

    const suggestions = ASSISTANT_PLACEHOLDER_SUGGESTIONS;
    let suggestionIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timeoutId: number | undefined;

    const run = () => {
      const current = suggestions[suggestionIndex] ?? "";

      if (!deleting) {
        characterIndex += 1;
        setAnimatedPlaceholder(current.slice(0, characterIndex));

        if (characterIndex === current.length) {
          deleting = true;
          timeoutId = window.setTimeout(run, 1700);
          return;
        }

        timeoutId = window.setTimeout(run, 42);
        return;
      }

      characterIndex -= 1;
      setAnimatedPlaceholder(current.slice(0, Math.max(characterIndex, 0)));

      if (characterIndex === 0) {
        deleting = false;
        suggestionIndex = (suggestionIndex + 1) % suggestions.length;
        timeoutId = window.setTimeout(run, 260);
        return;
      }

      timeoutId = window.setTimeout(run, 24);
    };

    timeoutId = window.setTimeout(run, 900);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [shouldAnimatePlaceholder]);

  // â”€â”€ API calls â”€â”€

  async function fetchConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = (await res.json()) as ConversationSummary[];
      setConversations(data.map((conv) => ({ ...conv, title: cleanConversationTitle(conv.title) })));
    }
  }

  async function fetchDailyRoutine() {
    try {
      const res = await fetch("/api/community/daily-routine");
      if (res.ok) {
        const data = await res.json();
        setDailyRoutineConfigured(!!data?.configured);
      }
    } finally {
      setDailyRoutineLoading(false);
    }
  }

  function getApprovalChannelTypes() {
    if (!approvalDraft) return [];
    if (approvalDraft.channelTypes.length > 0) return approvalDraft.channelTypes;
    return channels
      .filter((channel) => channel.isActive && (channel.isConnected || channel.type === "WHATSAPP" || channel.type === "EMAIL"))
      .map((channel) => channel.type);
  }

  async function publishApprovalDraft() {
    if (!approvalDraft || approvingDraft) return;
    const channelTypes = getApprovalChannelTypes();
    if (channelTypes.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Aucun canal actif n'est disponible pour envoyer ce message. Connectez ou activez un canal, puis réessayez.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setApprovingDraft(true);
    try {
      const response = await fetch("/api/publishing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: approvalDraft.id, channelTypes }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          throw new Error(data.error ?? "Passez au mode payant pour continuer.");
        }
        throw new Error(data.error ?? "Publication impossible");
      }

      setApprovalDraft(null);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `C'est validé. J'envoie ce message sur ${channelTypes.map((channel) => CHANNEL_LABELS[channel] ?? channel).join(", ")}.`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Je n'ai pas pu envoyer le message pour le moment : ${(error as Error).message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setApprovingDraft(false);
    }
  }

  function startApprovalEditConversation() {
    if (!approvalDraft) return;
    setApprovalDraft(null);
    setHasStartedPromptEntry(true);
    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Que souhaitez-vous modifier dans ce message ?\n\n${approvalDraft.body}`,
        timestamp: new Date(),
      },
    ]);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function askForApprovalModels() {
    if (!approvalDraft) return;
    setApprovalDraft(null);
    sendMessage(
      `Propose des modèles de messages ou publications adaptés au contexte, en respectant mon style mémorisé. Message de départ :\n\n${approvalDraft.body}`,
    );
  }

  async function saveDailyRoutine(items: RoutineItem[]) {
    setSavingRoutine(true);
    try {
      const summary = items
        .map((i) => `${i.label} (${i.frequency}) sur ${i.channels.join(", ")}`)
        .join(" ; ");
      const res = await fetch("/api/community/daily-routine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, items }),
      });
      if (res.ok) {
        setDailyRoutineConfigured(true);
        setDailyRoutineMode(false);
      }
    } finally {
      setSavingRoutine(false);
    }
  }

  async function createConversation(): Promise<string> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const conv = await res.json();
    conv.title = cleanConversationTitle(conv.title);
    setConversations((prev) => [conv, ...prev]);
    return conv.id;
  }

  async function loadConversation(id: string) {
    setActiveConversationId(id);
    setMessages([]);
    setSimpleHistoryOpen(false);
    if (assistantExperience === "detailed") {
      setHistoryOpen(false);
    }
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(
        data.messages.map((m: {
          id: string;
          role: string;
          content: string;
          createdAt: string;
          templateSuggestions?: TemplateSuggestion[];
          articleSuggestions?: ArticleSuggestion[];
        }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt),
          templateSuggestions: m.templateSuggestions,
          articleSuggestions: m.articleSuggestions,
        }))
      );
    }
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
    setMenuId(null);
  }

  async function renameConversation(id: string, title: string) {
    const cleanTitle = cleanConversationTitle(title);
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: cleanTitle }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: cleanTitle } : c))
    );
    setEditingId(null);
  }

  function startNewChat() {
    setActiveConversationId(null);
    setMessages([]);
    setHasStartedPromptEntry(false);
    setSimpleHistoryOpen(false);
    if (assistantExperience === "detailed") {
      setHistoryOpen(false);
    }
  }

  // â”€â”€ Chat â”€â”€

  const sendMessage = useCallback(async (
    content?: string,
    options?: { selectedTemplateId?: string | null; templateAction?: "select" | null; mode?: "daily_routine" | "simplified" }
  ) => {
    const messageContent = content ?? input.trim();
    // On autorise l'envoi avec uniquement des pièces jointes (sans texte saisi),
    // mais pas pour les messages programmatiques (content fourni explicitement).
    const attachmentsToSend = content === undefined ? pendingAttachments : [];
    if ((!messageContent && attachmentsToSend.length === 0) || loading) return;
    if (isRecording) recognitionRef.current?.stop();

    setHasStartedPromptEntry(true);
    setInput("");
    setPendingAttachments([]);
    setAttachmentError(null);

    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
      setActiveConversationId(convId);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent || (attachmentsToSend.length > 0 ? "Analyse ces pièces jointes." : ""),
      timestamp: new Date(),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          selectedTemplateId: options?.selectedTemplateId ?? selectedTemplate?.id ?? null,
          templateAction: options?.templateAction ?? null,
          mode: options?.mode ?? (dailyRoutineMode ? "daily_routine" : assistantExperience === "simple" ? "simplified" : undefined),
          messages: currentMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments?.map((att) => ({ url: att.url, type: att.type, name: att.name })),
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.error ?? "Vous avez atteint la limite du mode gratuit. Passez au mode payant pour continuer.",
              timestamp: new Date(),
            },
          ]);
          return;
        }
        throw new Error(data.error ?? "Erreur API");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let receivedTemplateSuggestions: TemplateSuggestion[] | undefined;
      let receivedArticleSuggestions: ArticleSuggestion[] | undefined;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const data = line.replace("data: ", "").trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "template_suggestions" && Array.isArray(parsed.templates)) {
                receivedTemplateSuggestions = parsed.templates;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, templateSuggestions: parsed.templates }
                      : m
                  )
                );
              }
              if (parsed.type === "article_suggestions" && Array.isArray(parsed.articles)) {
                receivedArticleSuggestions = parsed.articles;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, articleSuggestions: parsed.articles }
                      : m
                  )
                );
              }
              if (parsed.type === "assistant_actions" && Array.isArray(parsed.actions)) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, assistantActions: parsed.actions }
                      : m
                  )
                );
              }
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? {
                          ...m,
                          content: assistantContent,
                          templateSuggestions: receivedTemplateSuggestions ?? m.templateSuggestions,
                          articleSuggestions: receivedArticleSuggestions ?? m.articleSuggestions,
                        }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      }

      setTimeout(fetchConversations, 2000);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, activeConversationId, messages, selectedTemplate, dailyRoutineMode, assistantExperience, pendingAttachments, isRecording]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Dictée vocale ─────────────────────────────────────────
  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  function toggleDictation() {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    speechBaseRef.current = input ? input.trimEnd() + " " : "";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(speechBaseRef.current + transcript);
      setHasStartedPromptEntry(true);
    };
    recognition.onerror = () => {
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 0);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }

  // ── Pièces jointes (images / documents) ───────────────────
  function openFilePicker() {
    setAttachmentError(null);
    fileInputRef.current?.click();
  }

  async function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setAttachmentError(null);
    setUploadingAttachment(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/attachment", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          setAttachmentError(data.error ?? "Échec de l'envoi du fichier");
          continue;
        }
        setPendingAttachments((prev) => [
          ...prev,
          { url: data.url, type: data.type, name: data.name, isImage: data.isImage },
        ]);
      }
    } catch {
      setAttachmentError("Impossible d'envoyer le fichier. Réessaie.");
    } finally {
      setUploadingAttachment(false);
      setHasStartedPromptEntry(true);
    }
  }

  function removePendingAttachment(url: string) {
    setPendingAttachments((prev) => prev.filter((att) => att.url !== url));
  }

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function renderMarkdown(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<span class="font-bold">$1</span>')
      .replace(/^- (.*)$/gm, '<div class="ml-1 flex gap-2"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"></span><span>$1</span></div>')
      .replace(/^(\d+)\. (.*)$/gm, '<div class="ml-1 flex gap-2"><span class="font-bold text-blue-600">$1.</span><span>$2</span></div>')
      .replace(/\n/g, "<br />");
  }

  function sendEasycomOverviewMessage() {
    setHasStartedPromptEntry(true);
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: EASYCOM_FULL_MESSAGE,
        timestamp: new Date(),
      },
    ]);
  }

  function setAssistantExperience(mode: "simple" | "detailed") {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setAssistantExperienceState("simple");
      window.localStorage.setItem("easycom-assistant-experience", "simple");
      return;
    }
    if (mode === "simple") {
      setHistoryOpen(false);
      setMenuId(null);
    }
    setAssistantExperienceState(mode);
    window.localStorage.setItem("easycom-assistant-experience", mode);
  }

  const groupedConversations = groupByDate(conversations);
  const quickPrompts = seasonalPrompts.length >= 4
    ? seasonalPrompts.slice(0, 4)
    : [...seasonalPrompts, ...QUICK_PROMPTS].slice(0, 4);
  const simpleMenuSections = DASHBOARD_NAV_ITEMS
    .filter((section) => section.section !== "ASSISTANT IA")
    .map((section) => ({
      section: section.section,
      items: section.items.filter((item) => item.href !== "/dashboard/assistant"),
    }))
    .filter((section) => section.items.length > 0);
  const detailedMenuItems = DASHBOARD_NAV_ITEMS.flatMap((section) => section.items);
  const simpleMainButtons = [
    { label: "Créer des automatisations", href: "/dashboard/automations", icon: Zap, accent: "bg-blue-500", iconTone: "text-blue-600", iconBg: "bg-blue-50", mobileOnly: false },
    { label: "Assistant du quotidien", href: "/dashboard/events", icon: CalendarDays, accent: "bg-violet-500", iconTone: "text-violet-600", iconBg: "bg-violet-50", mobileOnly: false },
    { label: "Gérer mes email", href: "/dashboard/email", icon: Mail, accent: "bg-cyan-500", iconTone: "text-cyan-600", iconBg: "bg-cyan-50", mobileOnly: false },
    { label: "Voir mes avis Google", href: "/dashboard/google-reviews", icon: Sparkles, accent: "bg-cyan-500", iconTone: "text-cyan-600", iconBg: "bg-cyan-50", mobileOnly: false },
    { label: "Créer un clip vidéo", href: "/dashboard/clip-recap", icon: PlayCircle, accent: "bg-rose-500", iconTone: "text-rose-600", iconBg: "bg-rose-50", mobileOnly: true },
  ] as const;
  const mobileQuickFeatureConfigs = [
    { href: "/dashboard/automations", label: "Mes automatisations" },
    { href: "/dashboard/events", label: "Mon agenda IA" },
    { href: "/dashboard/email", label: "Email & Avis" },
    { href: "/dashboard/torah", label: "Cours de Torah IA" },
    { href: "/dashboard/templates", label: "Affiches" },
    { href: "https://boutique.easycom-ia.com", label: "Boutiques" },
  ];
  const mobileSimpleFeatures = mobileQuickFeatureConfigs
    .map(({ href, label }) => {
      const item = detailedMenuItems.find((entry) => entry.href === href);
      return item ? { ...item, label } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const mobileCircleColors = [
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-green-500",
    "from-violet-500 to-purple-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
    "from-cyan-500 to-teal-500",
    "from-lime-500 to-emerald-500",
    "from-indigo-500 to-blue-600",
    "from-fuchsia-500 to-violet-600",
  ];
  const mobileFeatureCardTones = [
    {
      ring: "border-cyan-200/80",
      glow: "shadow-[0_14px_30px_rgba(34,211,238,0.16)]",
      iconWrap: "from-cyan-500 via-sky-500 to-blue-500",
      iconGlow: "shadow-[0_10px_20px_rgba(14,165,233,0.26)]",
      badge: "text-cyan-700",
    },
    {
      ring: "border-emerald-200/80",
      glow: "shadow-[0_14px_30px_rgba(16,185,129,0.14)]",
      iconWrap: "from-emerald-500 via-teal-500 to-cyan-500",
      iconGlow: "shadow-[0_10px_20px_rgba(16,185,129,0.22)]",
      badge: "text-emerald-700",
    },
    {
      ring: "border-violet-200/80",
      glow: "shadow-[0_14px_30px_rgba(139,92,246,0.16)]",
      iconWrap: "from-violet-500 via-fuchsia-500 to-indigo-500",
      iconGlow: "shadow-[0_10px_20px_rgba(139,92,246,0.24)]",
      badge: "text-violet-700",
    },
    {
      ring: "border-amber-200/80",
      glow: "shadow-[0_14px_30px_rgba(245,158,11,0.14)]",
      iconWrap: "from-amber-500 via-orange-500 to-rose-500",
      iconGlow: "shadow-[0_10px_20px_rgba(249,115,22,0.22)]",
      badge: "text-amber-700",
    },
  ];
  const mobileDetailedSections = DASHBOARD_NAV_ITEMS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.href !== "/dashboard/assistant"),
    }))
    .filter((section) => section.items.length > 0);

  function clampBubblePosition(x: number, y: number) {
    if (typeof window === "undefined") return { x, y };
    const maxX = Math.max(16, window.innerWidth - 260);
    const maxY = Math.max(16, window.innerHeight - 70);
    return {
      x: Math.min(Math.max(16, x), maxX),
      y: Math.min(Math.max(16, y), maxY),
    };
  }

  function handleBubbleMouseDown(event: React.MouseEvent<HTMLButtonElement>) {
    if (typeof window === "undefined" || window.innerWidth < 1024) return;
    const drag = bubbleDragState.current;
    drag.active = true;
    drag.moved = false;
    drag.offsetX = event.clientX - bubblePosition.x;
    drag.offsetY = event.clientY - bubblePosition.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!drag.active) return;
      drag.moved = true;
      const nextPosition = clampBubblePosition(moveEvent.clientX - drag.offsetX, moveEvent.clientY - drag.offsetY);
      setBubblePosition(nextPosition);
    };

    const onMouseUp = () => {
      drag.active = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      setTimeout(() => {
        drag.moved = false;
      }, 0);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  async function preparePosterDraft(
    templateOverride?: TemplateSuggestion,
    sourceMessages?: Message[]
  ) {
    const templateToPrepare = templateOverride ?? selectedTemplate;
    if (!templateToPrepare || preparingPoster) return;

    setPreparingPoster(true);
    try {
      const messagesForPoster = sourceMessages ?? messages;
      const response = await fetch("/api/templates/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: templateToPrepare.id,
          messages: messagesForPoster.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de préparer l'affiche");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.confirmationMessage,
          timestamp: new Date(),
          posterDraft: {
            template: data.template,
            generatedTexts: data.generatedTexts,
            missingFields: data.missingFields ?? [],
          },
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Je n'ai pas pu préparer l'affiche pour le moment. Réessaie après avoir précisé les textes principaux.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setPreparingPoster(false);
    }
  }

  function openPosterEditor(message: Message) {
    if (!message.posterDraft) return;
    setEditingPosterId(message.id);
    setPosterDraftEdits(message.posterDraft.generatedTexts);
  }

  function savePosterEdits(message: Message) {
    if (!message.posterDraft) return;
    const nextTexts = Object.fromEntries(
      Object.entries(posterDraftEdits).map(([key, value]) => [key, value.trim() || "À confirmer"])
    );
    const missingFields = Object.entries(nextTexts)
      .filter(([, value]) => value === "À confirmer")
      .map(([key]) => key);

    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id && item.posterDraft
          ? {
              ...item,
              posterDraft: {
                ...item.posterDraft,
                generatedTexts: nextTexts,
                missingFields,
              },
              content: [
                "J'ai mis à jour les textes de l'affiche avec vos modifications.",
                "",
                ...Object.entries(nextTexts).map(([key, value]) => `- ${key} : ${value}`),
                "",
                missingFields.length > 0
                  ? `À confirmer : ${missingFields.join(", ")}.`
                  : "Si tout est bon, vous pouvez générer l'affiche.",
              ].join("\n"),
            }
          : item
      )
    );
    setEditingPosterId(null);
  }

  async function regeneratePosterDraft(message: Message) {
    if (!message.posterDraft || preparingPoster) return;

    setPreparingPoster(true);
    try {
      const response = await fetch("/api/templates/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: message.posterDraft.template.id,
          messages: [
            ...messages.map((entry) => ({
              role: entry.role,
              content: entry.content,
            })),
            {
              role: "user",
              content: `Régénère automatiquement les textes de l'affiche ${message.posterDraft.template.name} avec toutes les informations connues et ces corrections éventuelles : ${JSON.stringify(posterDraftEdits)}`,
            },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de régénérer l'affiche");
      }

      setPosterDraftEdits(data.generatedTexts);
      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: data.confirmationMessage,
                posterDraft: {
                  template: data.template,
                  generatedTexts: data.generatedTexts,
                  missingFields: data.missingFields ?? [],
                },
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Je n'ai pas pu régénérer automatiquement les textes pour le moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setPreparingPoster(false);
    }
  }

  function buildPosterPublicationDraft(posterDraft: PosterDraft): PublishDraft {
    const orderedEntries = Object.entries(posterDraft.generatedTexts).filter(([, value]) => value && value !== "À confirmer");
    const title = orderedEntries[0]?.[1] ?? posterDraft.template.name;
    const caption = orderedEntries
      .slice(1)
      .map(([, value]) => value)
      .filter(Boolean)
      .join("\n");

    return {
      title,
      caption: caption || title,
    };
  }

  async function renderPoster(message: Message) {
    if (!message.posterDraft || renderingPoster) return;

    setRenderingPoster(true);
    try {
      const response = await fetch("/api/templates/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: message.posterDraft.template.id,
          generatedTexts: message.posterDraft.generatedTexts,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de générer l'affiche");
      }

      const publishDraft = buildPosterPublicationDraft(message.posterDraft);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "L'affiche est prête. Tu peux l'ouvrir ou la télécharger ci-dessous.",
          timestamp: new Date(),
          generatedImageUrl: data.imageUrl,
          publishDraft,
        },
      ]);
      setPublishCaption(publishDraft.caption);
      setSelectedPublishChannels(
        channels
          .filter((channel) => channel.isActive)
          .map((channel) => channel.id)
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "La génération finale de l'affiche a échoué. Vérifie la configuration Fal et réessaie.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setRenderingPoster(false);
    }
  }

  function chooseTemplate(template: TemplateSuggestion) {
    setSelectedTemplate(template);
    const choiceMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: `Je choisis l'affiche « ${template.name} ». Prépare-la automatiquement avec toutes les informations connues, puis propose-moi de valider ou modifier.`,
      timestamp: new Date(),
    };
    const nextMessages = [...messages, choiceMessage];
    setMessages(nextMessages);
    preparePosterDraft(template, nextMessages);
  }

  async function orderArticle(articleId: string) {
    setBuyingArticleId(articleId);
    try {
      await startArticleCheckout(articleId);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Je n'ai pas pu lancer la commande de cet article pour le moment.",
          timestamp: new Date(),
        },
      ]);
      setBuyingArticleId(null);
    }
  }

  async function publishPoster(message: Message) {
    if (!message.generatedImageUrl || !message.publishDraft || selectedPublishChannels.length === 0) {
      return;
    }

    setPublishingPosterId(message.id);
    try {
      const response = await fetch("/api/templates/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: message.generatedImageUrl,
          caption: publishCaption || message.publishDraft.caption,
          title: message.publishDraft.title,
          channelIds: selectedPublishChannels,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de publier l'affiche");
      }

      const resultLines = (data.results ?? []).map((result: {
        channelType: string;
        success: boolean;
        fallbackUsed?: boolean;
        error?: string;
      }) => {
        if (result.success) {
          return `- ${CHANNEL_LABELS[result.channelType] ?? result.channelType} : envoyé`;
        }
        if (result.fallbackUsed) {
          return `- ${CHANNEL_LABELS[result.channelType] ?? result.channelType} : prêt en fallback`;
        }
        return `- ${CHANNEL_LABELS[result.channelType] ?? result.channelType} : échec${result.error ? ` (${result.error})` : ""}`;
      });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Publication de l'affiche :\n${resultLines.join("\n")}\n\nTu peux retrouver le détail dans Publications.`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Je n'ai pas pu publier cette affiche pour le moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setPublishingPosterId(null);
    }
  }

  function updateAutomationSetup(messageId: string, patch: Partial<AutomationSetupDraft>) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId && message.automationSetup
          ? { ...message, automationSetup: { ...message.automationSetup, ...patch } }
          : message
      )
    );
  }

  function updateAutomationSetupChannel(messageId: string, channel: string) {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId || !message.automationSetup) return message;
        const channels = message.automationSetup.channels.includes(channel)
          ? message.automationSetup.channels.filter((item) => item !== channel)
          : [...message.automationSetup.channels, channel];
        return { ...message, automationSetup: { ...message.automationSetup, channels } };
      })
    );
  }

  async function confirmAutomationSetup(message: Message) {
    const setup = message.automationSetup;
    if (!setup || setup.channels.length === 0) return;

    setRunningActionId(`automation-setup-${message.id}`);
    try {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: setup.preset,
          name: setup.name,
          description: setup.description,
          channels: setup.channels,
          triggerConfig: buildAutomationTriggerConfig(setup),
          isActive: setup.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          throw new Error(data.error ?? "Passez au mode payant pour continuer.");
        }
        throw new Error(data.error ?? "Création échouée");
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: `Créé : ${setup.name}.\nHeure : ${setup.time}\nCanaux : ${setup.channels.map((channel) => CHANNEL_LABELS[channel] ?? channel).join(", ")}`,
                automationSetup: undefined,
              }
            : item
        )
      );

      router.refresh();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Je n'ai pas pu créer cette automatisation. Vérifiez les champs puis réessayez.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setRunningActionId(null);
    }
  }

  async function runAssistantAction(card: AssistantActionCard) {
    if (!card.action) return;
    if (card.action.kind === "open_daily_routine") {
      setDailyRoutineMode(true);
      return;
    }
    if (card.action.kind === "switch_detailed") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("easycom-assistant-experience", "detailed");
      }
      setAssistantExperienceState("detailed");
      setShowAllFeaturesMobile(true);
      router.push(card.href ?? "/dashboard/settings?section=interface");
      return;
    }

    // Carte informative "Fait" (mode AUTO) — aucune action au clic.
    if (card.action.kind === "done") {
      return;
    }

    // Carte "À valider" (mode CONFIRM) — confirme l'exécution de l'action en attente.
    if (card.action.kind === "confirm_pending" && card.action.pendingActionId) {
      setRunningActionId(card.id);
      try {
        const response = await fetch("/api/ai/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionId: card.action.pendingActionId,
            kind: card.action.actionKind,
            payload: card.action.payload,
            decision: "confirm",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          throw new Error(data.message || "Passez au mode payant pour continuer.");
        }
        if (!response.ok || !data.ok) throw new Error(data.message || "Échec");

        setMessages((prev) =>
          prev.map((message) => ({
            ...message,
            assistantActions: message.assistantActions?.map((actionCard) =>
              actionCard.id === card.id
                ? { ...actionCard, status: "Validé", action: { kind: "done", actionKind: card.action?.actionKind } }
                : actionCard
            ),
          }))
        );
        router.refresh();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.message || `Validé : ${card.title}.`,
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: error instanceof Error ? error.message : "Je n'ai pas pu exécuter cette action.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setRunningActionId(null);
      }
      return;
    }

    if ((card.action.kind === "create_shabbat_automation" || card.action.kind === "create_automation") && card.action.presetId) {
      setRunningActionId(card.id);
      try {
        const response = await fetch("/api/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presetId: card.action.presetId }),
        });
        if (!response.ok) throw new Error("Création échouée");
        router.refresh();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Créé : ${card.title}. Vous pouvez l'activer, le mettre en pause ou le configurer depuis vos automatisations.`,
            timestamp: new Date(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Je n'ai pas pu créer cette automatisation. Vérifiez vos droits ou réessayez.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setRunningActionId(null);
      }
      return;
    }

    if (card.action.kind === "create_shabbat_automation" || card.action.kind === "create_automation") {
      const preset = card.action.preset ?? "WEEKLY_SHABBAT";
      const setup = buildAutomationSetupDraft(preset);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Configurons ${setup.name}. Remplissez ou ajustez ces informations, puis je la crée.`,
          timestamp: new Date(),
          automationSetup: setup,
        },
      ]);
      return;
    }

    setRunningActionId(card.id);
    try {
      let response: Response | null = null;

      if (card.action.kind === "send_email" && card.action.emailData) {
        const confirmed = window.confirm(`Voulez-vous vraiment envoyer cet e-mail à ${card.action.emailData.to} ?\n\nSujet : ${card.action.emailData.subject}\n\n${card.action.emailData.body}`);
        if (!confirmed) {
          setRunningActionId(null);
          return;
        }

        response = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: card.action.emailData.to,
            subject: card.action.emailData.subject,
            bodyText: card.action.emailData.body,
          }),
        });
      }

      if (card.action.kind === "toggle_automation" && card.action.automationId) {
        response = await fetch(`/api/automations/${card.action.automationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !card.action.isActive }),
        });
      }

      if (card.action.kind === "trigger_automation" && card.action.automationId) {
        response = await fetch(`/api/automations/${card.action.automationId}/trigger`, { method: "POST" });
      }

      if (card.action.kind === "delete_automation" && card.action.automationId) {
        response = await fetch(`/api/automations/${card.action.automationId}`, { method: "DELETE" });
      }

      if (response && !response.ok) {
        throw new Error("Action échouée");
      }

      setMessages((prev) =>
        prev.map((message) => ({
          ...message,
          assistantActions: message.assistantActions?.map((actionCard) => {
            if (actionCard.id !== card.id || !actionCard.action) return actionCard;

            if (card.action?.kind === "toggle_automation") {
              const nextActive = !card.action.isActive;
              return {
                ...actionCard,
                status: nextActive ? "Actif" : "Pause",
                action: { ...actionCard.action, isActive: nextActive },
              };
            }

            if (card.action?.kind === "create_shabbat_automation" || card.action?.kind === "create_automation") {
              return { ...actionCard, status: "Créée", action: undefined };
            }

            if (card.action?.kind === "trigger_automation") {
              return { ...actionCard, status: "Lancée" };
            }

            if (card.action?.kind === "delete_automation") {
              return { ...actionCard, status: "Supprimée", action: undefined };
            }

            if (card.action?.kind === "send_email") {
              return { ...actionCard, status: "Envoyé", action: undefined };
            }

            return actionCard;
          }),
        }))
      );

      const confirmation =
        card.action.kind === "toggle_automation"
          ? `${card.action.isActive ? "Mis en pause" : "Activé"} : ${card.title}.`
          : card.action.kind === "trigger_automation"
            ? `Lancé : ${card.title}.`
            : card.action.kind === "delete_automation"
              ? `Supprimé : ${card.title}.`
              : card.action.kind === "send_email"
                ? `E-mail envoyé avec succès à ${card.action.emailData?.to}.`
                : `Créé : ${card.title}.`;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: confirmation,
          timestamp: new Date(),
        },
      ]);

      router.refresh();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Je n'ai pas pu appliquer cette action. Réessayez dans un instant.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setRunningActionId(null);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className={cn(
        "flex min-h-0 overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%)]",
        assistantExperience === "simple"
          ? "h-full min-h-full w-full bg-transparent"
          : "h-[calc(100dvh-4rem)]"
      )}
    >
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        config={billingConfig}
        featureLabel="Assistant IA"
        title="Assistant IA illimité avec le mode payant"
        description="Le mode gratuit inclut 20 messages avec l'assistant IA. Passez au mode payant pour continuer à créer, planifier et automatiser sans limite."
      />
      {/* â”€â”€ Sidebar historique â”€â”€ */}
      {assistantExperience === "detailed" && historyOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}
      {assistantExperience === "detailed" && <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[84vw] max-w-xs border-r border-slate-200/80 bg-white/90 flex flex-col shrink-0 shadow-2xl shadow-slate-950/10 backdrop-blur-xl transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:max-w-none lg:translate-x-0 lg:shadow-none",
          historyOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Bouton nouvelle conversation */}
        <div className="p-3">
          <Button onClick={startNewChat} className="w-full justify-start gap-2 rounded-xl border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100" variant="outline" size="sm">
            <Plus className="size-4" />
            Nouvelle conversation
          </Button>
        </div>

        {/* Liste des conversations groupées par date */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 py-1 text-xs font-semibold tracking-wide text-slate-600">
            Historique des conversations
          </p>
          {groupedConversations.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-8 px-4">
              Vos conversations apparaîtront ici
            </p>
          )}
          {groupedConversations.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1.5">
                {group.label}
              </p>
              {group.items.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative flex items-center rounded-lg px-2 py-2 text-sm cursor-pointer transition-colors",
                    activeConversationId === conv.id
                      ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                  onClick={() => loadConversation(conv.id)}
                >
                  <MessageSquare className="size-3.5 mr-2 shrink-0 text-slate-400" />

                  {editingId === conv.id ? (
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => renameConversation(conv.id, editTitle)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renameConversation(conv.id, editTitle);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="flex-1 bg-white border border-blue-300 rounded px-1 py-0.5 text-xs focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 truncate text-xs">{conv.title}</span>
                  )}

                  {/* Menu contextuel */}
                  {editingId !== conv.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(menuId === conv.id ? null : conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-300 transition-opacity"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  )}

                  {/* Dropdown menu */}
                  {menuId === conv.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-slate-200 shadow-lg py-1 w-36">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(conv.id);
                          setEditTitle(conv.title);
                          setMenuId(null);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="size-3" /> Renommer
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-3" /> Supprimer
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>}

      {assistantExperience === "simple" && false && simpleMainMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/30 md:hidden"
          onClick={() => setSimpleMainMenuOpen(false)}
        />
      )}

      {assistantExperience === "simple" && false && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-[84vw] max-w-xs shrink-0 flex-col border-r border-slate-200 bg-slate-50 shadow-2xl transition-transform duration-200",
            simpleMainMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-900">Menu principal</p>
            <button
              type="button"
              onClick={() => setSimpleMainMenuOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer le menu principal"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="hidden border-b border-slate-200 p-3">
            <Link
              href="/dashboard/overview"
              className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-transparent shadow-sm transition hover:border-blue-200"
            >
              <PanelLeftOpen className="size-4 text-slate-800" />
              <span className="text-slate-800">Menu principal</span>
              Mode détaillé
            </Link>
          </div>
          <div className="hidden flex-1 overflow-y-auto px-2 py-3">
            <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-slate-600">
              Historique des conversations
            </p>
            {groupedConversations.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-slate-400">
                Vos conversations apparaîtront ici
              </p>
            )}
            {groupedConversations.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase text-slate-400">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group flex items-center rounded-lg transition",
                        activeConversationId === conv.id
                          ? "bg-white font-semibold text-slate-950 shadow-sm"
                          : "text-slate-600 hover:bg-white hover:text-slate-950"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => loadConversation(conv.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm"
                      >
                        <MessageSquare className="size-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{conv.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Supprimer la conversation ${conv.title}`}
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-3">
              {simpleMenuSections.map((section, sectionIndex) => (
                <div key={section.section} className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                  <div className="mb-2 px-1">
                    <div className={cn("mb-1 h-1 w-9 rounded-full", sectionIndex % 3 === 0 ? "bg-blue-500" : sectionIndex % 3 === 1 ? "bg-cyan-500" : "bg-emerald-500")} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{section.section}</p>
                  </div>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 rounded-xl border border-transparent px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
                      >
                        {item.icon ? <item.icon className="size-4 text-slate-500" /> : null}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {assistantExperience === "simple" && simpleHistoryOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4 md:p-6">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold text-slate-900">Historique des conversations</p>
              <button
                type="button"
                onClick={() => setSimpleHistoryOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fermer l'historique des conversations"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[calc(88vh-60px)] overflow-y-auto px-3 py-3 sm:px-4">
              {groupedConversations.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-400">
                  Vos conversations apparaîtront ici
                </p>
              )}
              {groupedConversations.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {group.label}
                  </p>
                  <div className="space-y-1.5">
                    {group.items.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          "group flex items-center rounded-xl border px-2 py-1.5 transition",
                          activeConversationId === conv.id
                            ? "border-blue-200 bg-blue-50/70"
                            : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => loadConversation(conv.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
                        >
                          <MessageSquare className="size-3.5 shrink-0 text-slate-400" />
                          <span className="truncate text-sm text-slate-700">{conv.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label={`Supprimer la conversation ${conv.title}`}
                          title="Supprimer"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Zone de chat â”€â”€ */}
      <div className={cn("flex-1 flex flex-col min-w-0", assistantExperience === "simple" && "w-full")}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6",
          assistantExperience === "simple" && "border-slate-100"
        )}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {assistantExperience === "detailed" && (
              <button
                onClick={() => setHistoryOpen(true)}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50",
                  "lg:hidden"
                )}
                aria-label="Ouvrir l'historique"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            )}
            {assistantExperience === "simple" && (
              <button
                type="button"
                onClick={() => setSimpleMainMenuOpen(true)}
                className="hidden items-center gap-2 rounded-full border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:from-blue-50 hover:to-sky-50 hover:text-blue-700"
              >
                <PanelLeftOpen className="size-4" />
                <span>Menu</span>
              </button>
            )}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <Bot className="size-5 text-white" />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-base font-bold text-slate-900">
                {assistantExperience === "detailed" && activeConversationId
                  ? conversations.find((c) => c.id === activeConversationId)?.title ?? "Conversation"
                  : "Assistant IA"}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setCapabilitiesOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              aria-label="Tout ce que l'assistant peut faire"
              title="Tout ce que l'assistant peut faire"
            >
              <Info className="size-4" />
            </button>
            {assistantExperience === "simple" && (
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                aria-label="Nouvelle conversation"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nouvelle conversation</span>
              </button>
            )}
            {assistantExperience === "simple" && (
              <button
                type="button"
                onClick={() => setSimpleHistoryOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                <MessageSquare className="size-4" />
                <span className="hidden sm:inline">Historique des communications</span>
              </button>
            )}
            {/* Menu profil — fusionné depuis le topbar (desktop) */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50"
                aria-label="Menu du compte"
              >
                <span className="h-7 w-7 overflow-hidden rounded-full bg-slate-200">
                  {userAvatar ? (
                    <img src={userAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                      {(userName || communityName).substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-800">{communityName}</p>
                      {communitySubtitle && <p className="mt-0.5 truncate text-xs text-slate-400">{communitySubtitle}</p>}
                    </div>
                    <Link
                      href="/dashboard/settings?section=profile"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="size-4" />
                      Mon profil
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="size-4" />
                      Paramètres
                    </Link>
                    <div className="mt-1 border-t border-slate-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="size-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {assistantExperience === "detailed" && (
              <button
                type="button"
                onClick={() => setAssistantExperience("simple")}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
              >
                <Bot className="size-3.5" />
                Simple
              </button>
            )}
            {assistantExperience === "detailed" && (
              <button
                type="button"
                onClick={() => setAssistantExperience("detailed")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition"
              >
                <SlidersHorizontal className="size-3.5" />
                Mode détaillé
              </button>
            )}
            </div>
          </div>
        </div>

        {approvalDraft && (
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl border border-blue-200 bg-white p-4 shadow-sm ring-1 ring-blue-50 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Sparkles className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-950">
                    {approvalDraft.title || "Message prêt à être envoyé"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    {getApprovalChannelTypes().map((channel) => CHANNEL_LABELS[channel] ?? channel).join(" · ") || "Canal à confirmer"}
                  </p>
                  <div className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">
                    {approvalDraft.body}
                    {approvalDraft.hashtags.length > 0 && (
                      <span className="mt-3 block text-blue-700">{approvalDraft.hashtags.join(" ")}</span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={publishApprovalDraft} loading={approvingDraft}>
                      <Send className="size-4" />
                      Valider et envoyer
                    </Button>
                    <Button size="sm" variant="outline" onClick={startApprovalEditConversation}>
                      <MessageSquare className="size-4" />
                      Modifier avec l&apos;IA
                    </Button>
                    <Button size="sm" variant="outline" onClick={askForApprovalModels}>
                      <Pencil className="size-4" />
                      Proposer des modèles
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick prompts ou message vide */}
        {showQuickPrompts && !approvalDraft && (
	          <div className={cn(
              "flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6",
              assistantExperience === "simple" && "w-full justify-start overflow-y-auto px-6 pb-4 pt-4 sm:px-8"
            )}>
            <div className={cn(
              "hidden",
              assistantExperience === "simple" ? "rounded-full" : "rounded-2xl"
            )}>
              <Sparkles className="size-8 text-white" />
            </div>
            <div className="hidden">
              <h2 className="mb-2 text-center text-2xl font-black text-slate-900">
                Bienvenue
              </h2>
                <p className="mb-8 max-w-md text-center text-sm text-slate-500">
                  Je prépare vos publications automatiquement <strong className="font-semibold text-slate-700">(J-10, J-5, J-1)</strong>,
                  vos rappels et vos contenus. Vous validez, puis je <strong className="font-semibold text-slate-700">publie en un clic</strong>.
                  Je vous aide aussi à organiser <strong className="font-semibold text-slate-700">votre quotidien</strong> et à rester régulier.
                </p>
            </div>
            <h2 className="hidden mb-2 text-center text-2xl font-black text-slate-900 md:hidden">
              Bienvenue
            </h2>
              <p className="hidden mb-8 max-w-md text-center text-sm text-slate-500 md:hidden">
                Je prépare vos publications automatiquement <strong className="font-semibold text-slate-700">(J-10, J-5, J-1)</strong>,
                vos rappels et vos contenus. Vous validez, puis je <strong className="font-semibold text-slate-700">publie en un clic</strong>.
                Je vous aide aussi à organiser <strong className="font-semibold text-slate-700">votre quotidien</strong> et à rester régulier.
              </p>
            <div className="hidden">
              <h2 className="mb-2 text-center text-xl font-bold text-slate-900 sm:text-2xl">
                <span className="font-black">Bienvenue</span>
              </h2>
                <p className="mb-8 max-w-md text-center text-sm text-slate-500">
                  Je prépare vos publications automatiquement <strong className="font-semibold text-slate-700">(J-10, J-5, J-1)</strong>,
                  vos rappels et vos contenus. Vous validez, puis je <strong className="font-semibold text-slate-700">publie en un clic</strong>.
                  Je vous aide aussi à organiser <strong className="font-semibold text-slate-700">votre quotidien</strong> et à rester régulier.
                </p>
            </div>
            <h2 className="hidden">
              
            </h2>
            <p className="hidden">
              Je prépare vos publications automatiquement (J-10, J-5, J-1), vos rappels et vos contenus.
              Vous validez, puis je publie en un clic. Je vous aide aussi à organiser votre quotidien et à rester régulier.
            </p>

            {assistantExperience === "simple" && (
              <div className="mb-6 w-full max-w-4xl px-5 py-2 text-center sm:px-8">
                <div className="mx-auto inline-flex max-w-3xl flex-col items-center gap-3 px-2 py-1 sm:flex-row sm:gap-4">
                  <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center text-4xl">
                    <span className="animate-welcome-wave" aria-hidden="true">👋</span>
                  </div>
                  <div className="inline-flex min-w-0 items-center gap-2">
                    {communityLogoUrl && (
                      <span
                        className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-cover bg-center shadow-sm"
                        style={{ backgroundImage: `url(${communityLogoUrl})` }}
                        aria-label="Logo Assistant IA"
                      />
                    )}
                    <h2 className="text-center text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-left sm:text-3xl">
                      Assistant IA
                    </h2>
                  </div>
                </div>
                <p className="mx-auto mt-2 max-w-3xl text-sm leading-7 text-slate-700 sm:text-[15px]">
                  <strong className="font-black text-slate-900">Votre temps est précieux, concentrez-vous sur l’essentiel.</strong>
                  <br />
                  <span>L&apos;Assistant IA centralise et automatise toute votre communication depuis un seul espace.</span>
                </p>
              </div>
            )}

            {false && assistantExperience === "simple" && (
              <div className="mb-6 w-full max-w-4xl px-5 py-2 text-center sm:px-8">
                <div className="mb-2 text-3xl leading-none">ðŸ‘‹</div>
                <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  Bienvenue sur votre espace personnel
                </h2>
                <p className="mx-auto mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                  Votre temps est précieux — concentrez-vous sur l&apos;essentiel. l&apos;Assistant IA s&apos;occupe du reste !
                </p>
                <p className="mx-auto mt-0.5 max-w-3xl text-sm leading-7 text-slate-500 sm:text-[15px]">
                  (Publications récurrentes et automatisées, mail et Avis Google, agenda IA, assistant du quotidien, ressources communautaires)
                </p>
              </div>
            )}

            {assistantExperience === "simple" && false && (
              <div className="mb-6 w-full max-w-3xl md:hidden">
                <h3 className="mb-4 text-center text-base font-bold text-slate-900">
                  Actions rapides
                </h3>
                <div className="rounded-[1.8rem] border border-slate-200/80 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                  <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                    {mobileSimpleFeatures.map((item, index) => {
                      const Icon = item.icon;
                      const color = mobileCircleColors[index % mobileCircleColors.length];
                      const isExternal = item.external || item.href.startsWith("mailto");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noopener noreferrer" : undefined}
                          className="flex flex-col items-center gap-2 text-center"
                        >
                          <span className={cn(
                            "flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)] transition duration-200 hover:-translate-y-0.5",
                            color
                          )}>
                            {Icon ? <Icon className="size-6" /> : <Sparkles className="size-6" />}
                          </span>
                          <span className="text-xs font-semibold leading-4 text-slate-700">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {assistantExperience === "simple" && false && (
              <div className="mb-6 w-full max-w-3xl md:hidden">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllFeaturesMobile((prev) => !prev)}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#1E88E5] via-[#009688] to-[#00897B] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:opacity-95"
                  >
                    Toutes les fonctionnalités
                  </button>
                </div>
                {showAllFeaturesMobile && (
                  <div className="animate-fade-in mt-4 rounded-[1.8rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.1)] backdrop-blur-sm">
                    <div className="space-y-5">
                      {mobileDetailedSections.map((section, sectionIndex) => (
                        <div key={section.section}>
                          <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            {section.section}
                          </p>
                          <div className="grid grid-cols-2 gap-2.5">
                            {section.items.map((item, itemIndex) => {
                              const Icon = item.icon ?? Sparkles;
                              const isExternal = item.external || item.href.startsWith("mailto");
                              const tone = mobileFeatureCardTones[(sectionIndex + itemIndex) % mobileFeatureCardTones.length];
                              return (
                                <Link
                                  key={`${section.section}-${item.href}`}
                                  href={item.href}
                                  target={isExternal ? "_blank" : undefined}
                                  rel={isExternal ? "noopener noreferrer" : undefined}
                                  className={cn(
                                    "animate-mobile-feature-card-in group relative flex min-h-[96px] flex-col items-start rounded-[1.1rem] border bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition duration-200",
                                    "hover:-translate-y-0.5 hover:bg-white active:scale-[0.99]",
                                    tone.ring,
                                    tone.glow
                                  )}
                                  style={{ animationDelay: `${sectionIndex * 70 + itemIndex * 55}ms` }}
                                >
                                  <span className="pointer-events-none absolute inset-0 rounded-[1.1rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.18))]" />
                                  <span className={cn(
                                    "relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
                                    tone.iconWrap,
                                    tone.iconGlow
                                  )}>
                                    <Icon className="size-[18px]" />
                                  </span>
                                  <span className="relative z-10 mt-2.5 line-clamp-3 min-h-[2.5rem] text-[13px] font-semibold leading-5 text-slate-700">
                                    {item.label}
                                  </span>
                                  {isExternal && <ExternalLink className={cn("absolute right-3 top-3 z-10 size-3.5", tone.badge)} />}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {assistantExperience === "simple" && false && (
              <div className="mb-5 hidden w-full max-w-3xl grid-cols-1 gap-3 text-left md:grid md:grid-cols-3">
                {[
                  {
                    title: "Communication",
                    description: "posts, affiches, emails, WhatsApp",
                    icon: Share2,
                    accent: "bg-blue-500",
                    surface: "bg-blue-50/60",
                    iconTone: "text-blue-600",
                  },
                  {
                    title: "Organisation",
                    description: "quotidien, rappels, automatisations",
                    icon: CalendarDays,
                    accent: "bg-amber-500",
                    surface: "bg-amber-50/60",
                    iconTone: "text-amber-600",
                  },
                  {
                    title: "Pilotage",
                    description: "réseaux, publications, actions à valider",
                    icon: SlidersHorizontal,
                    accent: "bg-emerald-500",
                    surface: "bg-emerald-50/60",
                    iconTone: "text-emerald-600",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="group rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.09)]"
                  >
                    <div className={cn("mb-4 h-1 w-10 rounded-full", item.accent)} />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold tracking-tight text-slate-950">{item.title}</p>
                        <p className="mt-1.5 max-w-[11rem] text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", item.surface, item.iconTone)}>
                        <item.icon className="size-5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assistantExperience === "simple" && false && (
              <div className="mb-5 hidden w-full max-w-3xl grid-cols-1 gap-2 md:grid md:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Plan Chabbat", icon: Sparkles, prompt: "Prépare-moi un plan complet pour Chabbat cette semaine : message WhatsApp, post Instagram, affiche si disponible et rappel à programmer." },
                  { label: "Mes automatisations", icon: Zap, prompt: "Combien ai-je d'automatisations en cours ? Affiche uniquement celles déjà présentes sur mon Beth Habad." },
                  { label: "Définir quotidien", icon: Power, prompt: "Je veux définir mon quotidien et créer les routines utiles." },
                  { label: "Diagnostic compte", icon: SlidersHorizontal, prompt: "Fais un diagnostic simple de mon compte : automatisations, réseaux, quotidien, contenus et prochaines actions." },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.label === "Définir quotidien" ? setDailyRoutineMode(true) : sendMessage(item.prompt)}
                    className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <item.icon className="size-4" />
                    </span>
                    <span className="text-sm font-bold text-slate-800">{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {assistantExperience === "simple" && (
              <div className="mx-auto mb-5 grid w-full max-w-5xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="col-span-full mb-1 text-center">
                  <p className="text-sm font-bold tracking-tight text-slate-800">Actions rapides</p>
                </div>
                {simpleMainButtons.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={cn(
                      "group rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]",
                      item.mobileOnly ? "md:hidden" : ""
                    )}
                  >
                    <div className={cn("mb-3 h-1 w-10 rounded-full", item.accent)} />
                    <span className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl", item.iconBg, item.iconTone)}>
                      <item.icon className="size-4.5" />
                    </span>
                    <p className="text-sm font-semibold leading-5 text-slate-800">{item.label}</p>
                  </Link>
                ))}
              </div>
            )}

            {assistantExperience === "detailed" && (
              <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                {quickPrompts.map((qp, index) => (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.prompt)}
                    className={cn(
                      "group flex min-h-32 flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center shadow-sm ring-1 ring-white/80 transition-all hover:-translate-y-0.5 hover:shadow-md",
                      getQuickPromptStyle(index)
                    )}
                  >
                    <span className="text-sm font-bold leading-snug">{qp.label}</span>
                    {qp.description && (
                      <span className="mt-2 text-xs font-medium leading-snug opacity-80">
                        {qp.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {!showQuickPrompts && (
          <div className={cn(
            "flex-1 overflow-y-auto px-4 py-4 space-y-5 sm:px-6",
            assistantExperience === "simple" && "px-6 py-3 sm:px-8"
          )}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200 bg-white">
                  {message.role === "user" ? (
                    communityLogoUrl ? (
                      <img src={communityLogoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-700">{getCommunityInitials(communityName)}</span>
                    )
                  ) : (
                    <Bot className="size-4 text-slate-700" />
                  )}
                </div>

                <div className={cn("max-w-[88%] sm:max-w-[75%] group", message.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "border border-slate-200 bg-white text-slate-800 rounded-tl-sm ring-1 ring-slate-100"
                    )}
                  >
                    {message.content ? (
                      <div
                        className={cn(
                          "assistant-response",
                          message.role === "assistant" && "space-y-1"
                        )}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                      />
                    ) : (
                      <div className="flex py-1 text-slate-400">
                        <MessageLoading />
                      </div>
                    )}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.map((att) =>
                          att.isImage ? (
                            <a
                              key={att.url}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block h-20 w-20 overflow-hidden rounded-xl border border-white/30 bg-white/10"
                            >
                              <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                            </a>
                          ) : (
                            <a
                              key={att.url}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "flex max-w-[12rem] items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-medium",
                                message.role === "user"
                                  ? "border-white/30 bg-white/10 text-white"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              )}
                            >
                              <FileText className="size-4 shrink-0" />
                              <span className="truncate">{att.name}</span>
                            </a>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {message.role === "assistant" && message.content && (
                    <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyMessage(message.id, message.content)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 rounded px-2 py-0.5 hover:bg-slate-100"
                      >
                        {copiedId === message.id ? (
                          <><Check className="size-3" /> Copié</>
                        ) : (
                          <><Copy className="size-3" /> Copier</>
                        )}
                      </button>
                      <button
                        onClick={() => sendMessage("Reformule le contenu précédent d'une autre façon")}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 rounded px-2 py-0.5 hover:bg-slate-100"
                      >
                        <RefreshCw className="size-3" /> Reformuler
                      </button>
                    </div>
                  )}

                  {message.automationSetup && (
                    <div className="mt-3 rounded-[1.7rem] border border-amber-100 bg-gradient-to-br from-white to-amber-50/80 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">Informations à confirmer</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Ajustez les champs utiles avant création.
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">
                          {AUTOMATION_PRESETS[message.automationSetup.preset].logo}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <label className="grid gap-1.5">
                          <span className="text-xs font-bold text-slate-700">Nom</span>
                          <input
                            value={message.automationSetup.name}
                            onChange={(event) => updateAutomationSetup(message.id, { name: event.target.value })}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                          />
                        </label>

                        <label className="grid gap-1.5">
                          <span className="text-xs font-bold text-slate-700">Description</span>
                          <textarea
                            value={message.automationSetup.description}
                            rows={2}
                            onChange={(event) => updateAutomationSetup(message.id, { description: event.target.value })}
                            className="resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                          />
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {(message.automationSetup.trigger === "CUSTOM_SCHEDULE" || message.automationSetup.trigger === "WEEKLY_SHABBAT") && (
                            <label className="grid gap-1.5">
                              <span className="text-xs font-bold text-slate-700">Jour</span>
                              <select
                                value={message.automationSetup.day ?? "monday"}
                                onChange={(event) => {
                                  const day = AUTOMATION_DAYS.find((item) => item.value === event.target.value);
                                  updateAutomationSetup(message.id, {
                                    day: event.target.value,
                                    dayOfWeek: day?.dayOfWeek,
                                  });
                                }}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                              >
                                {AUTOMATION_DAYS.map((day) => (
                                  <option key={day.value} value={day.value}>{day.label}</option>
                                ))}
                              </select>
                            </label>
                          )}

                          {message.automationSetup.trigger === "JEWISH_HOLIDAY" && (
                            <label className="grid gap-1.5">
                              <span className="text-xs font-bold text-slate-700">Jours avant la fête</span>
                              <input
                                type="number"
                                min={1}
                                max={14}
                                value={message.automationSetup.daysBeforeHoliday ?? 3}
                                onChange={(event) => updateAutomationSetup(message.id, { daysBeforeHoliday: Number(event.target.value) })}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                              />
                            </label>
                          )}

                          <label className="grid gap-1.5">
                            <span className="text-xs font-bold text-slate-700">Heure</span>
                            <input
                              type="time"
                              value={message.automationSetup.time}
                              onChange={(event) => updateAutomationSetup(message.id, { time: event.target.value })}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                            />
                          </label>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-700">Canaux</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {AUTOMATION_CHANNELS.map((channel) => {
                              const selected = message.automationSetup?.channels.includes(channel);
                              return (
                                <button
                                  key={channel}
                                  type="button"
                                  onClick={() => updateAutomationSetupChannel(message.id, channel)}
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                                    selected
                                      ? "border-blue-200 bg-blue-600 text-white"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                                  )}
                                >
                                  {CHANNEL_LABELS[channel] ?? channel}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <label className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white/80 px-3 py-2">
                          <span className="text-xs font-bold text-slate-700">Activer dès maintenant</span>
                          <input
                            type="checkbox"
                            checked={message.automationSetup.isActive}
                            onChange={(event) => updateAutomationSetup(message.id, { isActive: event.target.checked })}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => confirmAutomationSetup(message)}
                          loading={runningActionId === `automation-setup-${message.id}`}
                          disabled={message.automationSetup.channels.length === 0 || message.automationSetup.name.trim().length < 2}
                        >
                          <Plus className="size-3.5" />
                          Créer l&apos;automatisation
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAutomationSetup(message.id, buildAutomationSetupDraft(message.automationSetup!.preset))}
                        >
                          Réinitialiser
                        </Button>
                      </div>
                    </div>
                  )}

                  {message.assistantActions && message.assistantActions.length > 0 && (() => {
                    const automationCards = message.assistantActions.filter(isAutomationAction);
                    const otherCards = message.assistantActions.filter((card) => !isAutomationAction(card));
                    const currentAutomations = automationCards.filter((card) => card.type === "automation");
                    const availableAutomations = automationCards.filter((card) => card.type !== "automation");
                    const activeCount = automationCards.filter((card) => card.status === "Actif").length;
                    const showCreateOnlyPanel = currentAutomations.length === 0 && availableAutomations.length > 0;

                    const renderActionButton = (card: AssistantActionCard) => card.action && card.action.kind !== "done" ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        variant={card.action.kind === "delete_automation" || card.action.actionKind === "delete_automation" ? "destructive" : "default"}
                        onClick={() => runAssistantAction(card)}
                        loading={runningActionId === card.id}
                      >
                        {card.action.kind === "toggle_automation" && card.action.isActive ? (
                          <PauseCircle className="size-3.5" />
                        ) : card.action.kind === "toggle_automation" ? (
                          <PlayCircle className="size-3.5" />
                        ) : card.action.kind === "trigger_automation" ? (
                          <PlayCircle className="size-3.5" />
                        ) : card.action.kind === "create_shabbat_automation" || card.action.kind === "create_automation" ? (
                          <Plus className="size-3.5" />
                        ) : card.action.kind === "send_email" ? (
                          <Send className="size-3.5" />
                        ) : card.action.kind === "switch_detailed" ? (
                          <SlidersHorizontal className="size-3.5" />
                        ) : card.action.kind === "confirm_pending" ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Power className="size-3.5" />
                        )}
                        {card.action.kind === "toggle_automation"
                          ? card.action.isActive ? "Pause" : "Activer"
                          : card.action.kind === "trigger_automation"
                            ? "Lancer"
                            : card.action.kind === "create_shabbat_automation" || card.action.kind === "create_automation"
                              ? "Créer"
                              : card.action.kind === "open_daily_routine"
                                ? "Configurer"
                                : card.action.kind === "send_email"
                                  ? "Confirmer l'envoi"
                                  : card.action.kind === "switch_detailed"
                                    ? "Ouvrir les paramètres"
                                    : card.action.kind === "confirm_pending"
                                      ? "Confirmer"
                                      : "Appliquer"}
                      </Button>
                    ) : null;

                    const renderCompactCard = (card: AssistantActionCard) => {
                      const Icon = getAutomationIcon(card);
                      return (
                        <div
                          key={card.id}
                          className="group rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
                              <Icon className="size-[18px]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-sm font-semibold tracking-tight text-slate-900">{card.title}</p>
                                {card.status && (
                                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                    {card.status}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{card.description}</p>
                              <div className="mt-3">{renderActionButton(card)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="mt-3 space-y-3">
                        {automationCards.length > 0 && (
                          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex flex-col items-center text-center">
                              <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                <Zap className="size-5" />
                                <span className="absolute inset-0 rounded-2xl ring-1 ring-slate-300 motion-safe:animate-[ping_2.6s_cubic-bezier(0,0,0.2,1)_infinite]" />
                              </div>
                              <p className="text-base font-semibold tracking-tight text-slate-900">
                                {showCreateOnlyPanel ? "Automatisations à créer" : "Vos automatisations"}
                              </p>
                              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                                {showCreateOnlyPanel
                                  ? "Activez en un clic ce qui vous est proposé."
                                  : `${activeCount} active${activeCount > 1 ? "s" : ""} · tout se gère depuis un seul endroit.`}
                              </p>
                            </div>

                            <div className="space-y-6">
                              {!showCreateOnlyPanel && (
                                <section>
                                  <div className="mb-2.5 flex items-center justify-between">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Déjà en place</p>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                      {currentAutomations.length}
                                    </span>
                                  </div>
                                  {currentAutomations.length > 0 ? (
                                    <div className="grid gap-2.5 md:grid-cols-2">
                                      {currentAutomations.map(renderCompactCard)}
                                    </div>
                                  ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center">
                                      <p className="text-xs text-slate-500">Aucune automatisation pour l&apos;instant.</p>
                                    </div>
                                  )}
                                </section>
                              )}

                              {availableAutomations.length > 0 && (
                                <section>
                                  <div className="mb-2.5 flex items-center justify-between">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">À créer</p>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                      {availableAutomations.length}
                                    </span>
                                  </div>
                                  <div className="grid gap-2.5 md:grid-cols-2">
                                    {availableAutomations.map(renderCompactCard)}
                                  </div>
                                </section>
                              )}

                              {!showCreateOnlyPanel && availableAutomations.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => sendMessage("Propose-moi d'autres automatisations pertinentes pour mon Beth Habad, de façon courte et concrète.")}
                                  className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  <Sparkles className="size-3.5" />
                                  Proposer d&apos;autres automatisations
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {otherCards.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {otherCards.map((card) => (
                              <div key={card.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">{card.title}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{card.description}</p>
                                  </div>
                                  {card.status && (
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                                      {card.status}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {card.href && assistantExperience === "detailed" && (
                                    <Link href={card.href}>
                                      <Button size="sm" variant="outline" className="h-8 text-xs">
                                        <ExternalLink className="size-3.5" />
                                        Ouvrir
                                      </Button>
                                    </Link>
                                  )}
                                  {renderActionButton(card)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {message.templateSuggestions && message.templateSuggestions.length > 0 && (() => {
                    // Labels de catégorie en français
                    const CATEGORY_LABELS_FR: Record<string, string> = {
                      SHABBAT: "Chabbat", HOLIDAY: "Fêtes", EVENT: "Événements",
                      COURSE: "Cours", ANNOUNCEMENT: "Annonces", RECAP: "Récap",
                      GREETING: "Vœux", GENERAL: "Général",
                    };
                    // Catégorie unique dans les suggestions (pour le lien "Voir plus")
                    const uniqueCategory = message.templateSuggestions!.every(
                      (t) => t.category === message.templateSuggestions![0].category
                    ) ? message.templateSuggestions![0].category : null;
                    const categoryLabel = uniqueCategory ? CATEGORY_LABELS_FR[uniqueCategory] : null;
                    const seeMoreHref = uniqueCategory
                      ? `/dashboard/templates?category=${uniqueCategory}`
                      : "/dashboard/templates";

                    return (
                      <div className="mt-3 space-y-3 rounded-3xl border border-blue-100 bg-blue-50/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {categoryLabel ? `Affiches — ${categoryLabel}` : "Affiches pertinentes"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {categoryLabel
                                ? `Modèles de la catégorie ${categoryLabel} uniquement.`
                                : "Sélectionnées selon le thème, les tags et les consignes IA."}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow-sm">
                            {message.templateSuggestions!.length} modèle{message.templateSuggestions!.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className={`grid gap-3 ${message.templateSuggestions!.length <= 3 ? "sm:grid-cols-2 md:grid-cols-3" : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"}`}>
                          {message.templateSuggestions!.map((template) => (
                            <div
                              key={template.id}
                              className="overflow-hidden rounded-2xl border border-blue-100 bg-white p-2 shadow-sm ring-1 ring-white/70"
                            >
                              <div className="overflow-hidden rounded-xl border border-white/80 bg-white p-1 shadow-inner">
                                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-slate-100">
                                  {template.thumbnailUrl ? (
                                    <img
                                      src={template.thumbnailUrl}
                                      alt={template.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                      Aperçu indisponible
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2 px-1 pb-1 pt-3">
                                <div>
                                  <p className="line-clamp-2 text-sm font-black leading-snug text-slate-900">
                                    {template.name}
                                  </p>
                                  {template.description && (
                                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-400">
                                      {template.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                    {CATEGORY_LABELS_FR[template.category] ?? template.category}
                                  </span>
                                  {template.tags.slice(0, 2).map((tag) => (
                                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full"
                                  onClick={() => chooseTemplate(template)}
                                  loading={preparingPoster && selectedTemplate?.id === template.id}
                                  disabled={preparingPoster}
                                >
                                  Choisir et préparer
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            href={seeMoreHref}
                            className="inline-flex text-xs font-medium text-blue-600 hover:underline"
                          >
                            Voir d&apos;autres affiches{categoryLabel ? ` ${categoryLabel}` : ""}
                          </Link>
                        </div>
                      </div>
                    );
                  })()}

                  {message.articleSuggestions && message.articleSuggestions.length > 0 && (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {message.articleSuggestions.map((article) => (
                          <div
                            key={article.id}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            <div className="aspect-[4/3] bg-slate-100">
                              {article.imageUrl ? (
                                <img
                                  src={article.imageUrl}
                                  alt={article.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                  Aperçu indisponible
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 p-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {article.name}
                                </p>
                                <p className="mt-1 text-lg font-bold text-slate-900">
                                  {formatArticlePrice(article.priceCents, article.currency)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {article.reason}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Link href={`/dashboard/articles/${article.slug}`} className="flex-1">
                                  <Button size="sm" variant="outline" className="w-full">
                                    Voir l&apos;article
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  loading={buyingArticleId === article.id}
                                  onClick={() => orderArticle(article.id)}
                                >
                                  Commander
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Link
                        href="/dashboard/articles"
                        className="inline-flex text-xs font-medium text-blue-600 hover:underline"
                      >
                        Voir d&apos;autres articles
                      </Link>
                    </div>
                  )}

                  {message.posterDraft && (
                    <div className="mt-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 p-4 shadow-sm ring-1 ring-white/70">
                      <div className="flex items-start gap-3">
                        {message.posterDraft.template.thumbnailUrl ? (
                          <div className="rounded-xl border border-white/80 bg-white p-1 shadow-inner">
                            <img
                              src={message.posterDraft.template.thumbnailUrl}
                              alt={message.posterDraft.template.name}
                              className="h-24 w-20 rounded-lg object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {message.posterDraft.template.name}
                          </p>
                          <div className="mt-2 space-y-1">
                            {Object.entries(message.posterDraft.generatedTexts).map(([key, value]) => (
                              <p key={key} className="text-xs text-slate-600">
                                <span className="font-medium">{key}</span> : {value}
                              </p>
                            ))}
                          </div>
                          {message.posterDraft.missingFields.length > 0 && (
                            <p className="mt-2 text-xs text-amber-600">
                              À confirmer : {message.posterDraft.missingFields.join(", ")}
                            </p>
                          )}
	                          <div className="mt-3 flex gap-2">
	                            <Button
	                              size="sm"
	                              onClick={() => renderPoster(message)}
	                              loading={renderingPoster}
	                            >
	                              Confirmer et générer
	                            </Button>
	                            <Button
	                              size="sm"
	                              variant="outline"
	                              onClick={() => openPosterEditor(message)}
	                            >
	                              Changer
	                            </Button>
	                          </div>
                          {editingPosterId === message.id && message.posterDraft && (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Modifier les textes</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Ajustez les champs à la main ou régénérez automatiquement avec les informations connues.
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => regeneratePosterDraft(message)}
                                  loading={preparingPoster}
                                  className="shrink-0"
                                >
                                  Générer
                                </Button>
                              </div>
                              <div className="mt-3 grid gap-2">
                                {Object.entries(message.posterDraft.generatedTexts).map(([key]) => (
                                  <label
                                    key={key}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-2"
                                  >
                                    <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
                                      {key.replace(/_/g, " ")}
                                    </span>
                                    <input
                                      value={posterDraftEdits[key] ?? ""}
                                      onChange={(event) =>
                                        setPosterDraftEdits((prev) => ({
                                          ...prev,
                                          [key]: event.target.value,
                                        }))
                                      }
                                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    />
                                  </label>
                                ))}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button size="sm" onClick={() => savePosterEdits(message)}>
                                  Enregistrer les modifications
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingPosterId(null)}
                                >
                                  Fermer
                                </Button>
                              </div>
                            </div>
                          )}
	                        </div>
	                      </div>
	                    </div>
                  )}

                  {message.generatedImageUrl && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 p-3 shadow-sm ring-1 ring-white/70">
                      <div className="rounded-xl border border-white/80 bg-white p-1 shadow-inner">
                        <img
                          src={message.generatedImageUrl}
                          alt="Affiche générée"
                          className="w-full rounded-lg object-cover"
                        />
                      </div>
                      <div className="mt-3">
                        <a
                          href={message.generatedImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-sm font-medium text-blue-600 hover:underline"
                        >
                          Ouvrir ou télécharger l&apos;affiche
                        </a>
                      </div>
                      {message.publishDraft && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center gap-2">
                            <Share2 className="size-4 text-blue-600" />
                            <p className="text-sm font-semibold text-slate-900">Publier cette affiche</p>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Choisis les réseaux souhaités puis ajuste la légende si besoin.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {channels.map((channel) => {
                              const isSelected = selectedPublishChannels.includes(channel.id);
                              return (
                                <button
                                  key={channel.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedPublishChannels((prev) =>
                                      prev.includes(channel.id)
                                        ? prev.filter((id) => id !== channel.id)
                                        : [...prev, channel.id]
                                    )
                                  }
                                  className={cn(
                                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                    isSelected
                                      ? "border-blue-600 bg-blue-600 text-white"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                    !channel.isConnected && channel.type !== "WHATSAPP" && channel.type !== "EMAIL" && "opacity-70"
                                  )}
                                >
                                  {CHANNEL_LABELS[channel.type] ?? channel.type}
                                </button>
                              );
                            })}
                          </div>
                          <textarea
                            value={publishCaption || message.publishDraft.caption}
                            onChange={(event) => setPublishCaption(event.target.value)}
                            className="mt-3 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => publishPoster(message)}
                              loading={publishingPosterId === message.id}
                              disabled={selectedPublishChannels.length === 0}
                            >
                              Publier maintenant
                            </Button>
                            <Link href="/dashboard/publications">
                              <Button size="sm" variant="outline">
                                Voir Publications
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && !hasStreamingAssistantMessage && (
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                  <Bot className="size-4 text-slate-700" />
                </div>
                <div className="max-w-[88%] sm:max-w-[75%]">
                  <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center">
                      <span className="text-slate-400">
                        <MessageLoading />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className={cn(
          "border-t border-slate-200/80 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6",
          assistantExperience === "simple" && "border-t-0 bg-transparent px-6 pb-4 pt-0 backdrop-blur-0 sm:px-8"
        )}>
          <div className={cn("mx-auto w-full max-w-3xl", assistantExperience === "simple" && "max-w-none")}>
          {selectedTemplate && (
            <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Template sélectionné : {selectedTemplate.name}
                </p>
                <p className="text-xs text-slate-500">
                  Décris les textes à remplacer, puis prépare l&apos;affiche.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Retirer
                </Button>
                <Button
                  size="sm"
                  onClick={() => preparePosterDraft()}
                  loading={preparingPoster}
                >
                  Préparer l&apos;affiche
                </Button>
              </div>
            </div>
          )}
          <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-slate-300 focus-within:shadow-md">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleFilesSelected}
              className="hidden"
            />
            {(pendingAttachments.length > 0 || uploadingAttachment || attachmentError) && (
              <div className="mb-1.5 flex flex-wrap items-center gap-2 px-1.5 pt-1">
                {pendingAttachments.map((att) => (
                  <div
                    key={att.url}
                    className="group/att relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1 pl-1 pr-2"
                  >
                    {att.isImage ? (
                      <img src={att.url} alt={att.name} className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <FileText className="size-4" />
                      </span>
                    )}
                    <span className="max-w-[8rem] truncate text-xs font-medium text-slate-600">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removePendingAttachment(att.url)}
                      className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition hover:bg-slate-300"
                      aria-label={`Retirer ${att.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                {uploadingAttachment && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Loader2 className="size-3.5 animate-spin" /> Envoi…
                  </span>
                )}
                {attachmentError && (
                  <span className="text-xs font-medium text-red-600">{attachmentError}</span>
                )}
              </div>
            )}
            <div className="flex items-end gap-2">
              <Button
                onClick={openFilePicker}
                size="icon"
                variant="ghost"
                disabled={uploadingAttachment}
                className="h-9 w-9 flex-shrink-0 rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Joindre une image ou un document"
                title="Joindre une image ou un document"
              >
                <Plus className="size-5" />
              </Button>
              <textarea
                id="assistant-specific-request"
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  if (!hasStartedPromptEntry && nextValue.trim().length > 0) {
                    setHasStartedPromptEntry(true);
                  }
                  setInput(nextValue);
                }}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? "Parlez, je vous écoute…" : animatedPlaceholder}
                rows={1}
                className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              {speechSupported && (
                <Button
                  onClick={toggleDictation}
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-9 w-9 flex-shrink-0 rounded-full transition",
                    isRecording
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  )}
                  aria-label={isRecording ? "Arrêter la dictée" : "Dicter avec le micro"}
                  title={isRecording ? "Arrêter la dictée" : "Dicter avec le micro"}
                >
                  <Mic className={cn("size-4", isRecording && "animate-pulse")} />
                </Button>
              )}
              <Button
                onClick={() => sendMessage()}
                size="icon"
                disabled={loading || uploadingAttachment}
                className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-50"
                aria-label="Envoyer la demande"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>
      {assistantExperience === "detailed" && !dailyRoutineLoading && showDailyRoutineBubble && (
        <div
          className="fixed z-40 hidden lg:block"
          style={{ right: "auto", top: `${bubblePosition.y}px`, left: `${bubblePosition.x}px` }}
        >
          <button
            type="button"
            onMouseDown={handleBubbleMouseDown}
            onClick={() => {
              if (bubbleDragState.current.moved) return;
              startNewChat();
              setDailyRoutineMode(true);
            }}
            className="group relative inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-600"
          >
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/90" />
            <span>Définir mon quotidien</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                setShowDailyRoutineBubble(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setShowDailyRoutineBubble(false);
                }
              }}
              className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
              aria-label="Fermer le bouton définir mon quotidien"
            >
              <X className="size-3.5" />
            </span>
          </button>
        </div>
      )}
      {dailyRoutineMode && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-8 sm:items-center">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <DailyRoutineWizard
              communityName={communityName}
              onSave={saveDailyRoutine}
              onCancel={() => setDailyRoutineMode(false)}
              saving={savingRoutine}
            />
          </div>
        </div>
      )}

      {capabilitiesOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setCapabilitiesOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-600 via-sky-500 to-amber-400 px-6 py-5 text-white">
              <div>
                <p className="text-lg font-black tracking-tight">Tout ce que votre assistant peut faire</p>
                <p className="mt-1 text-sm text-white/85">
                  Demandez-le simplement dans le chat : l&apos;assistant prépare, vous validez, il agit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCapabilitiesOpen(false)}
                className="shrink-0 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
              {[
                { icon: Sparkles, tone: "bg-violet-100 text-violet-700", title: "Créer du contenu", desc: "Posts, annonces et textes d'affiches adaptés à chaque réseau." },
                { icon: Share2, tone: "bg-blue-100 text-blue-700", title: "Publier", desc: "Instagram, Facebook, WhatsApp, Telegram — directement ou en brouillon." },
                { icon: Zap, tone: "bg-amber-100 text-amber-700", title: "Automatiser", desc: "Créer, activer ou mettre en pause des automatisations récurrentes." },
                { icon: CalendarDays, tone: "bg-emerald-100 text-emerald-700", title: "Gérer l'agenda", desc: "Ajouter événements et rappels, retrouvés dans l'Agenda connecté IA." },
                { icon: Send, tone: "bg-sky-100 text-sky-700", title: "Envoyer des emails", desc: "Préparer et envoyer des emails à votre communauté." },
                { icon: Gift, tone: "bg-rose-100 text-rose-700", title: "Vie juive", desc: "Horaires de Chabbat, fêtes et parachiot pris en compte automatiquement." },
                { icon: HeartHandshake, tone: "bg-teal-100 text-teal-700", title: "Vérifier vos canaux", desc: "Voir ce qui est connecté et ce qu'il reste à configurer." },
                { icon: Bot, tone: "bg-slate-100 text-slate-700", title: "Mémoriser vos préférences", desc: "Ton, signature, habitudes : l'assistant s'en souvient pour la suite." },
              ].map((cap) => (
                <div key={cap.title} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cap.tone)}>
                    <cap.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{cap.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{cap.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <Button onClick={() => setCapabilitiesOpen(false)} className="w-full">
                J&apos;ai compris
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
