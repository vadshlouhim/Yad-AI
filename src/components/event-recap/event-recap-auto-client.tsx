"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImagePlus, Loader2 } from "lucide-react";
import type { EventRecapSettings, RecapHistory } from "@/lib/automation/event-recap";

const DAVID_IMAGE_URL =
  "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/agent-orcetra-shlomi.webp";

interface Community {
  id: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  timezone: string;
  tone: string;
  plan: string;
}

interface FinishedEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  coverImageUrl: string | null;
  status: string;
}

interface RecapAutomation {
  id: string;
  name: string;
  isActive: boolean;
  status: string;
  nextRunAt: string | null;
  triggerConfig: Record<string, unknown> | null;
  updatedAt: string;
}

interface Props {
  community: Community;
  finishedEvents: FinishedEvent[];
  automation: RecapAutomation | null;
  settings: EventRecapSettings;
  history: RecapHistory;
  focusEventId: string | null;
}

type SocialLink = {
  label: string;
  href: string;
  className: string;
  logo: ReactNode;
};

const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "WhatsApp",
    href: "/dashboard/whatsapp",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
    logo: (
      <svg className="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M.057 24l1.687-6.163A11.87 11.87 0 0 1 .16 11.89C.162 5.347 5.5.01 12.113.01c3.2.001 6.21 1.247 8.474 3.513a11.9 11.9 0 0 1 3.5 8.482c-.003 6.612-5.34 11.95-11.953 11.95a11.94 11.94 0 0 1-5.715-1.455L.057 24Zm6.65-3.667a9.93 9.93 0 0 0 5.42 1.6c5.49 0 9.955-4.464 9.958-9.948a9.9 9.9 0 0 0-2.914-7.04 9.88 9.88 0 0 0-7.052-2.915c-5.49 0-9.955 4.463-9.958 9.943a9.9 9.9 0 0 0 1.54 5.31l.24.382-.998 3.647 3.742-.982.36.213Zm11.45-5.58c-.297-.15-1.758-.868-2.03-.967-.273-.1-.47-.15-.67.15-.198.297-.767.966-.94 1.164-.174.198-.347.223-.644.075-.297-.15-1.255-.462-2.39-1.475-.884-.788-1.48-1.76-1.653-2.058-.174-.297-.019-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.372-.025-.52-.074-.15-.669-1.612-.916-2.207-.241-.579-.486-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.478s1.064 2.875 1.213 3.073c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.412.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347Z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "/dashboard/instagram",
    className: "border-pink-200 bg-pink-50 text-pink-700 hover:border-pink-300 hover:bg-pink-100",
    logo: (
      <svg className="size-5 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "/dashboard/facebook",
    className: "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100",
    logo: (
      <svg className="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22.675 0H1.325C.593 0 0 .593 0 1.326v21.348C0 23.407.593 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.894-4.788 4.66-4.788 1.325 0 2.464.099 2.796.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.112C23.407 24 24 23.407 24 22.674V1.326C24 .593 23.407 0 22.675 0Z" />
      </svg>
    ),
  },
];

export function EventRecapAutoClient({ automation, settings }: Props) {
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(automation?.status === "ACTIVE");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(isActive ? "Cette fonction est déjà activée." : "");

  async function setAutomationState(next: boolean) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/event-recap-auto/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next ? { mode: "activate", settings } : { mode: "pause" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError((data as { error?: string }).error ?? "Mise à jour impossible.");
        return;
      }
      setIsActive(next);
      setNotice(next ? "Automatisation activée." : "Automatisation désactivée.");
    } catch {
      setError("Erreur réseau pendant la mise à jour.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-[#421388]/30 bg-[#421388] p-6 text-white shadow-lg shadow-[#421388]/20">
        <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center" aria-hidden="true">
          <div className="rounded-full bg-white/[0.04] p-5">
            <ImagePlus className="size-28 text-white/[0.08]" strokeWidth={1.6} />
          </div>
        </div>
        <div className="relative">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-white/80" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Récap automatique après événement</h1>
        </div>
      </div>

      <main className="relative overflow-hidden rounded-[2.5rem] border border-violet-100 bg-white px-5 py-9 text-center shadow-[0_24px_70px_rgba(66,19,136,0.12)] sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -left-16 top-12 size-40 rounded-full bg-amber-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-8 size-48 rounded-full bg-violet-100/80 blur-3xl" />

        <div className="relative mx-auto flex size-44 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 via-white to-amber-100 p-3 shadow-2xl shadow-violet-200/70 sm:size-56">
          <div className="relative size-full overflow-hidden rounded-full border-4 border-white bg-white">
            <Image src={DAVID_IMAGE_URL} alt="David, assistant IA" fill unoptimized className="object-cover" priority />
          </div>
        </div>

        <p className="relative mx-auto mt-8 max-w-4xl text-2xl font-black leading-tight text-slate-950 sm:text-4xl">
          Je suis David, votre assistant IA. Après chaque événement, je vous rappellerai au bon moment de publier un récap en photos et vidéos sur vos réseaux. Souhaitez-vous activer cette automatisation ?
        </p>

        <div className="relative mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => void setAutomationState(!isActive)}
            disabled={saving}
            aria-pressed={isActive}
            className={`relative flex h-16 w-48 items-center rounded-full px-2 text-sm font-black uppercase text-white shadow-xl transition-all duration-300 disabled:opacity-70 ${
              isActive ? "justify-start bg-emerald-500 shadow-emerald-200" : "justify-end bg-red-500 shadow-red-200"
            }`}
          >
            <span className={`px-5 transition-opacity duration-200 ${saving ? "opacity-0" : "opacity-100"}`}>
              {isActive ? "Activé" : "Désactivé"}
            </span>
            <span
              className={`absolute top-2 flex size-12 items-center justify-center rounded-full bg-white text-xs font-black text-slate-700 shadow-lg transition-transform duration-300 ${
                isActive ? "translate-x-[7.75rem]" : "translate-x-0"
              }`}
            >
              {saving ? <Loader2 className="size-5 animate-spin" /> : isActive ? "ON" : "OFF"}
            </span>
          </button>
          {notice && <p className="max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{notice}</p>}
          {error && <p className="max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{error}</p>}
        </div>

        <h2 className="relative mt-10 text-lg font-black text-slate-950">Publier maintenant</h2>
        <div className="relative mx-auto mt-4 grid max-w-3xl gap-3 sm:grid-cols-3">
          {SOCIAL_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition hover:-translate-y-0.5 ${item.className}`}
            >
              {item.logo}
              {item.label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
