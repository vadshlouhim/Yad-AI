"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

// ─── Données de la conversation ───────────────────────────────────────────────

const MSG_1 = "Prépare un email de relance pour les clients inactifs";
const MSG_2 = "Adapte-le aussi pour Instagram et Facebook";

// ─── Types ────────────────────────────────────────────────────────────────────

type Msg =
  | { id: string; who: "user"; text: string }
  | { id: string; who: "bot-typing" }
  | { id: string; who: "bot"; variant: "card1" | "card2" };

// ─── Sous-composants ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-slate-400"
          style={{ animation: `chatTyping 1s ${i * 0.18}s ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}

function BotCard1() {
  return (
    <div className="space-y-2.5 text-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Message préparé
      </p>
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 leading-5 text-slate-800">
        <p><strong>Objet : On vous accompagne pour relancer vos ventes</strong></p>
        <p className="mt-1 text-xs text-slate-500">
          Bonjour, cela fait un moment. Voici une offre claire et limitée pour revenir cette semaine.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
          Email · CRM
        </span>
        {["Texte prêt", "Version validée"].map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
          >
            <CheckCircle2 className="size-3" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function BotCard2() {
  return (
    <div className="space-y-2.5 text-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-4 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-slate-900">Envoyé à 124 contacts</p>
          <p className="text-xs text-slate-500">Email · Instagram · Facebook · à l&apos;instant</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="size-3" />
        Diffusion réussie
      </span>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function HeroAnimation() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [inputText, setInputText] = useState("");
  const [inputActive, setInputActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll interne au conteneur — NE scrolle PAS la page
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Séquence d'animation principale (boucle infinie)
  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let itvl1: ReturnType<typeof setInterval> | null = null;
    let itvl2: ReturnType<typeof setInterval> | null = null;

    function stop() {
      timers.forEach(clearTimeout);
      timers.length = 0;
      if (itvl1) { clearInterval(itvl1); itvl1 = null; }
      if (itvl2) { clearInterval(itvl2); itvl2 = null; }
    }

    function abs(fn: () => void, ms: number) {
      timers.push(setTimeout(() => { if (alive) fn(); }, ms));
    }

    function run() {
      if (!alive) return;

      setMessages([]);
      setInputText("");
      setInputActive(false);

      // ── Phase 1 : frappe du MSG_1 ──────────────────────────────────────
      abs(() => {
        setInputActive(true);
        let i = 0;
        itvl1 = setInterval(() => {
          if (!alive) return clearInterval(itvl1!);
          i++;
          setInputText(MSG_1.slice(0, i));
          if (i >= MSG_1.length) { clearInterval(itvl1!); itvl1 = null; }
        }, 35);
      }, 400);

      // Envoi MSG_1 (T ≈ 400 + 49×35 = 2115ms → on envoie à 2300)
      abs(() => {
        if (itvl1) { clearInterval(itvl1); itvl1 = null; }
        setInputText("");
        setInputActive(false);
        setMessages([{ id: "u1", who: "user", text: MSG_1 }]);
      }, 2300);

      // Indicateur de frappe IA
      abs(() => {
        setMessages((m) => [...m, { id: "bt1", who: "bot-typing" }]);
      }, 2700);

      // Réponse IA 1
      abs(() => {
        setMessages((m) => [
          ...m.filter((x) => x.id !== "bt1"),
          { id: "b1", who: "bot", variant: "card1" },
        ]);
      }, 4300);

      // ── Phase 2 : frappe du MSG_2 ──────────────────────────────────────
      abs(() => {
        setInputActive(true);
        let i = 0;
        itvl2 = setInterval(() => {
          if (!alive) return clearInterval(itvl2!);
          i++;
          setInputText(MSG_2.slice(0, i));
          if (i >= MSG_2.length) { clearInterval(itvl2!); itvl2 = null; }
        }, 42);
      }, 6400);

      // Envoi MSG_2 (T ≈ 6400 + 32×42 = 7744ms → on envoie à 7900)
      abs(() => {
        if (itvl2) { clearInterval(itvl2); itvl2 = null; }
        setInputText("");
        setInputActive(false);
        setMessages((m) => [...m, { id: "u2", who: "user", text: MSG_2 }]);
      }, 7900);

      // Indicateur de frappe IA 2
      abs(() => {
        setMessages((m) => [...m, { id: "bt2", who: "bot-typing" }]);
      }, 8300);

      // Réponse IA 2
      abs(() => {
        setMessages((m) => [
          ...m.filter((x) => x.id !== "bt2"),
          { id: "b2", who: "bot", variant: "card2" },
        ]);
      }, 9700);

      // Boucle (reset après 13.5s)
      abs(() => { stop(); run(); }, 13500);
    }

    run();
    return () => { alive = false; stop(); };
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">

      {/* Barre de titre macOS */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/90 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="mx-auto text-xs font-semibold text-slate-500">
          EasyCom AI — Messages
        </span>
        {/* balance visuelle */}
        <span className="h-2.5 w-2.5 opacity-0" />
      </div>

      {/* Zone de conversation */}
      <div className="flex h-[450px] flex-col bg-[#f0f0f5]">

        {/* Liste des messages — scroll interne uniquement */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 pb-3 pt-5">
          {messages.map((msg) => {
            if (msg.who === "user") {
              return (
                <div key={msg.id} className="msg-bubble-in flex justify-end">
                  <div className="max-w-[78%] rounded-2xl rounded-br-[5px] bg-blue-600 px-4 py-2.5 text-sm font-medium leading-5 text-white shadow-sm">
                    {msg.text}
                  </div>
                </div>
              );
            }
            if (msg.who === "bot-typing") {
              return (
                <div key={msg.id} className="msg-bubble-in flex items-end gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[8px] font-black text-white">
                    AI
                  </div>
                  <div className="rounded-2xl rounded-bl-[5px] bg-white shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              );
            }
            // bot card
            return (
              <div key={msg.id} className="msg-bubble-in flex items-end gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[8px] font-black text-white">
                  AI
                </div>
                <div className="max-w-[82%] rounded-2xl rounded-bl-[5px] bg-white p-4 shadow-sm">
                  {msg.variant === "card1" ? <BotCard1 /> : <BotCard2 />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Barre de saisie */}
        <div className="shrink-0 border-t border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <p
              className={`flex-1 min-w-0 truncate text-sm ${
                !inputText && !inputActive
                  ? "text-slate-400"
                  : "font-medium text-slate-800"
              }`}
            >
              {!inputText && !inputActive ? (
                "Écrivez votre demande…"
              ) : (
                <>
                  {inputText}
                  {inputActive && (
                    <span
                      className="ml-px inline-block h-[14px] w-[1.5px] translate-y-[1px] bg-blue-600 align-middle"
                      style={{ animation: "blink 1s step-end infinite" }}
                    />
                  )}
                </>
              )}
            </p>
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                inputText
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-300"
              }`}
            >
              {/* Icône d'envoi */}
              <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 2 11 13M22 2 15 22 11 13 2 9 22 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
