"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Calendar,
  FileText,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  HandHeart,
  ImageIcon,
  LayoutGrid,
  MessageCircle,
  Pencil,
  Play,
  SendHorizonal,
  Share2,
  Sparkles,
  Target,
  Video,
  Zap,
} from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { AGENT_IMAGE_URLS } from "@/lib/agents";
import type {
  DonationCampaign,
  CampaignStep,
  ConversationMessage,
  DonationCampaignBrief,
} from "@/lib/donation-campaign";
import {
  WhatsAppIcon,
  InstagramIcon,
  FacebookIcon,
  EmailIcon,
} from "@/components/layout/dashboard-nav";
import {
  STEP_STATUS_LABELS,
  STEP_STATUS_COLORS,
  STEP_TYPE_LABELS,
} from "@/lib/donation-campaign";

type View = "overview" | "assistant" | "plan" | "success" | "manual";

interface Props {
  community: {
    id: string;
    name: string;
    logoUrl: string | null;
    plan: string | null;
    tone: string | null;
    city: string | null;
  };
  initialCampaign: DonationCampaign | null;
  initialSteps: CampaignStep[];
}

const STEP_CARDS = [
  {
    num: 1,
    icon: CalendarDays,
    title: "Dates de campagne",
    desc: "Définissez le début et la fin de votre campagne.",
    color: "from-rose-50 to-pink-50 border-rose-100",
    iconColor: "bg-rose-100 text-[#8A184D]",
  },
  {
    num: 2,
    icon: Bot,
    title: "Plan IA",
    desc: "L'Assistant IA construit les étapes clés de votre campagne.",
    color: "from-blue-50 to-indigo-50 border-blue-100",
    iconColor: "bg-blue-100 text-blue-700",
  },
  {
    num: 3,
    icon: ImageIcon,
    title: "Visuels de campagne",
    desc: "Créez les bons supports pour chaque moment important.",
    color: "from-emerald-50 to-teal-50 border-emerald-100",
    iconColor: "bg-emerald-100 text-emerald-700",
  },
  {
    num: 4,
    icon: LayoutGrid,
    title: "Campagne centralisée",
    desc: "Préparez, validez et publiez tous vos contenus depuis la même plateforme.",
    color: "from-amber-50 to-orange-50 border-amber-100",
    iconColor: "bg-amber-100 text-amber-700",
  },
];

function extractPreviewFromMessages(
  msgs: ConversationMessage[],
  briefData: Partial<DonationCampaignBrief>
) {
  const result = {
    dates: undefined as string | undefined,
    objective: undefined as string | undefined,
    slogan: undefined as string | undefined,
    channels: undefined as string[] | undefined,
    publication_mode: undefined as "after_validation" | "automatic" | undefined,
  };
  for (const msg of msgs) {
    if (msg.role !== "user") continue;
    const text = msg.content;
    const lower = text.toLowerCase();
    if (
      /\b(jan|fév|mar|avr|mai|juin|juil|ao[uû]t|sep|oct|nov|déc)/i.test(text) ||
      /\b\d{4}-\d{2}-\d{2}\b/.test(text) ||
      /\bdu\s+\d{1,2}\b/i.test(text)
    ) {
      result.dates = text.length > 44 ? `${text.slice(0, 41)}…` : text;
    }
    const euros = text.match(/\d[\d\s]*\s*€/);
    if (euros) result.objective = euros[0].trim();
    const sloganSel = text.match(/["«»""](.+?)["«»""]/);
    if (/slogan|retiens|choisis/i.test(text) && sloganSel) {
      result.slogan = sloganSel[1];
    }
    const chs: string[] = [];
    if (/whatsapp/i.test(text)) chs.push("WhatsApp");
    if (/instagram/i.test(text)) chs.push("Instagram");
    if (/facebook/i.test(text)) chs.push("Facebook");
    if (/\bemail\b/i.test(text)) chs.push("Email");
    if (/\bsms\b/i.test(text)) chs.push("SMS");
    if (chs.length > 0) result.channels = chs;
    if (/après\s+validat|validation/i.test(lower)) result.publication_mode = "after_validation";
    if (/automati(que|c)/i.test(lower)) result.publication_mode = "automatic";
  }
  if (briefData.slogan) result.slogan = briefData.slogan;
  if (briefData.channels?.length) result.channels = briefData.channels as string[];
  if (briefData.publication_mode) result.publication_mode = briefData.publication_mode;
  return result;
}

