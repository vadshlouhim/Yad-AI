"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, X } from "lucide-react";
import type { EasyComAgent } from "@/lib/agents";

type AgentShowcaseProps = {
  agents: readonly EasyComAgent[];
  initialVisibleCount?: number;
};

export function AgentShowcase({ agents, initialVisibleCount = agents.length }: AgentShowcaseProps) {
  const [selectedAgent, setSelectedAgent] = useState<EasyComAgent | null>(null);
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();
  const gridId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const visibleAgents = expanded ? agents : agents.slice(0, initialVisibleCount);
  const canToggle = agents.length > initialVisibleCount;

  useEffect(() => {
    if (!selectedAgent) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const focusCloseButton = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedAgent(null);
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusCloseButton);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [selectedAgent]);

  return (
    <>
      <div id={gridId} className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {visibleAgents.map((agent) => (
          <button
            key={agent.slug}
            type="button"
            onClick={() => setSelectedAgent(agent)}
            aria-haspopup="dialog"
            className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60"
          >
            <span className="relative block h-44 overflow-hidden sm:h-64 lg:h-72">
              <span
                className="pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[85%] -translate-x-1/2 rounded-full bg-white/10 blur-2xl"
                aria-hidden="true"
              />
              <Image
                src={agent.image}
                alt={`${agent.name}, agent IA ${agent.role} d’EasyCom IA`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                className="object-contain object-bottom drop-shadow-[0_20px_28px_rgba(2,6,23,0.35)] transition duration-500 group-hover:scale-[1.035]"
              />
            </span>
            <span className="block border-t border-white/10 px-4 py-4 text-center sm:px-5 sm:py-5">
              <span className="block text-base font-semibold text-white sm:text-lg">{agent.name}</span>
              <span className="mt-1 block text-xs font-medium text-cyan-300 sm:text-sm">{agent.role}</span>
              <span className="mt-3 inline-flex items-center text-xs font-semibold text-slate-300 transition group-hover:text-white">
                Découvrir sa mission
              </span>
            </span>
          </button>
        ))}
      </div>

      {canToggle ? (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls={gridId}
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] px-5 text-sm font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/50"
          >
            {expanded ? "Réduire la liste" : `Voir tous les agents (${agents.length})`}
            <ChevronDown className={`ml-2 size-4 transition ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {selectedAgent ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedAgent(null);
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative max-h-[calc(100dvh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-cyan-300/20 bg-[#0b1230] text-center text-white shadow-[0_30px_90px_rgba(2,6,23,0.65)]"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setSelectedAgent(null)}
              className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/35 text-slate-200 transition hover:border-cyan-300 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60"
              aria-label="Fermer les informations de l’agent"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            <div className="relative px-5 pb-7 pt-8 sm:px-8 sm:pb-8">
              <div className="mx-auto h-44 w-full max-w-xs sm:h-56">
                <div className="relative h-full">
                  <div className="pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[80%] -translate-x-1/2 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
                  <Image
                    src={selectedAgent.image}
                    alt={`${selectedAgent.name}, agent IA ${selectedAgent.role}`}
                    fill
                    sizes="(max-width: 640px) 80vw, 320px"
                    className="object-contain object-bottom drop-shadow-[0_24px_28px_rgba(2,6,23,0.35)]"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{selectedAgent.role}</p>
              <h3 id={titleId} className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {selectedAgent.name}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-base font-medium leading-7 text-slate-200">{selectedAgent.shortDescription}</p>
              <p className="mx-auto mt-4 max-w-xl border-t border-white/10 pt-4 text-sm leading-7 text-slate-300 sm:text-base">
                {selectedAgent.details}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
