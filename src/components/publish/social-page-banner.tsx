"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AGENT_IMAGE_URLS } from "@/lib/agents";

export const DOV_BER_INSTAGRAM_IMAGE = AGENT_IMAGE_URLS.dovBer;

export const MENDY_FACEBOOK_IMAGE = AGENT_IMAGE_URLS.mendy;

export const ISRAEL_WHATSAPP_IMAGE = AGENT_IMAGE_URLS.israel;

export const DAVID_AGENT_IMAGE =
  "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/agent-orcetra-shlomi.webp";

const DEFAULT_AGENT_TEXT =
  "Je vous évite de surfer sur les réseaux sociaux : je prépare vos publications, et vous les publiez en un clic !";

interface SocialPageBannerProps {
  title: string;
  color: string;
  agentName?: string;
  agentImageUrl?: string;
  statusLabel?: string;
  backHref?: string;
  className?: string;
}

export function SocialPageBanner({
  title,
  color,
  agentName,
  agentImageUrl,
  statusLabel,
  backHref,
  className,
}: SocialPageBannerProps) {
  return (
    <section
      className={cn("relative mx-auto w-full max-w-6xl overflow-visible rounded-[1.4rem] border border-black/10 p-5 text-white shadow-lg sm:p-6", className)}
      style={{ backgroundColor: color, boxShadow: `0 22px 55px ${color}40` }}
    >
      <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
        <div className="rounded-full bg-white/[0.045] p-5">
          <div className="size-28 rounded-full border border-white/[0.04] bg-white/[0.035]" />
        </div>
      </div>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col items-center gap-3 text-center lg:flex-row lg:text-left">
          {backHref && (
            <Link href={backHref} aria-label="Retour">
              <Button size="icon" variant="ghost" className="rounded-2xl text-white hover:bg-white/15 hover:text-white">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
          )}
          <div>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/80 lg:mx-0" />
            <h1 className="text-4xl font-bold tracking-tight text-white">{title}</h1>
            {statusLabel && <Badge className="mt-3 border-white/25 bg-white/15 text-white shadow-sm">{statusLabel}</Badge>}
          </div>
        </div>

        {agentName && agentImageUrl && (
          <div className="relative z-20 flex flex-col items-center gap-4 text-center lg:max-w-2xl lg:flex-row lg:text-left">
            <div className="pointer-events-none relative z-30 shrink-0" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agentImageUrl}
                alt=""
                className="-my-10 h-52 w-auto object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.35)] sm:-my-12 lg:-my-16 lg:h-72"
              />
            </div>
            <div className="relative max-w-md rounded-2xl bg-white px-5 py-4 text-base font-black leading-6 shadow-xl before:absolute before:-top-2 before:left-1/2 before:size-4 before:-translate-x-1/2 before:rotate-45 before:bg-white lg:before:-left-2 lg:before:top-10 lg:before:translate-x-0" style={{ color }}>
              Je suis {agentName}, votre agent intelligent. {DEFAULT_AGENT_TEXT}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
