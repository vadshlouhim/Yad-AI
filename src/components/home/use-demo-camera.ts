"use client";
import { useEffect, useState, type RefObject } from "react";

// Pan only inside the fixed presentation viewport; never scroll the public page.
export function useDemoCamera(
  viewport: RefObject<HTMLDivElement | null>,
  content: RefObject<HTMLDivElement | null>,
  scene: string,
  progress: number,
  reducedMotion: boolean,
) {
  const [range, setRange] = useState(0);
  useEffect(() => {
    const frame = viewport.current;
    const screen = content.current;
    if (!frame || !screen) return;
    frame.scrollTo({ top: 0, behavior: "instant" });
    const measure = () =>
      setRange(Math.max(0, screen.scrollHeight - frame.clientHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(screen);
    return () => observer.disconnect();
  }, [viewport, content, scene]);
  const offset = reducedMotion
    ? 0
    : range * Math.max(0, Math.min(1, (progress - 0.4) / 0.6));
  useEffect(() => {
    const frame = viewport.current;
    frame?.scrollTo({ top: offset, behavior: "auto" });
  }, [viewport, scene, offset]);
}
