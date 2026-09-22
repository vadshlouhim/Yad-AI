"use client";

import { MessageCircle } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const DESIGNER_WHATSAPP_PHONE = "33668508898";

export function CanvaLogo({ className }: { className?: string }) {
  return <Image src="/brand/canva-logo.webp" alt="Canva" width={320} height={103} className={cn("h-5 w-auto object-contain", className)} />;
}

export function buildDesignerWhatsAppUrl(template: { id: string; name: string }) {
  const message = `Bonjour, je souhaite demander à un designer de personnaliser l’affiche « ${template.name} » (référence : ${template.id}). Je comprends qu’il s’agit d’un supplément payant.`;
  return `https://wa.me/${DESIGNER_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

export function DesignerRequestLink({
  template,
  className,
  compact = false,
}: {
  template: { id: string; name: string };
  className?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={buildDesignerWhatsAppUrl(template)}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-center text-xs font-black leading-4 text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200",
        className,
      )}
    >
      <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
      {compact ? "Designer (supplément payant)" : "Demander à un designer (supplément payant)"}
    </a>
  );
}
