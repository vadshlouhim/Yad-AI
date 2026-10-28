"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { LogoZone } from "@/lib/templates/logo-zone";

/**
 * Draw, on the template image, the rectangle where the community logo replaces the template's own
 * logo. Coordinates are kept as fractions of the image so they work at any output size.
 */
export function LogoZoneEditor({ imageUrl, zone, onChange, dark }: { imageUrl: string | null; zone: LogoZone | null; onChange: (zone: LogoZone | null) => void; dark?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<LogoZone | null>(null);
  const shown = draft ?? zone;

  function point(event: ReactPointerEvent) {
    const rect = frame.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function between(a: { x: number; y: number }, b: { x: number; y: number }): LogoZone {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
  }

  if (!imageUrl) return <p className="text-xs opacity-70">Ajoutez d’abord l’image du modèle.</p>;

  return (
    <div>
      <p className={`text-sm font-black ${dark ? "text-white" : "text-slate-950"}`}>Zone du logo</p>
      <p className={`mt-1 text-xs ${dark ? "text-white/60" : "text-slate-500"}`}>Tracez un rectangle sur le logo du modèle : l’IA l’efface et le logo de la communauté est posé à cet endroit. Sans zone, le logo va en haut à droite.</p>
      <div
        ref={frame}
        className="relative mt-3 w-full max-w-xs cursor-crosshair touch-none select-none overflow-hidden rounded-2xl border border-slate-200"
        onPointerDown={(event) => { start.current = point(event); setDraft(null); event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (start.current) setDraft(between(start.current, point(event))); }}
        onPointerUp={(event) => {
          if (!start.current) return;
          const next = between(start.current, point(event));
          start.current = null;
          setDraft(null);
          if (next.width >= 0.02 && next.height >= 0.02) onChange(next);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" draggable={false} className="block w-full" />
        {shown ? <span className="pointer-events-none absolute border-2 border-dashed border-pink-500 bg-pink-500/15" style={{ left: `${shown.x * 100}%`, top: `${shown.y * 100}%`, width: `${shown.width * 100}%`, height: `${shown.height * 100}%` }} /> : null}
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs font-bold">
        <span className={dark ? "text-white/70" : "text-slate-600"}>{zone ? "Zone définie" : "Aucune zone (haut à droite)"}</span>
        {zone ? <button type="button" onClick={() => onChange(null)} className="text-rose-600 hover:underline">Effacer la zone</button> : null}
      </div>
    </div>
  );
}
