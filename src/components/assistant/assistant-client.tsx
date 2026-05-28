"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Send, Sparkles, Bot, Copy, Check, RefreshCw, Trash2,
  Plus, MessageSquare, Pencil, MoreHorizontal, PanelLeftOpen, Share2,
  X, SlidersHorizontal, PlayCircle, PauseCircle,
  Power, ExternalLink, Zap, CalendarDays, BookOpen, Gift, HeartHandshake,
  Lightbulb, Clock3, Radio, Mail, Hand,
} from "lucide-react";
import { CHANNEL_LABELS, cn } from "@/lib/utils";
import { formatArticlePrice } from "@/lib/articles/shared";
import { startArticleCheckout } from "@/lib/articles/checkout-client";
import { AUTOMATION_PRESETS, type AutomationPresetKey } from "@/lib/automation/presets";
import { DASHBOARD_NAV_ITEMS } from "@/components/layout/dashboard-nav";
import { DailyRoutineWizard } from "./daily-routine-wizard";
import type { RoutineItem } from "./daily-routine-wizard";

// ============================================================
// TYPES
// ============================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
    kind: "toggle_automation" | "trigger_automation" | "delete_automation" | "create_automation" | "create_shabbat_automation" | "open_daily_routine" | "switch_detailed" | "send_email";
    automationId?: string;
    isActive?: boolean;
    preset?: AutomationPresetKey;
    presetId?: string;
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
  { label: "Vœux de fête", description: "Texte + affiche + timing", prompt: "Prépare les voeux pour la prochaine fête juive avec texte, canaux recommandés et affiche si disponible." },
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

const STATIC_ASSISTANT_PLACEHOLDER = "Decrivez votre demande a EasyCom AI...";

const ALL_FEATURES_PROMPT =
  "Explique-moi clairement tout ce que EasyCom AI peut faire pour moi au quotidien. " +
  "Je veux un tour complet et concret : automatisations, reseaux sociaux, WhatsApp, Facebook, Instagram, " +
  "email, avis Google, agenda IA, assistant du quotidien, affiches, ressources communautaires, notifications, " +
  "et tout ce que je peux lancer en un clic depuis mon espace.";

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

