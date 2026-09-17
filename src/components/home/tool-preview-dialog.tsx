"use client";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { PUBLIC_SERVICES, type PublicTool } from "@/lib/public-tools";
import { AnimatedToolPreview } from "./animated-tool-preview";
import { ToolDemoScreen } from "./tool-demo-screens";

export type PublicService = (typeof PUBLIC_SERVICES)[number];
export default function ToolPreviewDialog({
  item,
  onClose,
  trigger,
}: {
  item: PublicTool | PublicService;
  onClose: () => void;
  trigger: HTMLElement | null;
}) {
  const isTool = "scenes" in item;
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#170534]/60 backdrop-blur-sm" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-[90] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[2rem] border border-white/60 bg-[#fffaf4] p-5 text-slate-950 shadow-[0_28px_80px_rgba(23,5,52,.38)] focus:outline-none sm:p-7"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-black tracking-tight text-[#421388]">
                {item.name}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
                {item.description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Fermer l'aperçu"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-900 hover:bg-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          {isTool ? (
            <AnimatedToolPreview
              tool={item}
              screen={item.featured ? undefined : ToolDemoScreen}
            />
          ) : (
            <div className="rounded-[1.8rem] border border-violet-100 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-700">
                Service complémentaire
              </p>
              <p className="mt-3 text-lg leading-7">{item.description}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Retrouvez les modalités et les contacts de ce service dans votre
                espace. Il ne s’agit pas d’une génération automatique par IA.
              </p>
            </div>
          )}
          {isTool && (
            <ul className="mt-5 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
              {item.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-violet-700" />
                  {benefit}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-col items-center gap-3 border-t border-violet-100 pt-5 sm:flex-row sm:justify-between">
            <p className="text-xs text-slate-600">
              Découverte libre. Compte requis pour utiliser les outils.
            </p>
            <Link
              href={`/auth/register?callbackUrl=${encodeURIComponent(item.destination)}`}
              prefetch={false}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#421388] px-6 text-sm font-black text-white hover:bg-[#5722b1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 sm:w-auto"
            >
              {isTool ? "Utiliser cet outil" : "Découvrir ce service"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <p className="mt-3 text-center text-xs text-slate-600 sm:text-right">
            Déjà un compte ?{" "}
            <Link
              href={`/auth/login?callbackUrl=${encodeURIComponent(item.destination)}`}
              prefetch={false}
              className="font-bold text-violet-700 underline underline-offset-4"
            >
              Se connecter
            </Link>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
