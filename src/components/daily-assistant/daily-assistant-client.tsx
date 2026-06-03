"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { Bot, CalendarCheck2, CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  eventId?: string;
};

const EXAMPLES = [
  "J'ai un evenement mardi a 18h.",
  "Ajoute une reunion dimanche prochain a 10h.",
  "Rappelle-moi de preparer mon projet vendredi matin.",
];

export function DailyAssistantClient() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Je suis votre assistant : dites-moi la date de votre événement, et je l'ajoute à votre Agenda connecté IA.",
    },
  ]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function submitMessage(event?: FormEvent<HTMLFormElement>, forcedMessage?: string) {
    event?.preventDefault();
    const message = (forcedMessage ?? input).trim();
    if (!message || loading) return;

    setInput("");
    setLoading(true);
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: message };
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch("/api/daily-assistant/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible d'ajouter cet element.");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message ?? "C'est ajouté dans votre Agenda connecté IA.",
          eventId: data.event?.id,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "Je n'ai pas reussi a ajouter cet element.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-blue-950 to-sky-800 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:p-8">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-50 backdrop-blur">
              <CalendarCheck2 className="size-4" />
              Agenda connecté IA
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Assistant du quotidien</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/90 sm:text-base">
              Écrivez à votre assistant n&apos;importe quel événement, rappel ou projet : il sera automatiquement enregistré dans votre Agenda connecté IA.
            </p>
          </div>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-50"
          >
            <CalendarCheck2 className="size-4 text-blue-600" />
            Voir l&apos;agenda
          </Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden rounded-[1.75rem] border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <Bot className="size-5" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-900">Assistant agenda</p>
                <p className="text-xs text-slate-500">Je comprends votre demande et je crée l&apos;événement automatiquement.</p>
              </div>
            </div>
          </div>

          <div className="min-h-[360px] space-y-4 bg-slate-50/70 p-4 sm:p-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[86%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm",
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700",
                  )}
                >
                  <p>{message.content}</p>
                  {message.eventId && (
                    <Link
                      href={`/dashboard/assistant?eventId=${message.eventId}`}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <CheckCircle2 className="size-3.5" />
                      Ouvrir l&apos;événement
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm">
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                  J&apos;ajoute dans votre agenda...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={submitMessage} className="border-t border-slate-100 bg-white p-4 sm:p-5">
            <p className="mb-3 text-sm font-bold text-slate-800">
              Je suis votre assistant : dites-moi la date de votre événement, et je l&apos;ajoute à votre Agenda connecté IA.
            </p>
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-2 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 sm:flex-row sm:items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
                placeholder="Exemple : Ajoute une reunion mardi a 18h"
                className="min-h-20 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:min-h-12"
              />
              <Button type="submit" disabled={loading || !input.trim()} className="rounded-2xl px-5">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Envoyer
              </Button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card className="rounded-[1.6rem] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-4 text-blue-600" />
              <h2 className="text-sm font-black text-slate-900">Exemples rapides</h2>
            </div>
            <div className="space-y-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => void submitMessage(undefined, example)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium leading-5 text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                >
                  {example}
                </button>
              ))}
            </div>
          </Card>
          <Card className="rounded-[1.6rem] border-blue-100 bg-blue-50/70 p-5">
            <p className="text-sm font-bold text-blue-950">Ce que l&apos;assistant comprend</p>
            <div className="mt-3 space-y-2 text-sm text-blue-900/80">
              <p>Nom de l&apos;événement</p>
              <p>Date et heure</p>
              <p>Rappel ou projet demande</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
