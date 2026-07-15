"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Copy,
  FileImage,
  ImageIcon,
  Layout,
  Mail,
  MessageCircle,
  Play,
  Save,
  Share2,
  Smartphone,
  Sparkles,
  Video,
} from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import type { DonationCampaign, CampaignStep, CampaignAsset, StepStatus } from "@/lib/donation-campaign";
import { ASSET_TYPE_LABELS, STEP_TYPE_LABELS } from "@/lib/donation-campaign";
import { FacebookIcon, InstagramIcon } from "@/components/layout/dashboard-nav";

interface Props {
  community: { id: string; name: string; logoUrl: string | null; plan: string | null };
  campaign: DonationCampaign | null;
  steps: CampaignStep[];
  assets: CampaignAsset[];
}

interface GeneratedContent {
  type: "whatsapp" | "sms";
  stepId: string;
  stepLabel: string;
  text: string;
}

const ASSET_SECTION_ICONS = {
  square_poster: FileImage,
  banner: Layout,
  whatsapp_text: MessageCircle,
  sms_text: Smartphone,
  email_content: Mail,
  social_post: Share2,
};

const STEP_TYPE_COLORS: Record<string, string> = {
  launch: "bg-orange-100 text-orange-700",
  reminder: "bg-blue-100 text-blue-700",
  relay: "bg-amber-100 text-amber-700",
  final_push: "bg-rose-100 text-rose-700",
  closing: "bg-emerald-100 text-emerald-700",
  thank_you: "bg-teal-100 text-teal-700",
};

