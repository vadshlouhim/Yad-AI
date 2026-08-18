"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Globe2,
  HandHeart,
  Headphones,
  Mail,
  MessageSquare,
  Plane,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  OfficialDashboardMenuItem,
  OfficialDashboardMenuSection,
} from "./dashboard-nav";

type ToolGroup = {
  key: string;
  title: string;
  icon: LucideIcon;
  tone: string;
  items: OfficialDashboardMenuItem[];
  href?: string;
  wide?: boolean;
};

type MobileMainMenuDialogProps = {
  communityName: string;
  sections: OfficialDashboardMenuSection[];
  onClose: () => void;
};

export function MobileMainMenuDialog({ communityName, sections, onClose }: MobileMainMenuDialogProps) {
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  const menu = useMemo(() => {
    const allItems = sections.flatMap((section) => section.items);
    const section = (key: string) => sections.find((candidate) => candidate.key === key);
    const item = (href: string, label: string, icon: LucideIcon): OfficialDashboardMenuItem => {
      const existing = allItems.find((candidate) => candidate.href === href);
      return existing ? { ...existing, label } : { href, label, icon };
    };

    const tools: ToolGroup[] = [
      {
        key: "shop",
        title: "Boutique en ligne",
        icon: ShoppingBag,
        tone: "from-[#0878ee] via-[#0668e8] to-[#064bd8]",
        items: section("shop_articles")?.items ?? [],
      },
      {
        key: "website",
        title: "Création de site web et référencement IA",
        icon: Globe2,
        tone: "from-[#0faeb3] via-[#08a7ad] to-[#07949f]",
        items: [
          item("/dashboard/website", "Création de site web", Globe2),
          item("/dashboard/referencement", "Référencement Google et IA", Search),
        ],
      },
      {
        key: "compensation",
        title: "Assistance indemnisation",
        icon: Plane,
        tone: "from-[#ff8a00] via-[#f47700] to-[#e96000]",
        href: "/dashboard/assistance-indemnisation-aerienne",
        wide: true,
        items: [],
      },
    ];

    const comingSoon: ToolGroup[] = [
      {
        key: "donation",
        title: "Campagne de dons",
        icon: HandHeart,
        tone: "from-[#1aae68] to-[#078e50]",
        items: section("donation")?.items ?? [],
      },
      {
        key: "newsletter",
        title: "Newsletter IA",
        icon: Mail,
        tone: "from-[#ed3d91] to-[#c72879]",
        items: section("newsletter")?.items ?? [],
      },
    ];

    const account = [
      item("/dashboard/settings", "Paramètres", Settings),
      item("/support-and-suggestions", "Support et suggestions", Headphones),
      item("/dashboard/settings?section=profile", "Profil", User),
    ];

    return { tools, comingSoon, account };
  }, [sections]);

  const activeGroup = [...menu.tools, ...menu.comingSoon].find((group) => group.key === activeGroupKey) ?? null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[1000] bg-[#16052f]/70 backdrop-blur-[4px] md:hidden"
        onClick={onClose}
        aria-label="Fermer les autres outils"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-tools-title"
        className="fixed left-1/2 top-1/2 z-[1001] flex h-[86dvh] max-h-[50rem] w-[calc(100%-1.25rem)] max-w-[27rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-[#fffaf4] uppercase shadow-[0_32px_90px_rgba(15,3,45,0.5)] md:hidden"
      >
        <header className="relative shrink-0 overflow-hidden bg-[radial-gradient(circle_at_75%_0%,#6d2abd_0%,#421388_48%,#260767_100%)] px-5 pb-5 pt-[max(1.15rem,env(safe-area-inset-top))] text-white">
          <span className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {(activeGroup || supportOpen) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveGroupKey(null);
                    setSupportOpen(false);
                  }}
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Retour aux autres outils"
                >
                  <ArrowLeft className="size-5" />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">EasyCom IA</p>
                <h1 id="mobile-tools-title" className="mt-0.5 text-[clamp(1.25rem,6vw,1.65rem)] font-black leading-tight tracking-[-0.035em]">
                  {supportOpen ? "SUPPORT ET SUGGESTIONS" : (activeGroup?.title ?? "AUTRES OUTILS").toUpperCase()}
                </h1>
              </div>
            </div>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Fermer les autres outils"
            >
              <X className="size-5" />
            </button>
          </div>
          {!activeGroup && !supportOpen && <p className="relative mt-1 truncate text-xs font-medium text-white/70">{communityName}</p>}
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
          {supportOpen ? (
            <SupportSuggestionForm />
          ) : activeGroup ? (
            <Submenu group={activeGroup} onClose={onClose} />
          ) : (
            <>

              <div className="grid grid-cols-2 gap-3">
                {menu.tools.map((group) => (
                  <ToolCard key={group.key} group={group} onOpen={() => setActiveGroupKey(group.key)} onClose={onClose} />
                ))}
              </div>

              <SectionTitle>Nouvelles fonctions bientot dispo</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {menu.comingSoon.map((group) => (
                  <ComingSoonCard key={group.key} group={group} onOpen={() => setActiveGroupKey(group.key)} />
                ))}
              </div>

              <SectionTitle>Mon compte</SectionTitle>
              <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_8px_22px_rgba(35,24,70,0.05)]">
                {menu.account.map((entry, index) => {
                  const Icon = entry.icon;
                  const isSupport = entry.href === "/support-and-suggestions";
                  const rowClass = cn(
                    "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-violet-50 active:bg-violet-100",
                    index > 0 && "border-t border-slate-100"
                  );
                  const content = (
                    <>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-[#421388]">
                        {Icon ? <Icon className="size-[18px]" /> : null}
                      </span>
                      <span className="flex-1 text-left uppercase">{entry.label}</span>
                      <ChevronRight className="size-4 text-slate-300" />
                    </>
                  );

                  if (isSupport) {
                    return (
                      <button key={entry.href} type="button" onClick={() => setSupportOpen(true)} className={rowClass}>
                        {content}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      onClick={onClose}
                      className={rowClass}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function SupportSuggestionForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/support-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Impossible d’envoyer votre message.");
        return;
      }
      setMessage("");
      setSent(true);
    } catch {
      setError("Le serveur est injoignable. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-3 text-center normal-case">
        <span className="flex size-20 items-center justify-center rounded-[1.7rem] bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-10" /></span>
        <h2 className="mt-5 text-2xl font-black text-slate-950">Message envoyé</h2>
        <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-600">Votre message a bien été transmis à l’équipe EasyCom IA.</p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 min-h-12 rounded-2xl bg-[#421388] px-6 text-sm font-black text-white shadow-lg">
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="normal-case">
      <div className="rounded-[1.7rem] bg-[#421388] p-5 text-white shadow-[0_18px_38px_-24px_rgba(66,19,136,0.8)]">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#421388]"><MessageSquare className="size-6" /></div>
        <h2 className="mt-4 text-xl font-black">Comment pouvons-nous vous aider ?</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-violet-100">Signalez un problème ou partagez une suggestion pour améliorer EasyCom IA.</p>
      </div>

      <label htmlFor="support-suggestion-message" className="mt-5 block text-sm font-black text-slate-800">Votre message</label>
      <textarea
        id="support-suggestion-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        minLength={10}
        maxLength={5000}
        rows={7}
        required
        placeholder="Expliquez-nous votre besoin, votre problème ou votre idée…"
        className="mt-2 w-full resize-none rounded-[1.4rem] border border-violet-100 bg-white p-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#421388] focus:ring-4 focus:ring-violet-100"
      />
      <div className="mt-2 flex justify-between gap-3 text-[11px] font-bold text-slate-400"><span>10 caractères minimum</span><span>{message.length}/5000</span></div>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting || message.trim().length < 10}
        className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#421388] px-5 text-sm font-black text-white shadow-[0_16px_30px_-18px_rgba(66,19,136,0.8)] transition hover:bg-[#35106f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Envoi en cours…" : "Envoyer le message"}
      </button>
    </form>
  );
}

function ToolCard({ group, onOpen, onClose }: { group: ToolGroup; onOpen: () => void; onClose: () => void }) {
  const Icon = group.icon;
  const className = cn(
    "relative flex min-h-[142px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.55rem] bg-gradient-to-br px-2.5 py-4 text-center text-white shadow-[0_13px_26px_rgba(35,20,80,0.16)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20",
    group.tone,
    group.wide && "col-span-2 min-h-[102px] flex-row px-5"
  );
  const content = (
    <>
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_0%_100%,rgba(255,255,255,0.08),transparent_38%)]" aria-hidden="true" />
      <Icon className="relative size-10 shrink-0 stroke-[2.1]" />
      <span className="relative max-w-full text-[clamp(0.78rem,3.45vw,1rem)] font-black uppercase leading-[1.13] tracking-[-0.02em]">{group.title}</span>
    </>
  );

  return group.href ? (
    <Link href={group.href} onClick={onClose} className={className}>{content}</Link>
  ) : (
    <button type="button" onClick={onOpen} className={className}>{content}</button>
  );
}

function ComingSoonCard({ group, onOpen }: { group: ToolGroup; onOpen: () => void }) {
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative flex min-h-[108px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[1.4rem] bg-gradient-to-br px-3 pb-3 pt-6 text-center text-white shadow-[0_10px_22px_rgba(35,20,80,0.12)] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/15",
        group.tone
      )}
    >
      <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-slate-600">Bientôt</span>
      <Icon className="size-8" />
      <span className="text-sm font-black uppercase leading-tight">{group.title}</span>
    </button>
  );
}

function Submenu({ group, onClose }: { group: ToolGroup; onClose: () => void }) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold uppercase text-slate-500">CHOISISSEZ UNE FONCTION</p>
      <div className="space-y-2.5">
        {group.items.map((entry, index) => {
          const Icon = entry.icon;
          return (
            <Link
              key={`${entry.href}-${entry.label}-${index}`}
              href={entry.href}
              onClick={onClose}
              className="group flex min-h-16 items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-3.5 py-3 text-slate-800 shadow-[0_8px_20px_rgba(35,24,70,0.06)] transition active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#421388]/20"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#421388]/8 text-[#421388]">
                {Icon ? <Icon className="size-5" /> : <Sparkles className="size-5" />}
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-extrabold uppercase leading-tight">{entry.label}</span>
              {entry.badge && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-800">Bientôt</span>}
              <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-7 text-center text-base font-black uppercase tracking-tight text-slate-950">{children}</h2>;
}
