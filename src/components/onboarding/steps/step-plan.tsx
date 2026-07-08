"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlanCard } from "@/components/billing/plan-card";
import type { OnboardingData } from "../onboarding-wizard";
import { ChevronLeft, ChevronRight, Loader2, Rocket } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onPrev: () => void;
  onFinish: () => void;
  saving?: boolean;
}

const FREE_FEATURES = [
  "Tableau de bord et aperçu",
  "5 publications sociales manuelles / mois",
  "0 automatisation IA",
  "20 messages Agent IA",
  "WhatsApp bloqué",
  "Affiches limitées",
];

const PRO_FEATURES = [
  "WhatsApp débloqué",
  "Affiches illimitées",
  "20 publications sociales / mois",
  "3 automatisations IA",
  "50 messages Agent IA",
];

const BUSINESS_FEATURES = [
  "WhatsApp débloqué",
  "Affiches illimitées",
  "50 publications sociales / mois",
  "5 automatisations IA",
  "Messages Agent IA illimités",
  "Gestion des emails",
  "Gestion des avis Google",
];

export function StepPlan({ data, updateData, onPrev, onFinish, saving = false }: Props) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
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