function getAutomationTone(card: AssistantActionCard) {
  const key = `${card.action?.preset ?? ""} ${card.title}`.toLowerCase();
  if (/shabbat|chabbat/.test(key)) return "from-amber-50 to-orange-100 text-amber-700 border-amber-200";
  if (/thought|pensée|pensee/.test(key)) return "from-sky-50 to-blue-100 text-blue-700 border-blue-200";
  if (/course|cours/.test(key)) return "from-indigo-50 to-violet-100 text-indigo-700 border-indigo-200";
  if (/holiday|fête|fetes|voeux|vœux/.test(key)) return "from-rose-50 to-pink-100 text-rose-700 border-rose-200";
  if (/don|donation|collecte/.test(key)) return "from-emerald-50 to-teal-100 text-emerald-700 border-emerald-200";
  return "from-slate-50 to-slate-100 text-slate-700 border-slate-200";
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

export function AssistantClient({ communityName, communityLogoUrl, tone: _tone, channels, seasonalPrompts }: Props) {
  void _tone;
  const router = useRouter();
  const [assistantExperience, setAssistantExperienceState] = useState<"simple" | "detailed">("simple");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [simpleMainMenuOpen, setSimpleMainMenuOpen] = useState(false);
  const [socialNetworksMenuOpen, setSocialNetworksMenuOpen] = useState(false);
  const [simpleHistoryOpen, setSimpleHistoryOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSuggestion | null>(null);
  const [preparingPoster, setPreparingPoster] = useState(false);
  const [renderingPoster, setRenderingPoster] = useState(false);
  const [publishingPosterId, setPublishingPosterId] = useState<string | null>(null);
  const [selectedPublishChannels, setSelectedPublishChannels] = useState<string[]>([]);
  const [publishCaption, setPublishCaption] = useState("");
  const [buyingArticleId, setBuyingArticleId] = useState<string | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
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
  const bubbleDragState = useRef({ active: false, moved: false, offsetX: 0, offsetY: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const showQuickPrompts = messages.length === 0;
  const shouldAnimatePlaceholder = showQuickPrompts && !hasStartedPromptEntry && !loading;

  // Charger l'historique + routine au montage
  useEffect(() => {
    fetchConversations();
    fetchDailyRoutine();
    setAssistantExperienceState("simple");
    window.localStorage.setItem("shalom-assistant-experience", "simple");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversationId]);

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

  // ── API calls ──

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

  // ── Chat ──

  const sendMessage = useCallback(async (
    content?: string,
    options?: { selectedTemplateId?: string | null; templateAction?: "select" | null; mode?: "daily_routine" | "simplified" }
  ) => {
    const messageContent = content ?? input.trim();
    if (!messageContent || loading) return;

    setHasStartedPromptEntry(true);
    setInput("");

    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
      setActiveConversationId(convId);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
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
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("Erreur API");

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
  }, [input, loading, activeConversationId, messages, selectedTemplate, dailyRoutineMode, assistantExperience]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  function setAssistantExperience(mode: "simple" | "detailed") {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setAssistantExperienceState("simple");
      window.localStorage.setItem("shalom-assistant-experience", "simple");
      return;
    }
    if (mode === "simple") {
      setHistoryOpen(false);
      setMenuId(null);
    }
    setAssistantExperienceState(mode);
    window.localStorage.setItem("shalom-assistant-experience", mode);
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
    { label: "Automatisations", href: "/dashboard/automations", icon: Zap, accent: "bg-cyan-500", iconTone: "text-cyan-600", iconBg: "bg-cyan-50" },
    { label: "Réseaux Sociaux", href: "#", icon: Share2, accent: "bg-indigo-500", iconTone: "text-indigo-600", iconBg: "bg-indigo-50", action: "social" as const },
    { label: "Email", href: "/dashboard/email", icon: Mail, accent: "bg-sky-500", iconTone: "text-sky-600", iconBg: "bg-sky-50" },
    { label: "Avis Google", href: "/dashboard/google-reviews", icon: Sparkles, accent: "bg-amber-500", iconTone: "text-amber-600", iconBg: "bg-amber-50" },
    { label: "Assistant du quotidien", href: "/dashboard/events", icon: CalendarDays, accent: "bg-violet-500", iconTone: "text-violet-600", iconBg: "bg-violet-50" },
  ] as const;
  const mobileQuickFeatureConfigs = [
    { href: "/dashboard/automations", label: "Mes automatisations" },
    { href: "/dashboard/events", label: "Mon agenda IA" },
    { href: "/dashboard/email", label: "Email & Avis" },
    { href: "/dashboard/torah", label: "Cours de Torah IA" },
    { href: "/dashboard/templates", label: "Affiches" },
    { href: "https://boutique.shalom-ia.com", label: "Boutiques" },
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

      if (!response.ok) throw new Error("Création échouée");

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
        window.localStorage.setItem("shalom-assistant-experience", "detailed");
      }
      setAssistantExperienceState("detailed");
      setShowAllFeaturesMobile(true);
      router.push(card.href ?? "/dashboard/settings?section=interface");
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
          ? "h-[calc(100dvh-8rem)] min-h-[620px] rounded-3xl border border-slate-200/80 bg-white/70 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
          : "h-[calc(100dvh-4rem)]"
      )}
    >
      {/* ── Sidebar historique ── */}
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

      {/* ── Zone de chat ── */}
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
            <img
              src="/easycom-ai-logo.png"
              alt="Logo EasyCom AI"
              className="h-9 w-9 shrink-0 rounded-lg object-contain md:hidden"
            />
            <div className={cn(
              "hidden w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-amber-400 items-center justify-center shadow-sm shrink-0 md:flex",
              assistantExperience === "simple" && "rounded-full"
            )}>
              <Bot className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900">
                {assistantExperience === "simple"
                  ? "EasyCom AI"
                  : activeConversationId
                  ? conversations.find((c) => c.id === activeConversationId)?.title ?? "Conversation"
                  : "Assistant IA"}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate text-xs text-slate-500">
                  {assistantExperience === "simple" ? "Assistant IA" : "Assistant principal · Prêt"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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

        {/* Quick prompts ou message vide */}
        {showQuickPrompts && (
	          <div className={cn(
              "flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6",
              assistantExperience === "simple" && "w-full justify-center overflow-y-auto pb-8 pt-8"
            )}>
            <div className="mb-4 flex justify-center md:hidden">
              <img
                src="/assistant-robot-mobile.png"
                alt="Robot assistant EasyCom AI"
                className="h-auto w-[86px] object-contain"
              />
            </div>
            <div className={cn(
              "hidden",
              assistantExperience === "simple" ? "rounded-full" : "rounded-2xl"
            )}>
              <Sparkles className="size-8 text-white" />
            </div>
            <div className="hidden">
              <h2 className="mb-2 text-center text-2xl font-black text-slate-900">
                Bienvenue 👋
              </h2>
                <p className="mb-8 max-w-md text-center text-sm text-slate-500">
                  Je prépare vos publications automatiquement <strong className="font-semibold text-slate-700">(J-10, J-5, J-1)</strong>,
                  vos rappels et vos contenus. Vous validez, puis je <strong className="font-semibold text-slate-700">publie en un clic</strong>.
                  Je vous aide aussi à organiser <strong className="font-semibold text-slate-700">votre quotidien</strong> et à rester régulier.
                </p>
            </div>
            <h2 className="hidden mb-2 text-center text-2xl font-black text-slate-900 md:hidden">
              Bienvenue 👋
            </h2>
              <p className="hidden mb-8 max-w-md text-center text-sm text-slate-500 md:hidden">
                Je prépare vos publications automatiquement <strong className="font-semibold text-slate-700">(J-10, J-5, J-1)</strong>,
                vos rappels et vos contenus. Vous validez, puis je <strong className="font-semibold text-slate-700">publie en un clic</strong>.
                Je vous aide aussi à organiser <strong className="font-semibold text-slate-700">votre quotidien</strong> et à rester régulier.
              </p>
            <div className="hidden">
              <h2 className="mb-2 text-center text-xl font-bold text-slate-900 sm:text-2xl">
                <span className="font-black">Bienvenue</span> 👋
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
                <div className="mx-auto inline-flex max-w-3xl flex-col items-center gap-3 rounded-[2rem] border border-blue-100/80 bg-white px-5 py-4 shadow-[0_18px_50px_rgba(37,99,235,0.10)] sm:flex-row sm:gap-4 sm:px-6">
                  <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 shadow-[0_14px_28px_rgba(14,116,214,0.28)]">
                    <Hand className="animate-welcome-wave size-7 text-white" aria-hidden="true" />
                  </div>
                  <h2 className="text-center text-2xl font-black tracking-tight text-slate-900 sm:text-left sm:text-3xl">
                    Bienvenue sur votre espace personnel
                  </h2>
                </div>
                <p className="mx-auto mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                  Votre temps est precieux - concentrez-vous sur l&apos;essentiel. EasyComAI s&apos;occupe du reste !
                </p>
                <p className="mx-auto mt-0.5 max-w-3xl text-sm leading-7 text-slate-500 sm:text-[15px]">
                  (Publications recurrentes et automatisees, mail et Avis Google, agenda IA, assistant du quotidien, ressources communautaires)
                </p>
              </div>
            )}

            {false && assistantExperience === "simple" && (
              <div className="mb-6 w-full max-w-4xl px-5 py-2 text-center sm:px-8">
                <div className="mb-2 text-3xl leading-none">👋</div>
                <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  Bienvenue sur votre espace personnel
                </h2>
                <p className="mx-auto mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                  Votre temps est précieux — concentrez-vous sur l’essentiel. EasyComAI s’occupe du reste !
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
              <div className="mx-auto mb-5 grid w-full max-w-5xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                <div className="col-span-full mb-1 text-center">
                  <p className="text-sm font-bold tracking-tight text-slate-800">Actions rapides</p>
                </div>
                {simpleMainButtons.map((item) => (
                  item.action === "social" ? (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setSocialNetworksMenuOpen((prev) => !prev)}
                      className="group rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]"
                    >
                      <div className={cn("mb-3 h-1 w-10 rounded-full", item.accent)} />
                      <span className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl", item.iconBg, item.iconTone)}>
                        <item.icon className="size-4.5" />
                      </span>
                      <p className="text-sm font-semibold leading-5 text-slate-800">{item.label}</p>
                    </button>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.1)]"
                    >
                      <div className={cn("mb-3 h-1 w-10 rounded-full", item.accent)} />
                      <span className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl", item.iconBg, item.iconTone)}>
                        <item.icon className="size-4.5" />
                      </span>
                      <p className="text-sm font-semibold leading-5 text-slate-800">{item.label}</p>
                    </Link>
                  )
                ))}
                <div className="col-span-full pt-2">
                  <button
                    type="button"
                    onClick={() => sendMessage(ALL_FEATURES_PROMPT)}
                    className="group relative w-full overflow-hidden rounded-[1.6rem] border border-blue-200/80 bg-[linear-gradient(135deg,rgba(29,78,216,0.96),rgba(14,116,144,0.92),rgba(245,158,11,0.92))] px-5 py-4 text-left text-white shadow-[0_18px_36px_rgba(29,78,216,0.26)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(29,78,216,0.3)]"
                  >
                    <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_10%,rgba(255,255,255,0.2)_32%,transparent_56%)] opacity-70 animate-[pulse_3.8s_ease-in-out_infinite]" />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[15px] font-black tracking-tight sm:text-base">
                          {"Tout ce que EasyCom AI peut faire"}
                        </p>
                        <p className="mt-1 text-sm text-white/85">
                          {"Decouvrez en un clic tout ce que l'assistant peut preparer, automatiser et gerer pour vous."}
                        </p>
                      </div>
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/16 ring-1 ring-white/20 backdrop-blur-sm transition group-hover:scale-105">
                        <Sparkles className="size-5" />
                      </span>
                    </div>
                  </button>
                </div>
                {socialNetworksMenuOpen && (
                  <div className="col-span-full rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Réseaux Sociaux</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Link href="/dashboard/whatsapp" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700">
                        WhatsApp
                      </Link>
                      <Link href="/dashboard/facebook" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
                        Facebook
                      </Link>
                      <Link href="/dashboard/instagram" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-fuchsia-200 hover:text-fuchsia-700">
                        Instagram
                      </Link>
                    </div>
                  </div>
                )}
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
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 sm:px-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    message.role === "user" ? "bg-blue-600" : "bg-amber-500"
                  )}
                >
                  {message.role === "user" ? (
                    <span className="text-xs text-white font-bold">U</span>
                  ) : (
                    <Sparkles className="size-4 text-white" />
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
                      <div className="flex gap-1 py-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
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
                          Créer l’automatisation
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
                    const visualCards = automationCards.slice(0, 5);
                    const showCreateOnlyPanel = currentAutomations.length === 0 && availableAutomations.length > 0;

                    const renderActionButton = (card: AssistantActionCard) => card.action ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        variant={card.action.kind === "delete_automation" ? "destructive" : card.action.kind === "send_email" ? "default" : "default"}
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
                                    : "Appliquer"}
                      </Button>
                    ) : null;

                    const renderCompactCard = (card: AssistantActionCard) => {
                      const Icon = getAutomationIcon(card);
                      return (
                        <div
                          key={card.id}
                          className={cn(
                            "rounded-2xl border bg-gradient-to-br p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                            getAutomationTone(card)
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-sm">
                              <Icon className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-2 text-sm font-black leading-snug text-slate-900">{card.title}</p>
                                {card.status && (
                                  <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black text-slate-600">
                                    {card.status}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{card.description}</p>
                              <div className="mt-3">{renderActionButton(card)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="mt-3 space-y-3">
                        {automationCards.length > 0 && (
                          <div className={cn(
                            "overflow-hidden rounded-[2rem] p-4 shadow-sm ring-1 ring-white",
                            showCreateOnlyPanel
                              ? "border border-amber-100 bg-gradient-to-br from-white to-amber-50/80"
                              : "border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50"
                          )}>
                            {!showCreateOnlyPanel && <div className="relative mx-auto flex h-48 max-w-md items-center justify-center">
                              <div className="absolute inset-8 rounded-full border border-dashed border-blue-200" />
                              <div className="absolute h-20 w-20 animate-ping rounded-full bg-blue-200/30" />
                              <div className="absolute h-32 w-32 animate-pulse rounded-full bg-amber-200/20" />
                              {visualCards.map((card, index) => {
                                const Icon = getAutomationIcon(card);
                                const positions = [
                                  "left-8 top-5",
                                  "right-8 top-8",
                                  "left-10 bottom-8",
                                  "right-12 bottom-6",
                                  "top-2 left-1/2 -translate-x-1/2",
                                ];
                                return (
                                  <div
                                    key={card.id}
                                    className={cn(
                                      "group/icon absolute flex h-12 w-12 items-center justify-center rounded-2xl border bg-white shadow-lg transition hover:z-20 hover:-translate-y-1 hover:shadow-xl",
                                      positions[index % positions.length]
                                    )}
                                    style={{ animation: "bounce 2.8s infinite", animationDelay: `${index * 180}ms` }}
                                    aria-label={card.title}
                                  >
                                    <Icon className="size-5 text-blue-700" />
                                    <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 min-w-max -translate-x-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-800 opacity-0 shadow-lg shadow-slate-950/10 backdrop-blur transition duration-150 group-hover/icon:opacity-100">
                                      {card.title.replace(/^[^\p{L}\p{N}]+/u, "").trim()}
                                    </div>
                                  </div>
                                );
                              })}
                              <div
                                className={cn(
                                  "relative z-10 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-900 text-sm font-black text-white shadow-2xl",
                                  communityLogoUrl && "bg-cover bg-center"
                                )}
                                style={communityLogoUrl ? { backgroundImage: `url(${communityLogoUrl})` } : undefined}
                                aria-label={communityName}
                              >
                                {communityLogoUrl && <span className="absolute inset-0 bg-slate-950/20" />}
                                <span className="relative z-10 flex flex-col items-center leading-none">
                                  <span className="text-lg font-black">✡</span>
                                  {!communityLogoUrl && (
                                    <span className="mt-0.5 text-[10px] tracking-wide">{getCommunityInitials(communityName)}</span>
                                  )}
                                </span>
                              </div>
                              <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
                                <Radio className="size-3.5 text-emerald-500" />
                                {activeCount} active{activeCount > 1 ? "s" : ""}
                              </div>
                            </div>}
                            <div className="text-center">
                              <p className="text-sm font-black text-slate-900">
                                {showCreateOnlyPanel ? "Automatisations à créer" : "Vos automatisations"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {showCreateOnlyPanel
                                  ? "Voici seulement les options disponibles en un clic."
                                  : "Celles déjà installées sont séparées de celles que vous pouvez créer."}
                              </p>
                            </div>

                            <div className="mt-4 space-y-4">
                              {!showCreateOnlyPanel && <div className="rounded-3xl border border-white bg-white/75 p-3 shadow-sm">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black text-slate-900">Déjà en place</p>
                                    <p className="mt-0.5 text-xs text-slate-500">Automatisations configurées sur votre compte.</p>
                                  </div>
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                                    {currentAutomations.length}
                                  </span>
                                </div>
                                {currentAutomations.length > 0 ? (
                                  <div className="grid gap-2 md:grid-cols-2">
                                    {currentAutomations.map(renderCompactCard)}
                                  </div>
                                ) : (
                                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                                    <p className="text-sm font-bold text-slate-700">Aucune automatisation active pour l’instant.</p>
                                    <p className="mt-1 text-xs text-slate-500">Choisissez une option ci-dessous pour commencer.</p>
                                  </div>
                                )}
                              </div>}

                              {availableAutomations.length > 0 && (
                                <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/80 p-3 shadow-sm">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-black text-slate-900">À créer</p>
                                      <p className="mt-0.5 text-xs text-slate-500">Automatisations disponibles en un clic.</p>
                                    </div>
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">
                                      {availableAutomations.length}
                                    </span>
                                  </div>
                                  <div className="grid gap-2 md:grid-cols-2">
                                    {availableAutomations.map(renderCompactCard)}
                                  </div>
                                </div>
                              )}

                              {!showCreateOnlyPanel && availableAutomations.length > 0 && <div className="rounded-2xl border border-white bg-white/80 p-3 text-center shadow-sm">
                                <p className="text-sm font-bold text-slate-900">
                                  Voulez-vous que je vous propose d&apos;autres automatisations pertinentes ?
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 h-8 rounded-full text-xs"
                                  onClick={() => sendMessage("Propose-moi d'autres automatisations pertinentes pour mon Beth Habad, de façon courte et concrète.")}
                                >
                                  <Sparkles className="size-3.5 text-amber-500" />
                                  Oui, propose-moi
                                </Button>
                              </div>}
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

                  {message.templateSuggestions && message.templateSuggestions.length > 0 && (
                    <div className="mt-3 space-y-3 rounded-3xl border border-blue-100 bg-blue-50/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">Affiches les plus pertinentes</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Sélectionnées selon le thème demandé, les tags, la catégorie et les consignes IA.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700 shadow-sm">
                          {message.templateSuggestions.length} choix
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {message.templateSuggestions.map((template) => (
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
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {template.reason}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  {template.category}
                                </span>
                                {template.tags.slice(0, 2).map((tag) => (
                                  <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="grid gap-2">
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
                          </div>
                        ))}
                      </div>
                      <Link
                        href="/dashboard/templates"
                        className="inline-flex text-xs font-medium text-blue-600 hover:underline"
                      >
                        Voir d&apos;autres affiches
                      </Link>
                    </div>
                  )}

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
            {loading && (
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500">
                  <Sparkles className="size-4 text-white" />
                </div>
                <div className="max-w-[88%] sm:max-w-[75%]">
                  <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500">EasyCom AI reflechit</span>
                      <div className="relative h-7 w-4 overflow-hidden">
                        <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-blue-700 animate-[bounce_1s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200/80 bg-slate-50/85 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
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
          <div className="rounded-[2rem] bg-white p-3 shadow-[0_20px_48px_rgba(15,23,42,0.16)]">
            <div className="relative rounded-[calc(2rem-1px)] bg-white p-3">
              <div className="mb-3 flex items-center justify-between px-2">
                <label htmlFor="assistant-specific-request" className="hidden items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white sm:inline-flex">
                  <Bot className="size-3.5 text-blue-200" />
                  Assistant IA
                </label>
                <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm sm:hidden">
                  <Bot className="size-3.5 text-blue-200" />
                  <span>Assistant IA</span>
                </div>
                <div className="hidden items-center gap-2 text-[11px] font-semibold text-slate-500 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-blue-700 animate-pulse" />
                  En ligne
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94),rgba(29,78,216,0.92))] p-[1.5px]">
                <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(37,99,235,0.08),rgba(15,23,42,0.02),rgba(37,99,235,0.16),rgba(15,23,42,0.02),rgba(37,99,235,0.08))] animate-[spin_18s_linear_infinite]" />
                <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.7rem-1px)] border border-blue-900/40" />
                <div className="relative flex items-end gap-2.5 rounded-[calc(1.7rem-1px)] bg-white p-2">
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
                    placeholder={animatedPlaceholder}
                    rows={2}
                    className="flex-1 resize-none rounded-[1.35rem] border border-transparent bg-transparent px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    size="icon"
                    disabled={loading}
                    className="h-12 w-12 flex-shrink-0 rounded-[1.35rem] bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] text-white shadow-[0_10px_24px_rgba(30,64,175,0.24)] ring-1 ring-blue-300/40 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(30,64,175,0.32)] disabled:opacity-60"
                    aria-label="Envoyer la demande"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
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
    </div>
  );
}
