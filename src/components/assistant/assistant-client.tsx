"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Send, Sparkles, Bot, Copy, Check, RefreshCw, Trash2,
  Plus, MessageSquare, Pencil, MoreHorizontal, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
}

// ============================================================
// CONSTANTES
// ============================================================

const QUICK_PROMPTS = [
  { label: "📅 Post Chabbat", prompt: "Génère un post pour annoncer les horaires de Chabbat de cette semaine" },
  { label: "📣 Annonce événement", prompt: "Aide-moi à rédiger une annonce pour un événement communautaire" },
  { label: "📝 Post récapitulatif", prompt: "Écris un post récapitulatif d'un événement qui vient de se terminer" },
  { label: "🕎 Voeux de fête", prompt: "Génère des voeux pour la prochaine fête juive" },
  { label: "📖 Cours de Torah", prompt: "Rédige une annonce pour un cours de Torah hebdomadaire" },
  { label: "💰 Collecte de fonds", prompt: "Écris un post engageant pour une collecte de dons" },
  { label: "🎉 Accueil nouveaux", prompt: "Rédige un message de bienvenue pour les nouveaux membres" },
  { label: "🌟 Pensée du jour", prompt: "Génère une pensée inspirante liée à la Torah" },
];

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

export function AssistantClient({ communityName, tone }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Charger l'historique au montage
  useEffect(() => {
    fetchConversations();
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
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(
        data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.createdAt),
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
  }

  // ── Chat ──

  const sendMessage = useCallback(async (content?: string) => {
    const messageContent = content ?? input.trim();
    if (!messageContent || loading) return;

    setInput("");

    // Créer la conversation si c'est le premier message
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
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error("Erreur API");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

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
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id ? { ...m, content: assistantContent } : m
                  )
                );
              }
            } catch {}
          }
        }
      }

      // Rafraîchir la liste pour récupérer le titre auto-généré
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
  }, [input, loading, activeConversationId, messages]);

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

  const showQuickPrompts = messages.length === 0;
  const groupedConversations = groupByDate(conversations);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Sidebar historique ── */}
      <div className="w-72 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
        {/* Bouton nouvelle conversation */}
        <div className="p-3">
          <Button onClick={startNewChat} className="w-full justify-start gap-2" variant="outline" size="sm">
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
                      ? "bg-slate-200 text-slate-900"
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
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
              <Bot className="size-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                {activeConversationId
                  ? conversations.find((c) => c.id === activeConversationId)?.title ?? "Conversation"
                  : "Assistant Yad.ia"}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-500">Gemini 2.5 Flash · Prêt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick prompts ou message vide */}
        {showQuickPrompts && (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg mb-6">
              <Sparkles className="size-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Shalom ! Comment puis-je vous aider ?
            </h2>
            <p className="text-sm text-slate-500 mb-8 text-center max-w-md">
              Génération de posts, annonces, contenu pour Chabbat, fêtes, événements…
              pour <strong>{communityName}</strong>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-2xl">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  className="text-xs text-left rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50 transition-colors text-slate-600 font-medium shadow-sm"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {!showQuickPrompts && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
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

                <div className={cn("max-w-[75%] group", message.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-slate-100 text-slate-800 rounded-tl-sm"
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
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Demandez à Yad.ia de générer un contenu…"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              size="icon"
              className="h-11 w-11 rounded-xl flex-shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
          </p>
        </div>
      </div>
    </div>
  );
}
