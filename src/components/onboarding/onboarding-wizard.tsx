"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepIdentity } from "./steps/step-identity";
import { StepSocial } from "./steps/step-social";
import { StepPlan } from "./steps/step-plan";
import { WelcomeAnimation } from "./welcome-animation";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { id: 0, label: "Identité", description: "Votre structure" },
  { id: 1, label: "Réseaux sociaux", description: "Connexion & automatisations" },
  { id: 2, label: "C'est parti !", description: "Choisissez votre offre" },
];

export interface OnboardingData {
  // Étape 1 - Identité
  communityName: string;
  communityType: string;
  isBethHabad: boolean;
  description: string;
  city: string;
  country: string;
  timezone: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logoUrl: string;

  // Style éditorial (non collecté à l'onboarding, réglable dans les Paramètres)
  tone: string;
  language: string;
  signature: string;
  hashtags: string[];
  editorialRules: string;

  // Étape 2 - Réseaux sociaux
  channels: Array<{
    type: string;
    name: string;
    handle: string;
  }>;

  // Étape 2 - Automatisations
  recurringEvents: Array<{
    title: string;
    category: string;
    dayOfWeek?: number;
    time?: string;
  }>;
  selectedAutomationScenarioIds: string[];
  automationNotificationLeadHours: number;
  automationValidationMode: "manual" | "automatic";

  // Étape 3 - Offre
  billingChoice: "free" | "pro" | "business";
}

export interface OnboardingAutomationPreset {
  id: string;
  title: string;
  description: string | null;
  category: string;
  icon: string | null;
  clientTypes: string[];
}

const defaultData: OnboardingData = {
  communityName: "",
  communityType: "ASSOCIATION",
  isBethHabad: false,
  description: "",
  city: "",
  country: "France",
  timezone: "Europe/Paris",
  phone: "",
  email: "",
  website: "",
  address: "",
  logoUrl: "",
  tone: "MODERN",
  language: "fr",
  signature: "",
  hashtags: [],
  editorialRules: "",
  channels: [],
  recurringEvents: [],
  selectedAutomationScenarioIds: [],
  automationNotificationLeadHours: 2,
  automationValidationMode: "manual",
  billingChoice: "free",
};

export const demoOnboardingData: OnboardingData = {
  ...defaultData,
  communityName: "Chlomi-test",
  communityType: "ASSOCIATION",
  isBethHabad: false,
  description: "Structure fictive utilisée pour valider l'expérience d'onboarding.",
  city: "Paris",
  email: "test@chlomi-test.local",
  website: "https://chlomi-test.local",
  signature: "L'équipe Chlomi-test",
  hashtags: ["#ChlomiTest", "#DemoEasycom"],
  channels: [
    { type: "WHATSAPP", name: "WhatsApp", handle: "" },
    { type: "EMAIL", name: "Email", handle: "" },
  ],
  recurringEvents: [
    { title: "Newsletter mensuelle", category: "NEWSLETTER" },
    { title: "Communication mensuelle", category: "EVENT" },
  ],
};

interface Props {
  userId: string;
  userName: string;
  communityId?: string;
  initialStep?: number;
  initialData?: Partial<OnboardingData>;
  automationPresets?: OnboardingAutomationPreset[];
  simulationMode?: boolean;
}

export function OnboardingWizard({
  userId,
  userName,
  communityId: initialCommunityId,
  initialStep = 0,
  initialData,
  automationPresets = [],
  simulationMode = false,
}: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(Math.min(initialStep, STEPS.length - 1));
  const [data, setData] = useState<OnboardingData>(() => ({ ...defaultData, ...initialData }));
  const [communityId, setCommunityId] = useState<string | undefined>(initialCommunityId);
  const [saving, setSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function goNext() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  // Crée (ou met à jour) le brouillon de communauté dès la fin de l'étape Identité,
  // pour que la connexion OAuth (étape suivante) ait un communityId auquel s'attacher.
  async function handleIdentityContinue() {
    if (simulationMode) {
      goNext();
      return;
    }

    const res = await fetch("/api/onboarding/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, data }),
    });

    if (!res.ok) {
      throw new Error("Erreur lors de l'enregistrement du brouillon");
    }

    const json = await res.json();
    setCommunityId(json.communityId);
    goNext();
  }

  async function finishOnboarding() {
    setSaving(true);
    try {
      if (simulationMode) {
        window.setTimeout(() => {
          setSaving(false);
          setShowWelcome(true);
        }, 450);
        return;
      }

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, data }),
      });

      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");

      if (data.billingChoice !== "free") {
        const tier = data.billingChoice === "business" ? "ENTERPRISE" : "PROFESSIONAL";
        const checkout = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier,
            applyLaunchOffer: false,
            successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
            cancelUrl: `${window.location.origin}/dashboard`,
          }),
        });
        const checkoutData = await checkout.json().catch(() => ({}));
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
      }

      setShowWelcome(true);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  }

  if (showWelcome) {
    return (
      <WelcomeAnimation
        onComplete={() => {
          if (simulationMode) {
            setShowWelcome(false);
            setCurrentStep(STEPS.length - 1);
            return;
          }
          router.push("/dashboard?welcome=true");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <div className="mb-8 w-full overflow-hidden rounded-[2rem] border border-slate-800/10 bg-slate-950 p-6 text-center text-white shadow-xl shadow-slate-300/40 sm:mb-10 sm:p-8">
          <div className="mx-auto mb-5 h-1.5 w-24 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-400" />
          {simulationMode && (
            <div className="mx-auto mb-4 inline-flex rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
              Simulation UI - aucune donnée n&apos;est enregistrée
            </div>
          )}
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">
            Bienvenue, {userName.split(" ")[0]}
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
            Configurez votre assistant IA personnel en quelques minutes
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Ces informations permettent à EasyCom IA de comprendre votre identité et vos besoins pour personnaliser automatiquement vos contenus.
          </p>
        </div>

        <div className="mb-8 w-full max-w-2xl overflow-x-auto rounded-3xl border border-white bg-white/80 p-5 shadow-sm shadow-slate-200/80 sm:mb-10">
          <div className="relative flex min-w-[460px] items-center justify-between">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200 -z-0" />
            <div
              className="absolute left-0 top-4 h-0.5 bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-500 transition-all duration-500 -z-0"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="z-10 flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                      isCompleted
                        ? "border-blue-600 bg-blue-600 text-white"
                        : isCurrent
                          ? "border-blue-600 bg-white text-blue-600 shadow-md shadow-blue-100"
                          : "border-slate-200 bg-white text-slate-400"
                    )}
                  >
                    {isCompleted ? <Check className="size-4" /> : step.id + 1}
                  </div>
                  <div className="hidden text-center sm:block">
                    <p
                      className={cn(
                        "text-xs font-bold",
                        isCurrent ? "text-blue-700" : isCompleted ? "text-slate-700" : "text-slate-400"
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-2xl animate-fade-in">
          {currentStep === 0 && (
            <StepIdentity
              data={data}
              updateData={updateData}
              onNext={handleIdentityContinue}
              onPrev={goPrev}
              simulationMode={simulationMode}
            />
          )}
          {currentStep === 1 && (
            <StepSocial
              data={data}
              updateData={updateData}
              onNext={goNext}
              onPrev={goPrev}
              communityId={communityId}
              automationPresets={automationPresets}
              simulationMode={simulationMode}
            />
          )}
          {currentStep === 2 && (
            <StepPlan
              data={data}
              updateData={updateData}
              onPrev={goPrev}
              onFinish={finishOnboarding}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
