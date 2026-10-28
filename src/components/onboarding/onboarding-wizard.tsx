"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepIdentity } from "./steps/step-identity";
import { WelcomeAnimation } from "./welcome-animation";
import { getPublicToolDestination } from "@/lib/public-tools";
import { normalizeSupportedCountry } from "@/lib/community/countries";
import { useLocale } from "next-intl";

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
  donationUrl: string;
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

  // Conservé pour compatibilité avec les brouillons d'onboarding existants.
  // Le paiement intervient uniquement lors de la première action réelle.
  billingChoice: "free";
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
  donationUrl: "",
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
  donationUrl: "https://allodons.fr/chlomi-test",
  signature: "L'équipe Chlomi-test",
  hashtags: ["#ChlomiTest", "#DemoEasycom"],
  channels: [
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
  simulationMode?: boolean;
  returnTo?: string;
}

export function OnboardingWizard({
  userId,
  userName,
  initialData,
  simulationMode = false,
  returnTo,
}: Props) {
  const he = useLocale() === "he";
  const router = useRouter();
  const [data, setData] = useState<OnboardingData>(() => {
    const restored = { ...defaultData, ...initialData };
    return { ...restored, country: normalizeSupportedCountry(restored.country) };
  });
  const [showWelcome, setShowWelcome] = useState(false);

  function updateData(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  // Only the identity step remains: it creates the space and opens EasyCom right away.
  async function finishOnboarding() {
    try {
      if (simulationMode) {
        window.setTimeout(() => {
          setShowWelcome(true);
        }, 450);
        return;
      }

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, data }),
      });

      if (!res.ok) throw new Error(he ? "שגיאה בשמירה" : "Erreur lors de la sauvegarde");

      // The free trial starts now and needs no card: go straight to the tool.
      router.replace(getPublicToolDestination(returnTo) ?? "/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      throw err instanceof Error ? err : new Error(he ? "לא ניתן להשלים את ההרשמה." : "Impossible de finaliser votre inscription.");
    }
  }

  if (showWelcome) {
    return (
      <WelcomeAnimation
        onComplete={() => {
          if (simulationMode) setShowWelcome(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-sky-100 px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <div className="relative mb-8 w-full overflow-hidden rounded-[2rem] border border-blue-400/30 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-6 text-center text-white shadow-xl shadow-blue-300/50 sm:mb-10 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 size-48 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="relative mx-auto mb-5 h-1.5 w-24 rounded-full bg-gradient-to-r from-white via-sky-200 to-cyan-200" />
          {simulationMode && (
            <div className="relative mx-auto mb-4 inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold text-white">
              {he ? "הדמיית ממשק — לא נשמרים נתונים" : "Simulation UI - aucune donnée n’est enregistrée"}
            </div>
          )}
          <p className="relative text-xs font-bold uppercase tracking-[0.22em] text-blue-100">
            {he ? "ברוכים הבאים ל־" : "Bienvenue chez "}EasyCom IA{userName ? `, ${userName.split(" ")[0]}` : ""}
          </p>
          <h1 className="relative mt-3 text-2xl font-black tracking-tight sm:text-4xl">
            {he ? "בואו ניצור מרחב שמתאים לכם" : "Créons un espace qui vous ressemble"}
          </h1>
        </div>

        <div className="w-full max-w-2xl animate-fade-in">
          <StepIdentity
            data={data}
            updateData={updateData}
            onNext={finishOnboarding}
            onPrev={() => undefined}
            simulationMode={simulationMode}
          />
        </div>
      </div>
    </div>
  );
}
