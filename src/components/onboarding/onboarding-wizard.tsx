"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepIdentity } from "./steps/step-identity";
import { StepEditorial } from "./steps/step-editorial";
import { StepChannels } from "./steps/step-channels";
import { StepRecurring } from "./steps/step-recurring";
import { StepFinish } from "./steps/step-finish";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { id: 0, label: "Identité", description: "Votre communauté" },
  { id: 1, label: "Éditorial", description: "Ton & règles" },
  { id: 2, label: "Canaux", description: "Où diffuser" },
  { id: 3, label: "Récurrences", description: "Événements types" },
  { id: 4, label: "C'est parti !", description: "Finalisation" },
];

export interface OnboardingData {
  // Étape 1 — Identité
  communityName: string;
  communityType: string;
  religiousStream: string;
  city: string;
  country: string;
  timezone: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logoUrl: string;

  // Étape 2 — Éditorial
  tone: string;
  language: string;
  signature: string;
  hashtags: string[];
  editorialRules: string;

  // Étape 3 — Canaux
  channels: Array<{
    type: string;
    name: string;
    handle: string;
  }>;

  // Étape 4 — Récurrences
  recurringEvents: Array<{
    title: string;
    category: string;
    dayOfWeek?: number;
    time?: string;
  }>;
}

const defaultData: OnboardingData = {
  communityName: "",
  communityType: "SYNAGOGUE",
  religiousStream: "",
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
};

interface Props {
  userId: string;
  userName: string;
  initialStep?: number;
}

export function OnboardingWizard({ userId, userName, initialStep = 0 }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [saving, setSaving] = useState(false);

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function goNext() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goPrev() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  async function finishOnboarding() {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, data }),
      });

      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");

      router.push("/dashboard/assistant?welcome=true");
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  }

  const stepProps = { data, updateData, onNext: goNext, onPrev: goPrev };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:py-12">
      {/* En-tête de bienvenue */}
      <div className="w-full max-w-2xl mb-8 sm:mb-10 text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Bienvenue, {userName.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 sm:text-base">
          Configurons votre communauté en quelques étapes — cela prend moins de 5 minutes.
        </p>
      </div>

      {/* Barre de progression */}
      <div className="w-full max-w-2xl mb-8 sm:mb-10 overflow-x-auto">
        <div className="relative flex min-w-[520px] items-center justify-between">
          {/* Ligne de connexion */}
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute left-0 top-4 h-0.5 bg-blue-600 transition-all duration-500 -z-0"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 z-10">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-blue-600 border-blue-600 text-white"
                      : isCurrent
                      ? "bg-white border-blue-600 text-blue-600"
                      : "bg-white border-slate-200 text-slate-400"
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : step.id + 1}
                </div>
                <div className="text-center hidden sm:block">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isCurrent ? "text-blue-600" : isCompleted ? "text-slate-700" : "text-slate-400"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contenu de l'étape */}
      <div className="w-full max-w-2xl animate-fade-in">
        {currentStep === 0 && <StepIdentity {...stepProps} />}
        {currentStep === 1 && <StepEditorial {...stepProps} />}
        {currentStep === 2 && <StepChannels {...stepProps} />}
        {currentStep === 3 && <StepRecurring {...stepProps} />}
        {currentStep === 4 && (
          <StepFinish data={data} onFinish={finishOnboarding} saving={saving} />
        )}
      </div>
    </div>
  );
}
