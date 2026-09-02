"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, Rocket, Sparkles } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onPrev: () => void;
  onFinish: () => void;
  saving?: boolean;
}

const INCLUDED = [
  "Toutes les pages restent accessibles gratuitement",
  "Aucune carte bancaire demandée pendant l'inscription",
  "Paiement uniquement avant une génération, un envoi ou une automatisation",
];

export function StepPlan({ updateData, onPrev, onFinish, saving = false }: Props) {
  return (
    <Card className="border-blue-100 shadow-xl shadow-blue-100/70">
      <CardHeader className="pb-4">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100">
          <Rocket className="size-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Vous êtes prêt à démarrer</CardTitle>
        <CardDescription>
          Explorez EasyCom IA librement. Vous choisirez de vous abonner uniquement lorsque vous lancerez votre première action réelle.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-violet-200 bg-violet-50/60 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#421388] shadow-sm"><Eye className="size-5" /></span>
            <div>
              <p className="font-black text-slate-950">Découverte gratuite</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Naviguez dans l’application, préparez votre organisation et découvrez tous les outils sans payer.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {INCLUDED.map((item) => <p key={item} className="flex items-start gap-2 text-sm font-semibold leading-5 text-slate-700"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />{item}</p>)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#421388] p-4 text-white">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-violet-100"><Sparkles className="size-3.5" />Quand vous serez prêt</div>
          <p className="mt-2 text-lg font-black">9,99 € TTC le premier mois</p>
          <p className="mt-1 text-sm font-semibold text-white/80">Puis 19,99 € TTC/mois. Une seule offre, annulable à tout moment depuis l’espace Paiement.</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={onPrev} className="shrink-0" disabled={saving}><ChevronLeft className="size-4" />Retour</Button>
          <Button size="lg" className="flex-1" onClick={() => { updateData({ billingChoice: "free" }); onFinish(); }} disabled={saving}>
            <ChevronRight className="size-4" />{saving ? "Finalisation..." : "Accéder à EasyCom IA"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
