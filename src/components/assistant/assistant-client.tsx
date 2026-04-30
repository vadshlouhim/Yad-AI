"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Send, Sparkles, Bot, Copy, Check, RefreshCw, Trash2,
  Plus, MessageSquare, Pencil, MoreHorizontal, PanelLeftOpen, Share2,
  WandSparkles, ArrowRight, Settings,
} from "lucide-react";
import { CHANNEL_LABELS, cn } from "@/lib/utils";
import { formatArticlePrice } from "@/lib/articles/shared";
import { startArticleCheckout } from "@/lib/articles/checkout-client";
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

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  communityName: string;
  tone: string;
  channels: ChannelOption[];
  demoPrompt?: QuickPrompt & { href?: string };
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

interface FollowUpSuggestion {
  label: string;
  prompt: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const QUICK_PROMPTS: QuickPrompt[] = [
  { label: "Post Chabbat", prompt: "Génère un post pour annoncer les horaires de Chabbat de cette semaine" },
  { label: "Annonce événement", prompt: "Aide-moi à rédiger une annonce pour un événement communautaire" },
  { label: "Post récapitulatif", prompt: "Écris un post récapitulatif d'un événement qui vient de se terminer" },
  { label: "Voeux de fête", prompt: "Génère des voeux pour la prochaine fête juive" },
  { label: "Cours de Torah", prompt: "Rédige une annonce pour un cours de Torah hebdomadaire" },
  { label: "Collecte de fonds", prompt: "Écris un post engageant pour une collecte de dons" },
  { label: "Accueil nouveaux", prompt: "Rédige un message de bienvenue pour les nouveaux membres" },
  { label: "Pensée du jour", prompt: "Génère une pensée inspirante liée à la Torah" },
];

const FALLBACK_FOLLOW_UPS: FollowUpSuggestion[] = [
  {
    label: "Version courte",
    prompt: "Transforme ta réponse précédente en version courte, claire et prête à publier.",
  },
  {
    label: "Adapter par canal",
    prompt: "Adapte ta réponse précédente en versions WhatsApp, Instagram et email.",
  },
  {
    label: "Créer un visuel",
    prompt: "Propose une affiche ou un visuel adapté à ta réponse précédente.",
  },
];

const SUGGESTION_TAB_STYLES = [
  "border-blue-100 bg-gradient-to-br from-white via-blue-50 to-sky-100 text-blue-900 hover:border-blue-300 hover:from-blue-50 hover:to-sky-200",
  "border-violet-100 bg-gradient-to-br from-white via-violet-50 to-fuchsia-100 text-violet-900 hover:border-violet-300 hover:from-violet-50 hover:to-fuchsia-200",
  "border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-100 text-emerald-900 hover:border-emerald-300 hover:from-emerald-50 hover:to-teal-200",
  "border-amber-100 bg-gradient-to-br from-white via-amber-50 to-orange-100 text-amber-900 hover:border-amber-300 hover:from-amber-50 hover:to-orange-200",
];

function getSuggestionTabStyle(index: number) {
  return SUGGESTION_TAB_STYLES[index % SUGGESTION_TAB_STYLES.length];
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

function normalizeSuggestionText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getFollowUpSuggestions(message: Message): FollowUpSuggestion[] {
  if (message.role !== "assistant" || !message.content.trim()) {
    return [];
  }

  const text = normalizeSuggestionText(message.content);
  const suggestions: FollowUpSuggestion[] = [];

  const add = (suggestion: FollowUpSuggestion) => {
    if (!suggestions.some((item) => item.label === suggestion.label)) {
      suggestions.push(suggestion);
    }
  };

  if (message.templateSuggestions?.length || message.posterDraft || message.generatedImageUrl || /affiche|flyer|visuel|template/.test(text)) {
    add({
      label: "Préparer l'affiche",
      prompt: "À partir de ta réponse précédente, prépare les textes exacts pour une affiche.",
    });
    add({
      label: "Légende de publication",
      prompt: "Rédige une légende courte pour publier ce visuel sur les réseaux sociaux.",
    });
    add({
      label: "Déclinaisons réseaux",
      prompt: "Décline cette création en formats WhatsApp, Instagram et email.",
    });
  }

  if (/chabbat|shabbat|paracha|havdala|bougies|kiddouch|kidouch/.test(text)) {
    add({
      label: "Version WhatsApp",
      prompt: "Transforme ta réponse précédente en message WhatsApp court pour annoncer Chabbat.",
    });
    add({
      label: "Version Instagram",
      prompt: "Adapte ta réponse précédente en post Instagram avec accroche, emojis sobres et hashtags.",
    });
    add({
      label: "Ajouter une pensée",
      prompt: "Ajoute une courte pensée de Torah liée à cette annonce, en gardant le texte concis.",
    });
  }

  if (/evenement|événement|inscription|programme|cours|conference|conférence|soiree|soirée/.test(text)) {
    add({
      label: "Rappel J-1",
      prompt: "Crée un rappel J-1 à partir de ta réponse précédente.",
    });
    add({
      label: "Message d'inscription",
      prompt: "Rédige une version centrée sur l'inscription avec un appel à l'action clair.",
    });
    add({
      label: "Email complet",
      prompt: "Transforme ta réponse précédente en email complet avec objet, introduction et CTA.",
    });
  }

  if (message.articleSuggestions?.length || /article|boutique|commande|produit|prix/.test(text)) {
    add({
      label: "Texte boutique",
      prompt: "Rédige une description boutique plus vendeuse à partir de ta réponse précédente.",
    });
    add({
      label: "Post promotion",
      prompt: "Crée un post de promotion court pour mettre ces articles en avant.",
    });
  }

  add(FALLBACK_FOLLOW_UPS[0]);
  add(FALLBACK_FOLLOW_UPS[1]);
  add(FALLBACK_FOLLOW_UPS[2]);

  return suggestions.slice(0, 3);
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export function AssistantClient({ communityName, tone: _tone, channels, demoPrompt, seasonalPrompts }: Props) {
  void _tone;
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
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSuggestion | null>(null);
  const [preparingPoster, setPreparingPoster] = useState(false);
  const [renderingPoster, setRenderingPoster] = useState(false);
  const [publishingPosterId, setPublishingPosterId] = useState<string | null>(null);
  const [selectedPublishChannels, setSelectedPublishChannels] = useState<string[]>([]);
  const [publishCaption, setPublishCaption] = useState("");
  const [buyingArticleId, setBuyingArticleId] = useState<string | null>(null);
  // Quotidien
  const [dailyRoutineConfigured, setDailyRoutineConfigured] = useState(false);
  const [dailyRoutineLoading, setDailyRoutineLoading] = useState(true);
  const [dailyRoutineMode, setDailyRoutineMode] = useState(false);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Charger l'historique + routine au montage
  useEffect(() => {
    fetchConversations();
    fetchDailyRoutine();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeConversationId]);

  // ── API calls ──

  async function fetchConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      setConversations(await res.json());
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
    setConversations((prev) => [conv, ...prev]);
    return conv.id;
  }

  async function loadConversation(id: string) {
    setActiveConversationId(id);
    setMessages([]);
    setHistoryOpen(false);
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
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
    setEditingId(null);
  }

  function startNewChat() {
    setActiveConversationId(null);
    setMessages([]);
    setHistoryOpen(false);
  }

  // ── Chat ──

  const sendMessage = useCallback(async (
    content?: string,
    options?: { selectedTemplateId?: string | null; templateAction?: "select" | null; mode?: "daily_routine" }
  ) => {
    const messageContent = content ?? input.trim();
    if (!messageContent || loading) return;

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
          mode: options?.mode ?? (dailyRoutineMode ? "daily_routine" : undefined),
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
  }, [input, loading, activeConversationId, messages, selectedTemplate, dailyRoutineMode]);

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
      .replace(/\n/g, "<br />");
  }

  function sendFollowUp(prompt: string) {
    sendMessage(prompt);
  }

  const showQuickPrompts = messages.length === 0;
  const groupedConversations = groupByDate(conversations);
  const quickPrompts = seasonalPrompts.length >= 4
    ? seasonalPrompts.slice(0, 4)
    : [...seasonalPrompts, ...QUICK_PROMPTS].slice(0, 4);

  async function preparePosterDraft() {
    if (!selectedTemplate || preparingPoster) return;

    setPreparingPoster(true);
    try {
      const response = await fetch("/api/templates/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          messages: messages.map((message) => ({
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
    sendMessage(
      `Je choisis l'affiche « ${template.name} » pour cette création.`,
      { selectedTemplateId: template.id, templateAction: "select" }
    );
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

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_28rem),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%)]">
      {/* ── Sidebar historique ── */}
      {historyOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}
      <div
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
      </div>

      {/* ── Zone de chat ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Ouvrir l'historique"
            >
              <PanelLeftOpen className="size-4" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-amber-400 flex items-center justify-center shadow-sm shrink-0">
              <Bot className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900">
                {activeConversationId
                  ? conversations.find((c) => c.id === activeConversationId)?.title ?? "Conversation"
                  : "Shalom IA"}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate text-xs text-slate-500">Shalom AI · Prêt</span>
              </div>
            </div>
          </div>
          {dailyRoutineConfigured && (
            <button
              onClick={() => { startNewChat(); setDailyRoutineMode(true); }}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Settings className="size-3.5" />
              <span className="hidden sm:inline">Mon quotidien</span>
            </button>
          )}
        </div>

        {/* Wizard quotidien (prioritaire sur tout le reste) */}
        {dailyRoutineMode && (
          <DailyRoutineWizard
            communityName={communityName}
            onSave={saveDailyRoutine}
            onCancel={() => setDailyRoutineMode(false)}
            saving={savingRoutine}
          />
        )}

        {/* Quick prompts ou message vide */}
        {!dailyRoutineMode && showQuickPrompts && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-amber-400 flex items-center justify-center shadow-lg mb-6">
              <Sparkles className="size-8 text-white" />
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-slate-900 sm:text-2xl">
              Shalom ! Comment puis-je vous aider ?
            </h2>
            <p className="mb-8 max-w-md text-center text-sm text-slate-500">
              Génération de posts, annonces, contenu pour Chabbat, fêtes, événements…
              pour <strong>{communityName}</strong>
            </p>

            {/* Première utilisation : carte unique "Définir mon quotidien" */}
            {!dailyRoutineLoading && !dailyRoutineConfigured ? (
              <div className="w-full max-w-2xl">
                {demoPrompt && (
                  <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-indigo-50 p-3 text-center shadow-sm ring-1 ring-white/80">
                    <button
                      type="button"
                      onClick={() => sendMessage(demoPrompt.prompt)}
                      className="text-sm font-bold text-slate-950 transition-colors hover:text-blue-700"
                    >
                      {demoPrompt.label}
                    </button>
                    {demoPrompt.href && (
                      <a
                        href={demoPrompt.href}
                        target={demoPrompt.href.startsWith("http") ? "_blank" : undefined}
                        rel={demoPrompt.href.startsWith("http") ? "noreferrer" : undefined}
                        className="ml-2 inline-flex items-center justify-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                      >
                        Voir la vidéo de démo
                      </a>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setDailyRoutineMode(true)}
                  className="group w-full flex flex-col items-center justify-center rounded-2xl border border-blue-200 bg-gradient-to-br from-white via-blue-50 to-sky-100 px-6 py-10 text-center shadow-md ring-1 ring-white/80 transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-lg"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 shadow-sm">
                    <Settings className="size-6 text-white" />
                  </div>
                  <span className="text-lg font-bold text-blue-900">Définir mon quotidien</span>
                  <span className="mt-2 text-sm font-medium text-blue-600 opacity-80">
                    Configurez Shalom IA selon vos besoins communautaires habituels
                  </span>
                </button>
              </div>
            ) : (
              /* Utilisateur connu : 4 onglets habituels */
              <>
                {demoPrompt && (
                  <div className="mb-4 w-full max-w-2xl rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-indigo-50 p-3 text-center shadow-sm ring-1 ring-white/80">
                    <button
                      type="button"
                      onClick={() => sendMessage(demoPrompt.prompt)}
                      className="text-sm font-bold text-slate-950 transition-colors hover:text-blue-700"
                    >
                      {demoPrompt.label}
                    </button>
                    {demoPrompt.href && (
                      <a
                        href={demoPrompt.href}
                        target={demoPrompt.href.startsWith("http") ? "_blank" : undefined}
                        rel={demoPrompt.href.startsWith("http") ? "noreferrer" : undefined}
                        className="ml-2 inline-flex items-center justify-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                      >
                        Voir la vidéo de démo
                      </a>
                    )}
                  </div>
                )}
                <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                  {quickPrompts.map((qp, index) => (
                    <button
                      key={qp.label}
                      onClick={() => sendMessage(qp.prompt)}
                      className={cn(
                        "group flex min-h-32 flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center shadow-sm ring-1 ring-white/80 transition-all hover:-translate-y-0.5 hover:shadow-md",
                        getSuggestionTabStyle(index)
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
              </>
            )}
          </div>
        )}

        {/* Messages */}
        {!dailyRoutineMode && !showQuickPrompts && (
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
                        : "border border-slate-200 bg-white text-slate-800 rounded-tl-sm"
                    )}
                  >
                    {message.content ? (
                      <span dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
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

                  {message.role === "assistant" && message.content && (
                    <div className="mt-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-indigo-50 p-2 shadow-sm ring-1 ring-white/80">
                      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                        <WandSparkles className="size-3.5 text-blue-500" />
                        Suite suggérée
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getFollowUpSuggestions(message).map((suggestion, index) => (
                          <button
                            key={suggestion.label}
                            type="button"
                            onClick={() => sendFollowUp(suggestion.prompt)}
                            disabled={loading}
                            className={cn(
                              "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-center text-xs font-semibold shadow-sm transition-all disabled:pointer-events-none disabled:opacity-50",
                              getSuggestionTabStyle(index)
                            )}
                          >
                            {suggestion.label}
                            <ArrowRight className="size-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {message.templateSuggestions && message.templateSuggestions.length > 0 && (
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {message.templateSuggestions.map((template) => (
                          <div
                            key={template.id}
                            className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 p-2 shadow-sm ring-1 ring-white/70"
                          >
                            <div className="overflow-hidden rounded-xl border border-white/80 bg-white p-1 shadow-inner">
                              <div className="aspect-[4/5] overflow-hidden rounded-lg bg-slate-100">
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
                                <p className="text-sm font-semibold text-slate-900">
                                  {template.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {template.reason}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => chooseTemplate(template)}
                                >
                                  Choisir
                                </Button>
                                <Link href="/dashboard/templates" className="flex-1">
                                  <Button size="sm" variant="outline" className="w-full">
                                    Voir plus
                                  </Button>
                                </Link>
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
                              onClick={() => setSelectedTemplate(null)}
                            >
                              Changer
                            </Button>
                          </div>
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
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        {!dailyRoutineMode && <div className="border-t border-slate-200/80 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6">
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
                  onClick={preparePosterDraft}
                  loading={preparingPoster}
                >
                  Préparer l&apos;affiche
                </Button>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm ring-1 ring-slate-100">
            <div className="mb-1 flex items-center justify-between px-2">
              <label htmlFor="assistant-specific-request" className="text-xs font-semibold text-slate-500">
                Demande spécifique
              </label>
              <span className="hidden text-[11px] text-slate-400 sm:inline">
                Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
              </span>
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                id="assistant-specific-request"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre demande, ou cliquez sur une suite suggérée…"
                rows={2}
                className="flex-1 resize-none rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-11 w-11 rounded-xl flex-shrink-0"
                aria-label="Envoyer la demande"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-slate-400 sm:hidden">
            Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
          </p>
        </div>}
      </div>
    </div>
  );
}
