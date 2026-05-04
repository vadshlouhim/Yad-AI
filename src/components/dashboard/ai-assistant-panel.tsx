"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Send, Sparkles, Bot, Copy, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Props {
  communityName: string;
  tone: string;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  { label: "Post Chabbat", prompt: "Génère un post pour annoncer les horaires de Chabbat de cette semaine" },
  { label: "Annonce événement", prompt: "Aide-moi à rédiger une annonce pour un événement communautaire" },
  { label: "Post récapitulatif", prompt: "Écris un post récapitulatif d'un événement qui vient de se terminer" },
  { label: "Voeux de fête", prompt: "Génère des voeux pour la prochaine fête juive" },
  { label: "Cours de Torah", prompt: "Rédige une annonce pour un cours de Torah hebdomadaire" },
  { label: "Collecte de fonds", prompt: "Écris un post engageant pour une collecte de dons" },
];

export function AIAssistantPanel({ communityName, tone, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Shalom ! Je suis votre assistant IA Shalom IA pour **${communityName}**.\n\nJe peux vous aider à :\n- Générer des posts pour Chabbat, fêtes, événements\n- Adapter vos contenus par canal\n- Rédiger des annonces et récapitulatifs\n- Planifier votre communication\n\nQue souhaitez-vous créer aujourd'hui ?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(content?: string) {
    const messageContent = content ?? input.trim();
    if (!messageContent || loading) return;

    setInput("");
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          communityName,
          tone,
        }),
      });

      if (!response.ok) throw new Error("Erreur API");

      // Streaming de la réponse
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
                    m.id === assistantMessage.id
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      }
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
  }

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
      .replace(/\n/g, '<br />');
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 bg-slate-900">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Bot className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Assistant Shalom IA</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400">Claude · Prêt</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Prompts rapides (si premier message) */}
        {messages.length === 1 && (
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-medium text-slate-500 mb-2.5">Suggestions rapides :</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  className="text-xs text-left rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-blue-300 hover:bg-blue-50 transition-colors text-slate-600 font-medium"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                message.role === "user"
                  ? "bg-blue-600"
                  : "bg-amber-500"
              )}>
                {message.role === "user" ? (
                  <span className="text-xs text-white font-bold">U</span>
                ) : (
                  <Sparkles className="size-3.5 text-white" />
                )}
              </div>

              {/* Bulle */}
              <div className={cn(
                "max-w-[85%] group",
                message.role === "user" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-slate-100 text-slate-800 rounded-tl-sm"
                )}>
                  {message.content ? (
                    <span
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

                {/* Actions message assistant */}
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

        {/* Input */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Demandez à Shalom IA de générer un contenu…"
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
    </>
  );
}
