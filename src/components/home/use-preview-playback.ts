"use client";
import { useEffect, useState, type RefObject } from "react";

export const PREVIEW_DURATION_MS = 20000;
const DEFAULT_STEPS = [0, 3000, 8000, 13000, 18000] as const;
export function usePreviewPlayback(
  blocked: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  duration = PREVIEW_DURATION_MS,
  steps: readonly number[] = DEFAULT_STEPS,
) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [ready, setReady] = useState(false);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(media.matches);
      setReady(true);
    };
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    if (containerRef.current) observer.observe(containerRef.current);
    const visibility = () =>
      setTabVisible(document.visibilityState === "visible");
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [containerRef]);
  const running =
    ready &&
    playing &&
    visible &&
    tabVisible &&
    !blocked &&
    (!reducedMotion || manual) &&
    elapsed < duration;
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 500);
      last = now;
      setElapsed((value) => Math.min(duration, value + delta));
    }, 150);
    return () => window.clearInterval(timer);
  }, [running, duration]);
  const staticPreview = ready && reducedMotion && !manual;
  return {
    running,
    reducedMotion,
    elapsed: staticPreview ? duration : elapsed,
    stage: staticPreview
      ? steps.length - 1
      : Math.max(
          0,
          steps.findLastIndex((start) => elapsed >= start),
        ),
    finished: elapsed >= duration,
    paused: !playing || staticPreview,
    pause() {
      setPlaying(false);
    },
    toggle() {
      setManual(true);
      setPlaying((value) => (staticPreview ? true : !value));
    },
    replay() {
      setManual(true);
      setElapsed(0);
      setPlaying(true);
    },
    select(stage: number) {
      setManual(true);
      setElapsed(steps[Math.max(0, Math.min(steps.length - 1, stage))]);
      setPlaying(false);
    },
  };
}
