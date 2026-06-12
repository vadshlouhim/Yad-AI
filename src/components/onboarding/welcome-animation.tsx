"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  onComplete: () => void;
}

/**
 * Phase timeline
 * 0 → overlay fades in
 * 1 → "3"
 * 2 → "2"
 * 3 → "1"
 * 4 → white flash
 * 5 → "Bienvenue sur / Yad.ia"
 * 6 → logo + sparkle badge
 * 7 → exit fade-out
 * 8 → done (calls onComplete)
 */
const COUNTS: Record<number, string> = { 1: "3", 2: "2", 3: "1" };

export function WelcomeAnimation({ onComplete }: Props) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    at(() => setPhase(1), 120);    // "3"
    at(() => setPhase(2), 1020);   // "2"
    at(() => setPhase(3), 1920);   // "1"
    at(() => setPhase(4), 2820);   // flash
    at(() => setPhase(5), 3080);   // bienvenue text
    at(() => setPhase(6), 3780);   // logo
    at(() => setPhase(7), 5700);   // exit
    at(() => { setPhase(8); onComplete(); }, 6500);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const showCount   = phase >= 1 && phase <= 3;
  const showFlash   = phase === 4;
  const showWelcome = phase >= 5 && phase <= 7;
  const showLogo    = phase >= 6 && phase <= 7;
  const isExiting   = phase === 7;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden select-none"
      style={{
        background: "#010d1f",
        animation: isExiting
          ? "wOut 0.8s ease-in-out forwards"
          : "wIn 0.45s ease-out forwards",
      }}
    >
      {/* Ambient radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 58% 42% at 50% 50%, rgba(37,99,235,0.22) 0%, transparent 72%)",
          animation: "wGlow 2.8s ease-in-out infinite",
        }}
      />

      {/* ── Countdown ── */}
      {showCount && (
        <div
          key={COUNTS[phase]}
          className="absolute text-white font-black leading-none pointer-events-none"
          style={{
            fontSize: "clamp(100px, 20vw, 160px)",
            animation: "wCount 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
            textShadow: "0 0 80px rgba(96,165,250,0.55)",
          }}
        >
          {COUNTS[phase]}
        </div>
      )}

      {/* ── White flash ── */}
      {showFlash && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ animation: "wFlash 0.28s ease-out forwards" }}
        />
      )}

      {/* ── Welcome content ── */}
      {showWelcome && (
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-8">

          {/* "Bienvenue sur" */}
          <p
            className="text-blue-400 font-semibold uppercase"
            style={{
              fontSize: "clamp(11px, 2vw, 15px)",
              letterSpacing: "0.24em",
              animation: "wSlide 0.65s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            Bienvenue sur
          </p>

          {/* "Yad.ia" */}
          <h1
            className="text-white font-black tracking-tight"
            style={{
              fontSize: "clamp(44px, 9vw, 76px)",
              lineHeight: 1,
              textShadow: "0 0 60px rgba(96,165,250,0.4)",
              animation: "wSlide 0.65s 0.1s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            Yad.ia
          </h1>

          {/* ── Logo + sparkle badge ── */}
          {showLogo && (
            <div
              className="mt-8 flex flex-col items-center gap-5"
              style={{ animation: "wLogo 0.72s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
            >
              {/* Logo with glow ring */}
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-3xl"
                  style={{ animation: "wRing 2s ease-in-out infinite" }}
                />
                <img
                  src="/easycom-ai-logo.png"
                  alt="Yad.ia"
                  className="relative h-20 w-20 rounded-2xl object-cover shadow-2xl"
                />
              </div>

              {/* Badge "Votre espace est prêt" */}
              <div
                className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/60 px-5 py-2.5 text-blue-300 text-sm font-medium backdrop-blur-sm"
                style={{
                  animation: "wSlide 0.5s 0.28s cubic-bezier(0.22, 1, 0.36, 1) both",
                }}
              >
                <Sparkles
                  className="size-3.5"
                  style={{ animation: "wGlow 1.5s 0.4s ease-in-out infinite" }}
                />
                <span>Votre espace est prêt</span>
                <Sparkles
                  className="size-3.5"
                  style={{ animation: "wGlow 1.5s 0.6s ease-in-out infinite" }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
