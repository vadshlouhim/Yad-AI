"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import {
  PUBLIC_SERVICES,
  PUBLIC_TOOLS,
  UPCOMING_TOOLS,
  type PublicTool,
} from "@/lib/public-tools";
import { MOBILE_HOME_HEADER_CLASS } from "@/components/presentation/platform-style";
import {
  AgentTile,
  ToolIcon,
  toolSurface,
} from "@/components/presentation/tool-visual";
import { AnimatedToolPreview } from "./animated-tool-preview";
import type { PublicService } from "./tool-preview-dialog";

const PreviewDialog = dynamic(() => import("./tool-preview-dialog"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="fixed inset-x-4 bottom-5 z-[90] mx-auto max-w-sm rounded-2xl bg-[#421388] p-4 text-center text-sm font-bold text-white shadow-xl"
    >
      Ouverture de l’aperçu…
    </div>
  ),
});
function ToolCard({
  tool,
  onOpen,
  featured = false,
}: {
  tool: PublicTool;
  onOpen: (tool: PublicTool, trigger: HTMLElement) => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => onOpen(tool, event.currentTarget)}
      aria-haspopup="dialog"
      className={`group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-[1.8rem] border border-white/25 p-4 text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,.32),inset_0_-1px_0_rgba(0,0,0,.12),0_14px_28px_rgba(30,41,59,.16)] transition-[transform,box-shadow] hover:shadow-xl active:scale-[.975] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/30 ${toolSurface(tool.id, tool.category)} ${featured ? "min-h-48 sm:min-h-52" : "min-h-44"} ${featured && tool.id === "publish" ? "col-span-2 lg:col-span-1" : ""}`}
    >
      <ToolIcon
        id={tool.id}
        className={featured ? "size-10 sm:size-12" : "size-7"}
      />
      <h3
        className={`mt-4 font-black leading-tight tracking-tight ${featured ? "text-xl sm:text-2xl" : "text-base"}`}
      >
        {tool.name}
      </h3>
      <p className="mt-2 text-xs font-medium leading-5 text-white/95">
        {tool.description}
      </p>
      <span className="mt-3 flex items-center gap-1 text-[10px] font-bold text-white/90">
        {tool.agent} · Découvrir
        <ChevronRight className="size-3" />
      </span>
    </button>
  );
}
export function PublicToolDiscovery() {
  const [selected, setSelected] = useState<{
    item: PublicTool | PublicService;
    trigger: HTMLElement;
  } | null>(null);
  function open(item: PublicTool | PublicService, trigger: HTMLElement) {
    setSelected({ item, trigger });
  }
  return (
    <>
      <section
        className={`${MOBILE_HOME_HEADER_CLASS} !px-5 !pt-8 !pb-9 sm:!px-8 lg:!py-12`}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div className="min-w-0">
            <p className="mb-4 flex items-center gap-2 text-xs font-bold text-white/80">
              <Sparkles className="size-4 fill-[#ffba13] text-[#ffba13]" />
              Votre communauté. Vos agents IA.
            </p>
            <h1 className="max-w-2xl text-[clamp(2.3rem,5.2vw,4.4rem)] font-black leading-[1.02] tracking-[-.045em]">
              Toute la communication de votre communauté,
              <span className="text-[#f2c75c]"> au même endroit.</span>
            </h1>
            <p className="mt-5 text-sm font-semibold leading-6 text-white/85 sm:text-base">
              Créez, diffusez et automatisez avec vos agents IA.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="#fonctionnalites"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#421388] shadow-lg shadow-[#170534]/20 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                Découvrir les outils
                <ArrowRight className="size-4" />
              </a>
              <a
                href="/auth/register"
                className="inline-flex min-h-11 items-center rounded-xl px-2 text-xs font-bold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Créer un compte
              </a>
            </div>
            <div
              className="mt-7 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Les agents de votre communication"
            >
              <AgentTile
                name="Dov"
                role="Réseaux sociaux"
                portrait="/agents/dov-ber-transparent.png"
              />
              <AgentTile
                name="Zalman"
                role="Affiches & visuels"
                portrait="/agents/zalman-transparent.png"
              />
              <AgentTile
                name="Tsemah"
                role="Newsletter"
                portrait="/agents/tsemah-transparent.png"
              />
            </div>
          </div>
          <div className="min-w-0">
            <AnimatedToolPreview
              tool={PUBLIC_TOOLS[0]}
              hero
              blocked={selected !== null}
            />
          </div>
        </div>
      </section>
      <section
        id="fonctionnalites"
        className="scroll-mt-24 bg-[#fffaf4] px-5 py-9 sm:px-8 lg:py-12"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="flex items-start gap-2 text-[clamp(1.6rem,3.2vw,2.4rem)] font-black leading-tight tracking-[-.035em]">
            <Sparkles className="mt-1 size-7 shrink-0 fill-[#ffb20b] text-[#ffb20b]" />
            Que souhaitez-vous faire ?
          </h2>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Découvrez les outils librement. Un compte seulement pour les
            utiliser.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3.5 lg:grid-cols-3">
            {PUBLIC_TOOLS.filter((tool) => tool.featured).map((tool) => (
              <ToolCard key={tool.id} tool={tool} onOpen={open} featured />
            ))}
          </div>
          <div className="mt-10 space-y-8">
            {(["Créer", "Diffuser", "Automatiser", "Organiser"] as const).map(
              (category) => (
                <div key={category}>
                  <h3 className="mb-4 text-xl font-black tracking-tight text-[#421388]">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">
                    {PUBLIC_TOOLS.filter(
                      (tool) => tool.category === category && !tool.featured,
                    ).map((tool) => (
                      <ToolCard key={tool.id} tool={tool} onOpen={open} />
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
      <section className="bg-[#fffaf4] px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-6xl border-t border-[#421388]/10 pt-8">
          <h2 className="text-2xl font-black tracking-tight text-[#421388]">
            Pour aller plus loin.
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Services complémentaires
          </p>
          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {PUBLIC_SERVICES.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={(event) => open(service, event.currentTarget)}
                aria-haspopup="dialog"
                className="rounded-[1.8rem] border border-violet-100 bg-white p-5 text-left shadow-[0_10px_25px_rgba(66,19,136,.06)] hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
              >
                <h3 className="text-sm font-black text-[#421388]">
                  {service.name}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {service.description}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700">
                  Découvrir
                  <ChevronRight className="size-3" />
                </span>
              </button>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <h2 className="text-xs font-bold text-slate-600">Prochainement</h2>
            {UPCOMING_TOOLS.map((name) => (
              <span
                key={name}
                className="rounded-full border border-violet-100 bg-white px-3 py-2 text-xs text-slate-600"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>
      {selected && (
        <PreviewDialog
          item={selected.item}
          onClose={() => setSelected(null)}
          trigger={selected.trigger}
        />
      )}
    </>
  );
}
