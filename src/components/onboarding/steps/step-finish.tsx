"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { Sparkles, Building2, Pen, Radio, Calendar, Check, Loader2 } from "lucide-react";

interface Props {
  data: OnboardingData;
  onFinish: () => void;
  saving: boolean;
}

export function StepFinish({ data, onFinish, saving }: Props) {
  const summaryItems = [
    {
      icon: Building2,
      label: "Identité",
      value: data.communityName || "—",
      sub: data.city,
      color: "text-blue-600 bg-blue-50",
    },
    {
      icon: Pen,
      label: "Ton éditorial",
      value: { MODERN: "Moderne", TRADITIONAL: "Traditionnel", FRIENDLY: "Chaleureux", FORMAL: "Formel", RELIGIOUS: "Religieux" }[data.tone] ?? data.tone,
      sub: data.hashtags.slice(0, 3).join(" ") || "Aucun hashtag",
      color: "text-amber-600 bg-amber-50",
    },
    {
      icon: Radio,
      label: "Canaux",
      value: data.channels.length > 0
        ? `${data.channels.length} canal${data.channels.length > 1 ? "x" : ""}`
        : "Aucun (à configurer plus tard)",
      sub: data.channels.map((c) => c.name).join(", "),
      color: "text-green-600 bg-green-50",
    },
    {
      icon: Calendar,
      label: "Récurrences",
      value: data.recurringEvents.length > 0
        ? `${data.recurringEvents.length} événement${data.recurringEvents.length > 1 ? "s" : ""}`
        : "Aucun (à configurer plus tard)",
      sub: data.recurringEvents.map((e) => e.title).join(", "),
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <Card className="shadow-md">
      <CardContent className="pt-8 pb-8 space-y-8">
        {/* Icône centrale */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center mx-auto shadow-lg">
            <Sparkles className="size-8 text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">Tout est prêt !</h2>
            <p className="text-slate-500">
              Voici un récapitulatif de votre configuration.
              Vous pourrez tout modifier depuis les Paramètres.
            </p>
          </div>
        </div>

        {/* Récap */}
        <div className="grid gap-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                <item.icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                {item.sub && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{item.sub}</p>
                )}
              </div>
              <Check className="size-4 text-emerald-500 flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>

        {/* Ce qui va se passer */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-800">
            🚀 Ce que Yad.ia va faire maintenant :
          </p>
          <ul className="space-y-2">
            {[
              "Créer votre dossier communauté intelligent",
              "Configurer le calendrier hébraïque automatique",
              "Préparer vos premières automatisations",
              "Générer vos premiers contenus suggérés",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Check className="size-3 text-white" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <Button
          size="xl"
          className="w-full"
          onClick={onFinish}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Création en cours…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Lancer mon espace Yad.ia
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
