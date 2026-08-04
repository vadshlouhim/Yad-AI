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
}

export function BoutiqueImageCarousel({ images, label }: BoutiqueImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

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
      className="overflow-hidden rounded-[2rem] border border-orange-100 bg-gradient-to-b from-white to-orange-50/50 p-3 shadow-[0_24px_60px_-38px_rgba(124,45,18,0.35)] sm:p-5"
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
            <div key={image.src} className="relative aspect-[2/3] w-full shrink-0 bg-orange-50/40">
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
              className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-4 focus:ring-orange-200"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label="Afficher l’image suivante"
              className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-4 focus:ring-orange-200"
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
                index === activeIndex ? "w-8 bg-orange-600" : "w-2.5 bg-orange-200 hover:bg-orange-300",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
