"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BoutiqueCarouselImage {
  src: string;
  alt: string;
}

interface BoutiqueImageCarouselProps {
  images: readonly BoutiqueCarouselImage[];
  label: string;
  tone?: "violet" | "blue" | "coral" | "amber" | "teal" | "rose";
}

const toneStyles = {
  violet: { shell: "border-violet-100 bg-violet-50/50", slide: "bg-violet-50/50", ring: "focus:ring-violet-200", active: "bg-violet-600", idle: "bg-violet-200 hover:bg-violet-300" },
  blue: { shell: "border-blue-100 bg-blue-50/50", slide: "bg-blue-50/50", ring: "focus:ring-blue-200", active: "bg-blue-600", idle: "bg-blue-200 hover:bg-blue-300" },
  coral: { shell: "border-rose-100 bg-rose-50/50", slide: "bg-rose-50/50", ring: "focus:ring-rose-200", active: "bg-rose-500", idle: "bg-rose-200 hover:bg-rose-300" },
  amber: { shell: "border-amber-100 bg-amber-50/50", slide: "bg-amber-50/50", ring: "focus:ring-amber-200", active: "bg-amber-500", idle: "bg-amber-200 hover:bg-amber-300" },
  teal: { shell: "border-teal-100 bg-teal-50/50", slide: "bg-teal-50/50", ring: "focus:ring-teal-200", active: "bg-teal-600", idle: "bg-teal-200 hover:bg-teal-300" },
  rose: { shell: "border-pink-100 bg-pink-50/50", slide: "bg-pink-50/50", ring: "focus:ring-pink-200", active: "bg-pink-600", idle: "bg-pink-200 hover:bg-pink-300" },
} as const;

export function BoutiqueImageCarousel({ images, label, tone = "violet" }: BoutiqueImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const palette = toneStyles[tone];

  useEffect(() => {
    if (paused || images.length < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [images.length, paused]);

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % images.length);
  }

  return (
    <section
      aria-label={label}
      className={cn("overflow-hidden rounded-[2rem] border p-3 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.32)] sm:p-5", palette.shell)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-[1.5rem] bg-white">
        <div
          className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <div key={image.src} className={cn("relative aspect-[2/3] w-full shrink-0", palette.slide)}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 92vw, 640px"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Afficher l’image précédente"
              className={cn("absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-4", palette.ring)}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Afficher l’image suivante"
              className={cn("absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-4", palette.ring)}
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2" aria-label="Choisir une image">
          {images.map((image, index) => (
            <button
              key={`${image.src}-indicator`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Afficher l’image ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                index === activeIndex ? cn("w-8", palette.active) : cn("w-2.5", palette.idle),
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
