"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlanCard, type PlanFeature } from "@/components/billing/plan-card";
import type { OnboardingData } from "../onboarding-wizard";
import { ChevronLeft, ChevronRight, Loader2, Rocket } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onPrev: () => void;
  onFinish: () => void;
  saving?: boolean;
}

const FREE_FEATURES: PlanFeature[] = [
  { label: "Tableau de bord et aperçu", included: true },
  { label: "5 publications sociales manuelles / mois", included: true },
  { label: "20 messages Agent IA", included: true },
  { label: "Affiches limitées", included: true },
  { label: "0 automatisation IA", included: false },
  { label: "WhatsApp bloqué", included: false },
  { label: "Gestion des emails", included: false },
  { label: "Gestion des avis Google", included: false },
];

const PRO_FEATURES: PlanFeature[] = [
  { label: "Tableau de bord et aperçu", included: true },
  { label: "20 publications sociales / mois", included: true },
  { label: "3 automatisations IA", included: true },
  { label: "50 messages Agent IA", included: true },
  { label: "WhatsApp débloqué", included: true },
  { label: "Affiches illimitées", included: true },
  { label: "Gestion des emails", included: false },
  { label: "Gestion des avis Google", included: false },
];

const BUSINESS_FEATURES: PlanFeature[] = [
  { label: "Tableau de bord et aperçu", included: true },
  { label: "50 publications sociales / mois", included: true },
  { label: "5 automatisations IA", included: true },
  { label: "Messages Agent IA illimités", included: true },
  { label: "WhatsApp débloqué", included: true },
  { label: "Affiches illimitées", included: true },
  { label: "Gestion des emails", included: true },
  { label: "Gestion des avis Google", included: true },
];

export function StepPlan({ data, updateData, onPrev, onFinish, saving = false }: Props) {
  return (
    <Card className="border-blue-100 shadow-xl shadow-blue-100/70">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center mb-3">
          <Rocket className="size-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Choisissez votre mode de départ</CardTitle>
        <CardDescription>
          Vous pourrez modifier ce choix après l&apos;onboarding depuis la facturation.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          <PlanCard
            tier="FREE"
            title="Gratuit"
            priceLabel="0 €"
            features={FREE_FEATURES}
            selected={data.billingChoice === "free"}
            onClick={() => updateData({ billingChoice: "free" })}
          />
          <PlanCard
            tier="PRO"
            title="Pro"
            priceLabel="29,99 €"
            features={PRO_FEATURES}
            badge="Populaire"
            selected={data.billingChoice === "pro"}
            onClick={() => updateData({ billingChoice: "pro" })}
          />
          <PlanCard
            tier="BUSINESS"
            title="Business"
            priceLabel="59,99 €"
            features={BUSINESS_FEATURES}
            selected={data.billingChoice === "business"}
            onClick={() => updateData({ billingChoice: "business" })}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={onPrev} className="flex-shrink-0" disabled={saving}>
            <ChevronLeft className="size-4" />
            Retour
          </Button>
          <Button size="lg" className="flex-1" onClick={onFinish} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
            {saving ? "Finalisation..." : "Finaliser"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
