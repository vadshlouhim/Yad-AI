"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { EasyComAgent } from "@/lib/agents";

type AgentShowcaseProps = {
  agents: readonly EasyComAgent[];
};

export function AgentShowcase({ agents }: AgentShowcaseProps) {
  const [selectedAgent, setSelectedAgent] = useState<EasyComAgent | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!selectedAgent) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedAgent(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedAgent]);

  return (
    <>
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-7 lg:gap-y-14">
        {agents.map((agent) => (
          <button
            key={agent.slug}
            type="button"
            onClick={() => setSelectedAgent(agent)}
            className="group text-center outline-none focus-visible:rounded-[2rem] focus-visible:ring-4 focus-visible:ring-cyan-300"
          >
            <div className="relative h-44 overflow-hidden sm:h-60 lg:h-80 xl:h-[24rem]">
              <Image
                src={agent.image}
                alt={`${agent.name}, agent IA ${agent.role} d'EasyCom IA`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                className="object-contain object-bottom drop-shadow-[0_22px_24px_rgba(15,23,42,0.14)] transition duration-500 group-hover:scale-[1.035]"
              />
            </div>
            <div className="px-1 pt-3 text-center">
              <h3 className="text-base font-black leading-tight text-white lg:text-xl">{agent.name}</h3>
              <p className="mt-1 text-[11px] font-bold leading-4 text-cyan-300 lg:text-sm">{agent.role}</p>
              <span className="mx-auto mt-3 inline-flex h-10 items-center justify-center rounded-full border border-cyan-300/50 bg-cyan-300 px-5 text-xs font-black text-[#070b1d] shadow-lg shadow-cyan-950/20 transition group-hover:-translate-y-0.5 group-hover:bg-white group-hover:shadow-cyan-400/20 lg:h-11 lg:px-7 lg:text-sm">
                Découvrez
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedAgent ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAgent(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#0b1230] text-center text-white shadow-[0_30px_90px_rgba(2,6,23,0.55)]"
          >
            <button
              type="button"
              onClick={() => setSelectedAgent(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300"
              aria-label="Fermer les informations de l'agent"
            >
              <X className="size-5" />
            </button>

            <div className="home-ai-grid absolute inset-x-0 top-0 h-44" aria-hidden="true" />

            <div className="relative px-5 pb-7 pt-8 sm:px-8 sm:pb-8">
              <div className="mx-auto h-44 w-full max-w-xs sm:h-56">
                <div className="relative h-full">
                  <Image
                    src={selectedAgent.image}
                    alt={`${selectedAgent.name}, agent IA ${selectedAgent.role}`}
                    fill
                    sizes="(max-width: 640px) 80vw, 320px"
                    className="object-contain object-bottom drop-shadow-[0_24px_28px_rgba(15,23,42,0.16)]"
                  />
                </div>
              </div>

              <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{selectedAgent.role}</p>
              <h3 id={titleId} className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
                {selectedAgent.name}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-base font-bold leading-7 text-slate-200">{selectedAgent.shortDescription}</p>
              <p className="mx-auto mt-4 max-w-xl border-t border-cyan-300/20 pt-4 text-sm leading-7 text-slate-300 sm:text-base">
                {selectedAgent.details}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