function ChannelIcon({ channel, className = "size-4" }: { channel: string; className?: string }) {
  if (channel === "WhatsApp") return <WhatsAppIcon className={className} />;
  if (channel === "Instagram") return <InstagramIcon className={className} />;
  if (channel === "Facebook") return <FacebookIcon className={className} />;
  if (channel === "Email") return <EmailIcon className={className} />;
  if (channel === "SMS") return <span className="text-base leading-none">📱</span>;
  return null;
}

function renderAssistantContent(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Ligne vide → espace vertical entre blocs
    if (!line.trim()) {
      i++;
      continue;
    }

    // Titre ## ou ###
    if (/^#{2,3}\s/.test(line)) {
      const content = line.replace(/^#{2,3}\s/, "");
      nodes.push(
        <p key={i} className="mt-3 mb-1 text-[13px] font-black uppercase tracking-wide text-orange-700">
          {content}
        </p>
      );
      i++;
      continue;
    }

    // Liste numérotée — regroupe les items consécutifs
    if (/^\d+\.\s/.test(line)) {
      const items: { num: string; content: string }[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const match = lines[i].match(/^(\d+)\.\s(.*)$/);
        if (match) items.push({ num: match[1], content: match[2] });
        i++;
      }
      nodes.push(
        <div key={`ol-${i}`} className="mt-2 mb-1 space-y-2">
          {items.map(({ num, content }) => (
            <div key={num} className="flex items-start gap-2.5">
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-700">
                {num}
              </span>
              <span className="leading-5 text-slate-800" dangerouslySetInnerHTML={{ __html: inlineFormat(content) }} />
            </div>
          ))}
        </div>
      );
      continue;
    }

    // Liste à puces — regroupe les items consécutifs
    if (/^[-•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-•]\s/, ""));
        i++;
      }
      nodes.push(
        <div key={`ul-${i}`} className="mt-2 mb-1 space-y-1.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
              <span className="leading-5 text-slate-800" dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </div>
          ))}
        </div>
      );
      continue;
    }

    // Paragraphe normal
    nodes.push(
      <p key={i} className="leading-6 text-slate-800" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    );
    i++;
  }

  return <div className="space-y-1">{nodes}</div>;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function MessageBubble({ msg }: { msg: ConversationMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100">
          <Sparkles className="size-3.5 text-orange-600" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "rounded-br-sm bg-orange-500 text-white leading-6"
            : "rounded-bl-sm bg-white shadow-sm ring-1 ring-slate-100"
        }`}
      >
        {isUser ? msg.content : renderAssistantContent(msg.content)}
      </div>
    </div>
  );
}

function SloganChips({ slogans, onSelect }: { slogans: string[]; onSelect: (s: string) => void }) {
  if (!slogans.length) return null;
  return (
    <div className="flex flex-col gap-2 pl-9">
      <p className="text-xs font-semibold text-slate-400">Choisissez un slogan ou continuez :</p>
      {slogans.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-left text-sm font-semibold text-orange-700 hover:bg-orange-100"
        >
          ✨ {s}
        </button>
      ))}
    </div>
  );
}

export function DonationCampaignClient({ community, initialCampaign, initialSteps }: Props) {
  const [view, setView] = useState<View>(initialCampaign ? "plan" : "overview");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [campaign, setCampaign] = useState<DonationCampaign | null>(initialCampaign);
  const [steps, setSteps] = useState<CampaignStep[]>(initialSteps);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [slogans, setSlogans] = useState<string[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [quickRepliesMulti, setQuickRepliesMulti] = useState<string[]>([]);
  const [selectedMulti, setSelectedMulti] = useState<string[]>([]);
  const [briefAccum, setBriefAccum] = useState<Partial<DonationCampaignBrief>>({});
  const [manualForm, setManualForm] = useState({
    start_date: "",
    end_date: "",
    title: "",
    cause: "",
    slogan: "",
    objective_amount: "",
    donation_url: "",
    channels: ["WhatsApp"] as string[],
    publication_mode: "after_validation" as "after_validation" | "automatic",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ConversationMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setSlogans([]);
    setQuickReplies([]);
    setQuickRepliesMulti([]);
    setSelectedMulti([]);

    try {
      const res = await fetch("/api/donation-campaign/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "continue-assistant", messages: newMessages }),
      });
      const data = await res.json();
      const assistantMsg: ConversationMessage = { role: "assistant", content: data.message ?? "" };
      setMessages((m) => [...m, assistantMsg]);
      if (data.planReady) setPlanReady(true);
      if (data.slogans?.length) setSlogans(data.slogans);
      if (data.quickReplies?.length) setQuickReplies(data.quickReplies);
      if (data.quickRepliesMulti?.length) setQuickRepliesMulti(data.quickRepliesMulti);
    } finally {
      setLoading(false);
    }
  };

  const handleFirstQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setView("assistant");
    // Add the AI's initial question as the first message
    const welcomeMsg: ConversationMessage = {
      role: "assistant",
      content: "Quand est prévue votre campagne de dons ?",
    };
    setMessages([welcomeMsg]);
    await sendMessage(input);
  };

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/donation-campaign/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-plan",
          messages,
          brief: briefAccum,
          slogans,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error("[generate-plan] Erreur Supabase:", data.error, "code:", data.code, "details:", data.details);
      }
      if (data.campaign) {
        setCampaign(data.campaign);
        setSteps(data.steps ?? []);
        setView("plan");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleStepAction = async (stepId: string, action: "ready" | "scheduled") => {
    await fetch("/api/donation-campaign/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-step-status", stepId, status: action }),
    });
    setSteps((s) => s.map((st) => (st.id === stepId ? { ...st, status: action } : st)));
  };

  const handleModifyPlan = () => {
    const modifyMsg: ConversationMessage = {
      role: "assistant",
      content: "Que souhaitez-vous modifier dans le plan ? Vous pouvez me demander d'ajouter, déplacer ou supprimer des étapes.",
    };
    setMessages((m) => [...m, modifyMsg]);
    setPlanReady(false);
    setView("assistant");
  };

  const campaignPreview = useMemo(
    () => extractPreviewFromMessages(messages, briefAccum),
    [messages, briefAccum]
  );
  const userMsgCount = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);
  const progressSteps = useMemo(
    () => [
      { label: "Dates", done: userMsgCount >= 1 || !!campaignPreview.dates },
      { label: "Campagne", done: userMsgCount >= 2 || !!campaignPreview.objective },
      { label: "Slogan", done: slogans.length > 0 || !!campaignPreview.slogan || userMsgCount >= 4 },
      { label: "Canaux", done: !!campaignPreview.channels || userMsgCount >= 6 },
      { label: "Mode de publication", done: !!campaignPreview.publication_mode || planReady },
    ],
    [userMsgCount, campaignPreview, slogans, planReady]
  );

  // ── Overview ─────────────────────────────────────────────────────────
  if (view === "overview") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
        <AgentPageBanner
          eyebrow="Campagne de dons"
          title="Centre de pilotage complet de campagne de dons"
          description="Construisez, pilotez et diffusez toute votre campagne de dons depuis un seul espace intelligent, clair et prêt à accompagner chaque étape."
          icon={HandHeart}
          imageUrl={AGENT_IMAGE_URLS.avi}
          imageAlt="Avi, agent IA campagne de dons"
          bubbleTitle="Je suis Avi, l’agent IA responsable de votre campagne de dons"
          bubbleTitleClassName="text-slate-950"
          bubbleText="Je vous aide à structurer, préparer et diffuser chaque étape de votre campagne."
          tone="rose"
          flat
        />

        {/* Hero */}
        <section className="hidden overflow-hidden rounded-[2rem] border border-orange-900/30 bg-[linear-gradient(135deg,#431407,#7C2D12,#EA580C)] p-[1px] shadow-[0_24px_60px_rgba(234,88,12,0.22)]">
          <div className="relative rounded-[calc(2rem-1px)] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.09),transparent_30%),linear-gradient(135deg,rgba(67,20,7,0.97),rgba(124,45,18,0.95),rgba(234,88,12,0.92))] px-6 py-10 text-white sm:px-10">
            <div className="absolute right-6 top-5 font-serif text-2xl font-bold text-white/50">ב&quot;ה</div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
              <HandHeart className="size-3.5" /> Campagne de dons
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">
              Centre de pilotage complet de campagne de dons
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-orange-100/90">
              Construisez, pilotez et diffusez toute votre campagne de dons depuis un seul espace intelligent.
            </p>
          </div>
        </section>

        {/* 4 étapes */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {STEP_CARDS.map((card) => (
            <div key={card.num} className="animate-fade-in flex min-w-0 flex-col gap-3 rounded-2xl border border-rose-100 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(138,24,77,0.14)] sm:rounded-3xl sm:p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-[#8A184D]">
                  <card.icon className="size-4.5" />
                </div>
                <span className="text-xs font-black text-slate-400">0{card.num}</span>
              </div>
              <h3 className="text-sm font-black text-slate-900">{card.title}</h3>
              <p className="text-xs leading-5 text-slate-500">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Choix du mode */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Mode IA */}
          <div className="flex flex-col rounded-3xl border border-rose-100 bg-white px-6 py-7 shadow-[0_16px_42px_rgba(138,24,77,0.10)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100">
              <Sparkles className="size-5 animate-pulse text-[#8A184D]" />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">Avec l&apos;Assistant IA</h2>
            <p className="mt-1 text-sm text-slate-500">Répondez à quelques questions et l&apos;IA construit votre plan de campagne.</p>
            <form onSubmit={handleFirstQuestion} className="mt-5 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex : du 15 au 30 mars 2025"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-[#8A184D] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#70123f]"
              >
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>

          {/* Mode manuel */}
          <div className="flex flex-col rounded-3xl border border-rose-100 bg-white px-6 py-7 shadow-[0_16px_42px_rgba(138,24,77,0.10)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-100">
              <FileText className="size-5 text-fuchsia-700" />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">Mode manuel</h2>
            <p className="mt-1 text-sm text-slate-500">Remplissez le formulaire vous-même et générez le plan en un clic.</p>
            <button
              type="button"
              onClick={() => setView("manual")}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-[#8A184D] hover:border-rose-300 hover:bg-rose-100"
            >
              Remplir le formulaire
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Manuel ───────────────────────────────────────────────────────────
  if (view === "manual") {
    const ALL_CHANNELS = ["WhatsApp", "Instagram", "Facebook", "Email", "SMS"];
    const toggleChannel = (ch: string) =>
      setManualForm((f) => ({
        ...f,
        channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
      }));

    const handleManualSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setGenerating(true);
      try {
        const brief: Partial<DonationCampaignBrief> = {
          start_date: manualForm.start_date || undefined,
          end_date: manualForm.end_date || undefined,
          title: manualForm.title || undefined,
          cause: manualForm.cause || undefined,
          slogan: manualForm.slogan || undefined,
          objective_amount: manualForm.objective_amount ? Number(manualForm.objective_amount) : undefined,
          donation_url: manualForm.donation_url || undefined,
          channels: manualForm.channels as DonationCampaignBrief["channels"],
          publication_mode: manualForm.publication_mode,
          organization_name: community.name,
        };
        const res = await fetch("/api/donation-campaign/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate-plan", messages: [], brief }),
        });
        const data = await res.json();
        if (data.error) {
          console.error("[generate-plan/manual] Erreur Supabase:", data.error, "code:", data.code, "details:", data.details);
        }
        if (data.campaign) {
          setCampaign(data.campaign);
          setSteps(data.steps ?? []);
          setView("plan");
        }
      } finally {
        setGenerating(false);
      }
    };

    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView("overview")}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← Retour
          </button>
          <h1 className="text-xl font-black text-slate-900">Formulaire de campagne</h1>
        </div>
        <form onSubmit={handleManualSubmit} className="space-y-5">
          {/* Dates */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-black text-slate-900">Dates de campagne</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Date de début *</label>
                <input
                  type="date"
                  required
                  value={manualForm.start_date}
                  onChange={(e) => setManualForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Date de fin *</label>
                <input
                  type="date"
                  required
                  value={manualForm.end_date}
                  onChange={(e) => setManualForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
          </div>

          {/* Infos campagne */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-black text-slate-900">Informations de la campagne</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Nom de la campagne *</label>
                <input
                  type="text"
                  required
                  value={manualForm.title}
                  onChange={(e) => setManualForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex : Campagne Roch Hachana 2025"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Cause / Objectif</label>
                <textarea
                  rows={2}
                  value={manualForm.cause}
                  onChange={(e) => setManualForm((f) => ({ ...f, cause: e.target.value }))}
                  placeholder="Ex : Financer les activités de notre communauté pour l'année à venir"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Slogan</label>
                <input
                  type="text"
                  value={manualForm.slogan}
                  onChange={(e) => setManualForm((f) => ({ ...f, slogan: e.target.value }))}
                  placeholder="Ex : Ensemble, pour une communauté plus forte"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Objectif de collecte (€)</label>
                  <input
                    type="number"
                    min="0"
                    value={manualForm.objective_amount}
                    onChange={(e) => setManualForm((f) => ({ ...f, objective_amount: e.target.value }))}
                    placeholder="Ex : 10000"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Lien de don</label>
                  <input
                    type="url"
                    value={manualForm.donation_url}
                    onChange={(e) => setManualForm((f) => ({ ...f, donation_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Canaux */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-black text-slate-900">Canaux de diffusion</p>
            <div className="flex flex-wrap gap-2">
              {ALL_CHANNELS.map((ch) => {
                const active = manualForm.channels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      active
                        ? "bg-orange-500 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600"
                    }`}
                  >
                    <ChannelIcon channel={ch} /> {ch}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode publication */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-black text-slate-900">Mode de publication</p>
            <div className="grid grid-cols-2 gap-3">
              {([["after_validation", "Après validation", "Je valide avant chaque publication."],
                ["automatic", "Automatique", "Publié automatiquement selon le plan."]] as const).map(([val, label, desc]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setManualForm((f) => ({ ...f, publication_mode: val }))}
                  className={`rounded-xl border p-3 text-left transition ${
                    manualForm.publication_mode === val
                      ? "border-orange-400 bg-orange-50 ring-1 ring-orange-200"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-900">{label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-sm font-bold text-white shadow-md hover:bg-orange-600 disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            {generating ? "Génération du plan…" : "Générer mon plan de campagne"}
          </button>
        </form>
      </div>
    );
  }

  // ── Assistant ─────────────────────────────────────────────────────────
  if (view === "assistant") {
    const doneCount = progressSteps.filter((s) => s.done).length;
    const SIDEBAR_FIELDS = [
      { icon: CalendarDays, label: "Dates", value: campaignPreview.dates, channels: undefined as string[] | undefined },
      { icon: Target, label: "Objectif", value: campaignPreview.objective, channels: undefined as string[] | undefined },
      { icon: Sparkles, label: "Slogan", value: campaignPreview.slogan, channels: undefined as string[] | undefined },
      { icon: Share2, label: "Canaux", value: undefined as string | undefined, channels: campaignPreview.channels },
      {
        icon: Zap,
        label: "Mode de publication",
        value:
          campaignPreview.publication_mode === "automatic"
            ? "Automatique"
            : campaignPreview.publication_mode
            ? "Après validation"
            : undefined,
        channels: undefined as string[] | undefined,
      },
    ];

    return (
      <div className="mx-auto flex h-[calc(100vh-80px)] w-full max-w-5xl gap-4 px-4 sm:px-6">
        {/* LEFT: Chat */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mini header */}
          <div className="flex shrink-0 items-center gap-3 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
              <HandHeart className="size-4 text-orange-700" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900">Campagne de dons</h1>
              <p className="text-xs text-slate-500">Assistant IA en cours…</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <div className="size-1.5 animate-pulse rounded-full bg-orange-500" />
              En cours
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {slogans.length > 0 && (
                <SloganChips
                  slogans={slogans}
                  onSelect={(s) => {
                    setBriefAccum((b) => ({ ...b, slogan: s }));
                    sendMessage(`Je choisis ce slogan : "${s}"`);
                  }}
                />
              )}
              {quickReplies.length > 0 && !loading && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => sendMessage(reply)}
                      className="rounded-full border border-orange-200 bg-white px-4 py-1.5 text-sm font-medium text-orange-700 shadow-sm transition hover:border-orange-400 hover:bg-orange-50 active:scale-[0.97]"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
              {quickRepliesMulti.length > 0 && !loading && (
                <div className="pl-9">
                  <p className="mb-2 text-xs font-semibold text-slate-400">Sélectionnez un ou plusieurs :</p>
                  <div className="flex flex-wrap gap-2">
                    {quickRepliesMulti.map((reply) => {
                      const selected = selectedMulti.includes(reply);
                      return (
                        <button
                          key={reply}
                          type="button"
                          onClick={() =>
                            setSelectedMulti((prev) =>
                              selected ? prev.filter((r) => r !== reply) : [...prev, reply]
                            )
                          }
                          className={`rounded-full px-4 py-1.5 text-sm font-medium shadow-sm transition active:scale-[0.97] ${
                            selected
                              ? "border border-orange-400 bg-orange-500 text-white"
                              : "border border-orange-200 bg-white text-orange-700 hover:border-orange-400 hover:bg-orange-50"
                          }`}
                        >
                          {selected ? "✓ " : ""}{reply}
                        </button>
                      );
                    })}
                  </div>
                  {selectedMulti.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const CHANNEL_OPTIONS = ["WhatsApp", "Instagram", "Facebook", "Email", "SMS"];
                        const selectedChannels = selectedMulti.filter((r) => CHANNEL_OPTIONS.includes(r));
                        if (selectedChannels.length > 0) {
                          setBriefAccum((b) => ({ ...b, channels: selectedChannels as DonationCampaignBrief["channels"] }));
                        }
                        sendMessage(selectedMulti.join(", "));
                        setSelectedMulti([]);
                      }}
                      className="mt-3 flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600"
                    >
                      Confirmer — {selectedMulti.join(", ")}
                    </button>
                  )}
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-2 pl-9 text-sm text-slate-400">
                  <div className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-orange-400 [animation-delay:300ms]" />
                  </div>
                  L&apos;assistant réfléchit…
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Bouton générer plan */}
          {planReady && (
            <div className="shrink-0 py-3">
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 py-3.5 text-sm font-bold text-white shadow-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-60"
              >
                <Sparkles className="size-4" />
                {generating ? "Génération du plan en cours…" : "Générer mon plan de campagne"}
              </button>
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 pb-4 pt-2">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder="Votre réponse…"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <SendHorizonal className="size-4.5" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Sidebar campagne */}
        <div className="hidden w-[256px] shrink-0 flex-col gap-3 overflow-y-auto py-4 lg:flex">
          {/* Carte prévisualisation */}
          <div className="overflow-hidden rounded-2xl border border-orange-100 shadow-sm">
            {/* Header orange */}
            <div className="bg-[linear-gradient(135deg,#C2410C,#EA580C)] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                  <HandHeart className="size-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-200">En construction</p>
                  <p className="mt-0.5 text-sm font-black leading-none text-white">Votre campagne</p>
                </div>
              </div>
            </div>
            {/* Champs */}
            <div className="divide-y divide-slate-50 bg-white">
              {SIDEBAR_FIELDS.map((field, i) => {
                const hasValue = !!field.value || (field.channels && field.channels.length > 0);
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${hasValue ? "bg-orange-100" : "bg-slate-50"}`}>
                      <field.icon className={`size-3 ${hasValue ? "text-orange-500" : "text-slate-300"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{field.label}</p>
                      {field.channels ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {field.channels.map((ch) => (
                            <span key={ch} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              <ChannelIcon channel={ch} className="size-3" />
                              {ch}
                            </span>
                          ))}
                        </div>
                      ) : field.value ? (
                        <p className="mt-0.5 break-words text-xs font-semibold text-slate-800">{field.value}</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-slate-300">—</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Carte progression */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black text-slate-800">Progression</p>
                <span className="text-[11px] font-bold text-orange-600">{doneCount}/5</span>
              </div>
              {/* Barre */}
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-700 ease-out"
                  style={{ width: `${(doneCount / 5) * 100}%` }}
                />
              </div>
              {/* Étapes */}
              <div className="mt-4 space-y-2.5">
                {progressSteps.map((step, i) => {
                  const isCurrent = !step.done && progressSteps.slice(0, i).every((s) => s.done);
                  return (
                    <div key={i} className="flex items-center gap-2.5">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-black transition-all ${
                          step.done
                            ? "bg-orange-500 text-white"
                            : isCurrent
                            ? "bg-orange-100 text-orange-600 ring-1 ring-orange-300"
                            : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {step.done ? <CheckCircle className="size-3" /> : i + 1}
                      </div>
                      <span
                        className={`flex-1 truncate text-xs font-semibold ${
                          step.done ? "text-slate-700" : isCurrent ? "text-orange-600" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                      {isCurrent && (
                        <div className="flex gap-[3px]">
                          {[0, 1, 2].map((d) => (
                            <span
                              key={d}
                              className="size-1.5 animate-bounce rounded-full bg-orange-400"
                              style={{ animationDelay: `${d * 120}ms` }}
                            />
                          ))}
                        </div>
                      )}
                      {step.done && <CheckCircle className="size-3 shrink-0 text-orange-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Plan ──────────────────────────────────────────────────────────────
  if (view === "plan") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <AgentPageBanner
          eyebrow="Plan de campagne"
          title={campaign?.title ?? "Votre campagne de dons"}
          description={campaign?.slogan ?? "Votre plan de campagne est organisé pour suivre chaque étape, valider les contenus et préparer les prochaines publications."}
          icon={LayoutGrid}
          tone="purple"
        />

        {/* Mini hero */}
        <section className="hidden overflow-hidden rounded-2xl border border-orange-900/30 bg-[linear-gradient(135deg,#431407,#C2410C)] p-[1px]">
          <div className="relative rounded-[calc(0.75rem-1px)] bg-[linear-gradient(135deg,rgba(67,20,7,0.96),rgba(194,65,12,0.90))] px-6 py-6 text-white">
            <div className="absolute right-5 top-4 font-serif text-xl font-bold text-white/40">ב&quot;ה</div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-300">Plan de campagne</p>
                <h1 className="mt-1 text-xl font-black">{campaign?.title ?? "Votre campagne de dons"}</h1>
                {campaign?.slogan && <p className="mt-1 text-sm italic text-orange-200">{campaign.slogan}</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-orange-200">
                  {campaign?.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(campaign.start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      {campaign.end_date && ` → ${new Date(campaign.end_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`}
                    </span>
                  )}
                  {campaign?.channels?.map((ch) => (
                    <span key={ch} className="inline-flex items-center gap-1"><ChannelIcon channel={ch} /> {ch}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleModifyPlan}
                  className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
                >
                  <Pencil className="size-3.5" /> Modifier le plan
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tableau du plan */}
        <div className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-[0_18px_48px_rgba(138,24,77,0.10)]">
          {steps.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">Aucune étape générée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Étape</th>
                    <th className="px-5 py-3 text-left hidden sm:table-cell">Canal</th>
                    <th className="px-5 py-3 text-left">Statut</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {steps.map((step) => (
                    <tr key={step.id} className="group hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                        {new Date(`${step.step_date}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{step.step_label}</div>
                        <div className="mt-0.5 text-xs text-slate-400">{STEP_TYPE_LABELS[step.step_type]}</div>
                      </td>
                      <td className="hidden px-5 py-4 sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {step.selected_channels.slice(0, 3).map((ch) => (
                            <span key={ch} title={ch}><ChannelIcon channel={ch} className="size-4" /></span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STEP_STATUS_COLORS[step.status]}`}>
                          {STEP_STATUS_LABELS[step.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStepAction(step.id, "ready")}
                            disabled={step.status === "published"}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:text-[#8A184D] disabled:opacity-40"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleStepAction(step.id, "scheduled")}
                            disabled={step.status === "published" || step.status === "scheduled"}
                            className="flex items-center gap-1 rounded-lg bg-[#8A184D] px-3 py-1 text-xs font-semibold text-white hover:bg-[#70123f] disabled:opacity-40"
                          >
                            <Play className="size-3" /> Publier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bouton Visuels & Publications */}
        <div className="flex justify-center">
          <Link
            href="/dashboard/donation-campaign/visuals"
            className="group flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-[#8A184D] shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8A184D] text-white shadow-sm">
              <Share2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-black">Voir tous les visuels &amp; publications</p>
              <p className="text-xs text-rose-500">Affiches, WhatsApp, SMS, Email…</p>
            </div>
            <ChevronRight className="ml-2 size-5 opacity-50 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>

        {/* Carte Vidéo bientôt */}
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Video className="size-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-600">Vidéo de campagne IA</p>
              <p className="text-xs text-slate-400">Bientôt, l&apos;IA pourra créer vos vidéos de campagne en quelques minutes.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