function TextAssetCard({
  step,
  type,
  campaignTitle,
  slogan,
  donationUrl,
  emailEnabled,
  campaignId,
  existingAsset,
}: {
  step: CampaignStep;
  type: "whatsapp_text" | "sms_text" | "email_content" | "social_post";
  campaignTitle: string;
  slogan: string | null;
  donationUrl: string | null;
  emailEnabled: boolean;
  campaignId: string;
  existingAsset: CampaignAsset | null;
}) {
  const [text, setText] = useState(existingAsset?.text_content ?? "");
  const [assetId, setAssetId] = useState<string | null>(existingAsset?.id ?? null);
  const [stepStatus, setStepStatus] = useState<StepStatus>(step.status);
  const [stepScheduledAt, setStepScheduledAt] = useState<string | null>(step.scheduled_publish_at);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [schedulingMode, setSchedulingMode] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduledInput, setScheduledInput] = useState(
    step.step_date ? `${step.step_date}T09:00` : new Date().toISOString().slice(0, 16)
  );

  if (type === "email_content" && !emailEnabled) return null;

  const isScheduled = stepStatus === "scheduled";
  const isPublished = stepStatus === "published";
  const isSaved = !!assetId;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const action =
        type === "sms_text" ? "generate-sms-text" :
        type === "social_post" ? "generate-social-post" :
        "generate-whatsapp-text";
      const res = await fetch("/api/donation-campaign/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, stepLabel: step.step_label, campaignTitle, slogan: slogan ?? "", donationUrl: donationUrl ?? "" }),
      });
      const data = await res.json();
      setText(data.text ?? "");
      setAssetId(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!text || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/donation-campaign/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-asset",
          campaignId,
          stepId: step.id,
          assetType: type,
          textContent: text,
          title: `${step.step_label} — ${ASSET_TYPE_LABELS[type]}`,
        }),
      });
      const data = await res.json();
      if (data.asset?.id) setAssetId(data.asset.id);
    } finally {
      setSaving(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledInput || scheduling) return;
    setScheduling(true);
    try {
      if (!isSaved) await handleSave();
      const res = await fetch("/api/donation-campaign/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule-step",
          stepId: step.id,
          campaignId,
          scheduledAt: new Date(scheduledInput).toISOString(),
          stepLabel: step.step_label,
        }),
      });
      if (res.ok) {
        setStepStatus("scheduled");
        setStepScheduledAt(new Date(scheduledInput).toISOString());
        setSchedulingMode(false);
      }
    } finally {
      setScheduling(false);
    }
  };

  const handleMarkPublished = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/donation-campaign/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-step-published", stepId: step.id }),
      });
      if (res.ok) setStepStatus("published");
    } finally {
      setPublishing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const Icon = type === "sms_text" ? Smartphone : type === "email_content" ? Mail : MessageCircle;
  const label = ASSET_TYPE_LABELS[type] ?? "Publication réseaux sociaux";
  const isSms = type === "sms_text";
  const isSocial = type === "social_post";

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-sm transition-all ${isPublished ? "border-emerald-200 bg-emerald-50/20" : isScheduled ? "border-orange-200 bg-orange-50/20" : "border-slate-200 bg-white"}`}>
      {/* En-tête */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${type === "sms_text" ? "bg-sky-100 text-sky-600" : type === "email_content" ? "bg-red-50 text-red-600" : type === "social_post" ? "bg-blue-50" : "bg-green-100 text-green-600"}`}>
          {isSocial ? (
            <div className="flex gap-0.5">
              <FacebookIcon className="size-3.5" />
              <InstagramIcon className="size-3.5" />
            </div>
          ) : (
            <Icon className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{label}</p>
          <p className="truncate text-xs text-slate-400">{step.step_label}</p>
        </div>
        {isPublished && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle className="size-3" /> Envoyé
          </span>
        )}
        {isScheduled && !isPublished && (
          <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700">
            <Clock className="size-3" /> Programmé
          </span>
        )}
        {isSaved && !isScheduled && !isPublished && (
          <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">
            <CheckCircle className="size-3" /> Enregistré
          </span>
        )}
      </div>

      <div className="p-4">
        {!text ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-50 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-100 disabled:opacity-60"
          >
            <Sparkles className="size-3.5" />
            {loading ? "Génération…" : `Générer ${label}`}
          </button>
        ) : (
          <>
            {/* Zone texte éditable */}
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); if (isSaved) setAssetId(null); }}
              rows={5}
              disabled={isPublished}
              className="w-full resize-none rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-200 disabled:opacity-70"
            />
            {isSms && (
              <p className={`mt-0.5 text-right text-xs font-semibold ${text.length > 160 ? "text-red-500" : text.length > 140 ? "text-amber-500" : "text-slate-400"}`}>
                {text.length} / 160 caractères
              </p>
            )}

            {!isPublished && (
              <div className="mt-3 space-y-2">
                {/* Copier + Regénérer */}
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    {copied ? <CheckCircle className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    {copied ? "Copié !" : "Copier"}
                  </button>
                  <button onClick={handleGenerate} disabled={loading} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-60">
                    <Sparkles className="size-3.5" /> Regénérer
                  </button>
                </div>

                {/* Enregistrer + Programmer */}
                {!isScheduled && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || (isSaved && !text)}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${isSaved ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-60"}`}
                    >
                      {saving ? "…" : isSaved ? <><CheckCircle className="size-3.5" /> Enregistré</> : <><Save className="size-3.5" /> Enregistrer</>}
                    </button>
                    <button
                      onClick={() => setSchedulingMode(true)}
                      disabled={!isSaved}
                      title={!isSaved ? "Enregistrez d'abord le texte" : ""}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Clock className="size-3.5" /> Programmer
                    </button>
                  </div>
                )}

                {/* Panneau de programmation */}
                {schedulingMode && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-orange-700">Date & heure d&apos;envoi</p>
                    <input
                      type="datetime-local"
                      value={scheduledInput}
                      onChange={(e) => setScheduledInput(e.target.value)}
                      className="w-full rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                    <p className="mt-1.5 text-[10px] text-orange-600">Un email de rappel vous sera envoyé à cette heure.</p>
                    <div className="mt-2.5 flex gap-2">
                      <button onClick={() => setSchedulingMode(false)} className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                        Annuler
                      </button>
                      <button
                        onClick={handleSchedule}
                        disabled={scheduling || !scheduledInput}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-1.5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60"
                      >
                        <Clock className="size-3" />
                        {scheduling ? "…" : "Confirmer"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Affichage programmé */}
                {isScheduled && !schedulingMode && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 rounded-xl bg-orange-50 px-3 py-2.5">
                      <Clock className="size-4 shrink-0 text-orange-500" />
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-500">Programmé pour le</p>
                        <p className="text-xs font-bold text-orange-900">
                          {stepScheduledAt
                            ? new Date(stepScheduledAt).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </p>
                      </div>
                      <button onClick={() => setSchedulingMode(true)} className="text-[10px] font-semibold text-orange-600 underline hover:text-orange-800">
                        Modifier
                      </button>
                    </div>
                    <button
                      onClick={handleMarkPublished}
                      disabled={publishing}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      <CheckCircle className="size-3.5" />
                      {publishing ? "…" : "Marquer comme envoyé ✓"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {isPublished && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
                <CheckCircle className="size-4 text-emerald-500" />
                <p className="text-xs font-bold text-emerald-700">Message envoyé à la communauté</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function DonationCampaignVisualsClient({ community, campaign, steps, assets }: Props) {
  const [activeSection, setActiveSection] = useState<"all" | "posters" | "messages" | "email" | "sms">("all");

  if (!campaign) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-12 text-center sm:px-6">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-slate-100">
          <Share2 className="size-7 text-slate-400" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Aucune campagne active</h2>
        <p className="text-sm text-slate-500">Créez d&apos;abord votre plan de campagne.</p>
        <Link
          href="/dashboard/donation-campaign"
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
        >
          <ArrowLeft className="size-4" /> Aller au pilotage
        </Link>
      </div>
    );
  }

  const whatsappSteps = steps.filter((s) => s.selected_channels.includes("WhatsApp"));
  const smsSteps = steps;
  const emailSteps = campaign.email_enabled ? steps.filter((s) => s.selected_channels.includes("Email")) : [];
  const socialSteps = steps.filter((s) =>
    s.selected_channels.includes("Facebook") || s.selected_channels.includes("Instagram")
  );
  const hasFacebook = campaign.channels.includes("Facebook");
  const hasInstagram = campaign.channels.includes("Instagram");
  const posterSteps = steps.filter((s) => s.visual_type === "square_poster" || s.visual_type === "banner");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <AgentPageBanner
        eyebrow="Campagne de dons"
        title="Visuels & Publications"
        description="Retrouvez tous les supports créés pour votre campagne de dons : affiches, messages, publications et contenus prêts à valider."
        icon={Share2}
        tone="purple"
      />

      {/* Hero */}
      <section className="hidden overflow-hidden rounded-[2rem] border border-orange-900/30 bg-[linear-gradient(135deg,#431407,#7C2D12,#EA580C)] p-[1px]">
        <div className="relative rounded-[calc(2rem-1px)] bg-[linear-gradient(135deg,rgba(67,20,7,0.97),rgba(124,45,18,0.95),rgba(234,88,12,0.92))] px-6 py-7 text-white sm:px-8">
          <div className="absolute right-6 top-5 font-serif text-xl font-bold text-white/40">ב&quot;ה</div>
          <Link
            href="/dashboard/donation-campaign"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300 hover:text-orange-100"
          >
            <ArrowLeft className="size-3.5" /> Retour au pilotage
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-orange-200">
            <Share2 className="size-3.5" /> Visuels &amp; Publications
          </div>
          <h1 className="mt-3 text-2xl font-black">Visuels &amp; Publications</h1>
          <p className="mt-1 text-sm text-orange-100/80">
            Retrouvez tous les supports créés pour votre campagne de dons.
          </p>
        </div>
      </section>

      {/* 3 encarts */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: ImageIcon, title: "Affiche carrée", desc: "Pour le lancement et les réseaux sociaux", color: "from-violet-50 to-fuchsia-50 border-violet-100 text-[#421388] bg-violet-100" },
          { icon: MessageCircle, title: "Messages", desc: "WhatsApp, Email et contenus SMS", color: "from-indigo-50 to-violet-50 border-indigo-100 text-indigo-700 bg-indigo-100" },
          { icon: Play, title: "Publication", desc: "Validez, modifiez et diffusez au bon moment", color: "from-fuchsia-50 to-violet-50 border-fuchsia-100 text-fuchsia-700 bg-fuchsia-100" },
        ].map((card, i) => (
          <div key={i} className={`flex flex-col gap-3 rounded-3xl border bg-gradient-to-br p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(66,19,136,0.10)] ${card.color.split(" ").slice(0, 3).join(" ")}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.color.split(" ").slice(3).join(" ")}`}>
              <card.icon className="size-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">{card.title}</h3>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Campaign summary */}
      <div className="rounded-3xl border border-violet-100 bg-white p-4 shadow-[0_18px_48px_rgba(66,19,136,0.07)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h2 className="text-base font-black text-slate-900">{campaign.title}</h2>
            {campaign.slogan && <p className="mt-0.5 text-sm italic text-slate-500">{campaign.slogan}</p>}
          </div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-[#421388]">
            {steps.length} étapes
          </span>
        </div>
      </div>

      {/* Textes WhatsApp par étape */}
      {whatsappSteps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-green-600" />
            <h2 className="text-base font-black text-slate-900">Textes WhatsApp</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {whatsappSteps.map((step) => (
              <TextAssetCard
                key={`wa-${step.id}`}
                step={step}
                type="whatsapp_text"
                campaignTitle={campaign.title}
                slogan={campaign.slogan}
                donationUrl={campaign.donation_url}
                emailEnabled={campaign.email_enabled}
                campaignId={campaign.id}
                existingAsset={assets.find((a) => a.step_id === step.id && a.asset_type === "whatsapp_text") ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Publications Facebook & Instagram */}
      {socialSteps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {hasFacebook && <FacebookIcon className="size-4" />}
              {hasInstagram && <InstagramIcon className="size-4" />}
            </div>
            <h2 className="text-base font-black text-slate-900">
              Publications{hasFacebook && hasInstagram ? " Facebook & Instagram" : hasFacebook ? " Facebook" : " Instagram"}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {socialSteps.map((step) => (
              <TextAssetCard
                key={`social-${step.id}`}
                step={step}
                type="social_post"
                campaignTitle={campaign.title}
                slogan={campaign.slogan}
                donationUrl={campaign.donation_url}
                emailEnabled={campaign.email_enabled}
                campaignId={campaign.id}
                existingAsset={assets.find((a) => a.step_id === step.id && a.asset_type === "social_post") ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Contenus SMS */}
      {campaign.sms_enabled && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-sky-600" />
            <h2 className="text-base font-black text-slate-900">Contenus SMS</h2>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-600">
              Préparation uniquement
            </span>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2 text-xs text-sky-700">
            Bientôt, vous pourrez envoyer vos SMS directement depuis EasyCom AI à un tarif négocié.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {smsSteps.slice(0, 4).map((step) => (
              <TextAssetCard
                key={`sms-${step.id}`}
                step={step}
                type="sms_text"
                campaignTitle={campaign.title}
                slogan={campaign.slogan}
                donationUrl={campaign.donation_url}
                emailEnabled={campaign.email_enabled}
                campaignId={campaign.id}
                existingAsset={assets.find((a) => a.step_id === step.id && a.asset_type === "sms_text") ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Email */}
      {campaign.email_enabled && emailSteps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-red-500" />
            <h2 className="text-base font-black text-slate-900">Emails de campagne</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {emailSteps.map((step) => (
              <TextAssetCard
                key={`email-${step.id}`}
                step={step}
                type="email_content"
                campaignTitle={campaign.title}
                slogan={campaign.slogan}
                donationUrl={campaign.donation_url}
                emailEnabled={campaign.email_enabled}
                campaignId={campaign.id}
                existingAsset={assets.find((a) => a.step_id === step.id && a.asset_type === "email_content") ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Affiches & Bannières */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileImage className="size-4 text-orange-600" />
          <h2 className="text-base font-black text-slate-900">Affiches &amp; Bannières</h2>
        </div>
        {posterSteps.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {posterSteps.map((step) => {
              const existing = assets.find(
                (a) => a.step_id === step.id && (a.asset_type === "square_poster" || a.asset_type === "banner")
              );
              return (
                <div
                  key={`poster-${step.id}`}
                  className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <ImageIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">{step.step_label}</p>
                      <p className="text-xs text-slate-400">
                        {step.visual_type === "square_poster" ? "Affiche carrée" : "Bannière"}
                      </p>
                    </div>
                    {existing ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        Créée
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        À créer
                      </span>
                    )}
                  </div>
                  {existing?.thumbnail_url ? (
                    <img
                      src={existing.thumbnail_url}
                      alt={step.step_label}
                      className="h-28 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                      <p className="text-xs text-slate-400">Aucun visuel créé pour cette étape</p>
                    </div>
                  )}
                  <Link
                    href="/dashboard/templates"
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-50 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"
                  >
                    <Sparkles className="size-3.5" />
                    {existing ? "Modifier l'affiche" : "Créer l'affiche"}
                    <ArrowLeft className="size-3 rotate-180" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <FileImage className="size-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  Allez dans la section <strong>Affiches</strong>{" "}pour créer vos visuels de campagne carrés et bannières.
                  L&apos;IA respecte les règles de votre charte graphique et n&apos;altère jamais les visages ni les photos.
                </p>
                <Link
                  href="/dashboard/templates"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
                >
                  Aller aux Affiches <ArrowLeft className="size-3 rotate-180" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Carte Vidéo bientôt */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <Video className="size-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-600">Vidéo de campagne IA</p>
            <p className="text-xs text-slate-400">
              Bientôt, l&apos;IA pourra créer vos vidéos de campagne en quelques minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
