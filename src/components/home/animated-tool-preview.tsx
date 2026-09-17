"use client";
import { useRef, type ComponentType } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { PUBLIC_TOOLS, type PublicTool } from "@/lib/public-tools";
import { usePreviewPlayback } from "./use-preview-playback";
import { useDemoCamera } from "./use-demo-camera";
import {
  HomeDemoScreen,
  NewsletterDemoScreen,
  PosterDemoScreen,
  PublishDemoScreen,
  SummaryDemoScreen,
  type DemoScreenProps,
} from "./platform-demo-screens";
import "./preview-animation.css";

const HERO_STEPS = [0, 3000, 8000, 13000, 18000] as const;
const TOOL_STEPS = [0, 3000, 7000] as const;
const HERO_LABELS = [
  "Accueil",
  "Affiche",
  "Diffusion",
  "Newsletter",
  "Résultats",
];
const TOOL_LABELS = ["Sélection", "Préparation", "Aperçu"];
export function AnimatedToolPreview({
  tool,
  hero = false,
  blocked = false,
  screen: ToolScreen,
}: {
  tool: PublicTool;
  hero?: boolean;
  blocked?: boolean;
  screen?: ComponentType<DemoScreenProps>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const duration = hero ? 20000 : 10000;
  const steps = hero ? HERO_STEPS : TOOL_STEPS;
  const playback = usePreviewPlayback(blocked, containerRef, duration, steps);
  const stage = playback.stage;
  const localTime = playback.elapsed - steps[stage];
  const stageDuration = (steps[stage + 1] ?? duration) - steps[stage];
  const progress = Math.min(1, localTime / stageDuration);
  const activeTool = hero
    ? PUBLIC_TOOLS.find(
        (item) =>
          item.id ===
          (stage === 1 ? "posters" : stage === 2 ? "publish" : "newsletter"),
      )!
    : tool;
  const phase = hero ? Math.min(2, Math.floor(progress * 3)) : stage;
  const phaseProgress = hero
    ? progress >= 1
      ? 1
      : (progress * 3) % 1
    : progress;
  const Screen =
    ToolScreen ??
    (activeTool.id === "posters"
      ? PosterDemoScreen
      : activeTool.id === "newsletter"
        ? NewsletterDemoScreen
        : PublishDemoScreen);
  const isHome = hero && stage === 0;
  const isSummary = hero && stage === 4;
  const sceneKey = `${activeTool.id}-${stage}-${phase}`;
  const cameraProgress = isSummary ? 1 : isHome ? progress : phaseProgress;
  useDemoCamera(
    viewportRef,
    screenRef,
    sceneKey,
    cameraProgress,
    playback.reducedMotion,
  );
  const labels = hero ? HERO_LABELS : TOOL_LABELS;
  const cursorVisible =
    !isSummary &&
    playback.running &&
    !playback.reducedMotion &&
    (isHome ? progress > 0.65 : phaseProgress > 0.65);
  return (
    <div
      ref={containerRef}
      className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-white/60 bg-[#fffaf4] text-slate-950 shadow-[0_24px_65px_rgba(23,5,52,0.24)]"
      aria-label={
        hero
          ? "Démonstration guidée de la plateforme"
          : `Démonstration de ${tool.name}`
      }
      data-playing={playback.running}
    >
      <div className="border-b border-violet-100 bg-white px-4 py-3">
        <p className="text-[10px] font-bold text-[#421388]">
          Démonstration — données fictives
        </p>
        <p className="mt-1 text-xs font-black">
          {hero ? "Un événement. Toute votre communication." : tool.name}
        </p>
      </div>
      <div
        ref={viewportRef}
        className="demo-viewport relative h-[520px] scroll-smooth overflow-y-auto bg-[#fffaf4] motion-reduce:scroll-auto max-[400px]:h-[470px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onWheel={playback.pause}
        onTouchMove={playback.pause}
        aria-label={`Écran de présentation : ${labels[stage]}`}
      >
        <div key={sceneKey} ref={screenRef} className="demo-screen min-h-full">
          {isHome ? (
            <HomeDemoScreen progress={progress} />
          ) : isSummary ? (
            <SummaryDemoScreen />
          ) : (
            <Screen tool={activeTool} phase={phase} progress={phaseProgress} />
          )}
        </div>
        {cursorVisible && (
          <span
            className="demo-touch pointer-events-none absolute z-10 size-8 rounded-full border-4 border-white/95 bg-[#421388]/25 shadow-[0_0_0_6px_rgba(255,255,255,.3)]"
            style={{
              top: isHome
                ? "81%"
                : phase === 0
                  ? "62%"
                  : phase === 1
                    ? "69%"
                    : "75%",
              left: isHome ? "72%" : "68%",
              transform: `scale(${1 - Math.sin(phaseProgress * Math.PI) * 0.12})`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="border-t border-violet-100 bg-white p-3">
        <div
          className={`mb-3 grid gap-1 ${hero ? "grid-cols-5" : "grid-cols-3"}`}
          aria-label="Étapes de la démonstration"
        >
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => playback.select(index)}
              aria-pressed={stage === index}
              className={`min-h-10 rounded-xl px-1 text-[9px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 ${stage === index ? "bg-[#421388] text-white" : "bg-violet-50 text-violet-800 hover:bg-violet-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={playback.finished ? playback.replay : playback.toggle}
            aria-label={
              playback.finished
                ? "Relire la démonstration"
                : playback.paused
                  ? "Lire la démonstration"
                  : "Mettre la démonstration en pause"
            }
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#421388] hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          >
            {playback.finished ? (
              <RotateCcw className="size-4" />
            ) : playback.paused ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
          </button>
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-violet-100"
            aria-hidden="true"
          >
            <div
              style={{ width: `${(playback.elapsed / duration) * 100}%` }}
              className="h-full bg-[#7b61ff]"
            />
          </div>
          <button
            type="button"
            onClick={playback.replay}
            className="min-h-10 rounded-lg px-2 text-[10px] font-bold text-violet-800 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          >
            Revoir
          </button>
          <span className="text-[10px] tabular-nums text-slate-500">
            {duration / 1000} s
          </span>
        </div>
      </div>
    </div>
  );
}
