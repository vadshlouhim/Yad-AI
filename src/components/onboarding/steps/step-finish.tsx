"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import {
  Sparkles, Building2, Pen, Radio, Calendar,
  Check, Loader2, ChevronLeft, Zap,
} from "lucide-react";

interface Props {
  data: OnboardingData;
  onFinish: () => void;
  onPrev: () => void;
  saving: boolean;
  simulationMode?: boolean;
}

const TONE_LABELS: Record<string, string> = {
  MODERN: "Moderne & dynamique",
  TRADITIONAL: "Traditionnel & classique",
  FRIENDLY: "Chaleureux & convivial",
  FORMAL: "Formel & institutionnel",
  RELIGIOUS: "Inspirant & porteur de sens",
};

const TYPE_LABELS: Record<string, string> = {
  ASSOCIATION: "Association / ONG",
  RELIGIOUS: "Lieu de culte",
  SCHOOL: "École / Formation",
  SPORT: "Sport & Loisirs",
  CULTURE: "Culture & Arts",
  PROFESSIONAL: "Réseau professionnel",
  LOCAL: "Quartier / Local",
  STUDENT: "Étudiants / Campus",
  ONLINE: "Communauté en ligne",
  CENTER: "Centre communautaire",
  OTHER: "Autre",
};

export function StepFinish({ data, onFinish, onPrev, saving, simulationMode = false }: Props) {
  const summaryItems = [
    {
      icon: Building2,
      label: "Identité",
      value: data.communityName || "—",
      sub: [data.communityType ? (TYPE_LABELS[data.communityType] ?? data.communityType) : null, data.city].filter(Boolean).join(" · "),
      color: "text-blue-600 bg-blue-50",
    },
    {
      icon: Pen,
      label: "Ton éditorial",
      value: TONE_LABELS[data.tone] ?? data.tone,
      sub: data.hashtags.slice(0, 3).join(" ") || "Aucun hashtag",
      color: "text-amber-600 bg-amber-50",
    },
    {
      icon: Radio,
      label: "Canaux",
      value:
        data.channels.length > 0
          ? `${data.channels.length} canal${data.channels.length > 1 ? "x" : ""}`
          : "À configurer plus tard",
      sub: data.channels.map((c) => c.name).join(", "),
      color: "text-green-600 bg-green-50",
    },
    {
      icon: Calendar,
      label: "Agenda",
      value:
        data.recurringEvents.length > 0
          ? `${data.recurringEvents.length} récurrence${data.recurringEvents.length > 1 ? "s" : ""}`
          : "À configurer plus tard",
      sub: data.recurringEvents.map((e) => e.title).join(", "),
      color: "text-purple-600 bg-purple-50",
    },
  ];

  function splitSub(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return (
    <Card className="shadow-md">
      <CardContent className="pt-8 pb-8 space-y-8">

        {/* Logo + titre */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <img
              src="/easycom-ai-logo.png"
              alt="Logo EasyCom AI"
              className="h-16 w-16 rounded-2xl object-cover shadow-lg"
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">Tout est prêt !</h2>
            <p className="text-slate-500">
              Voici un récapitulatif de votre configuration.
              Tout peut être modifié depuis les Paramètres.
            </p>
          </div>
        </div>

        {/* Récap */}
        <div className="grid gap-4 sm:grid-cols-2">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon className="size-5" />
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">
                  <Check className="size-4" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400 uppercase tracking-[0.16em] font-semibold">
                    {item.label}
                  </p>
                  <p className="text-base font-semibold leading-tight text-slate-900 break-words">
                    {item.value}
                  </p>
                </div>

                {item.sub && (
                  <div className="flex flex-wrap gap-2">
                    {splitSub(item.sub).map((entry) => (
                      <span
                        key={`${item.label}-${entry}`}
                        className="inline-flex max-w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 break-words"
                      >
                        {entry}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Ce qui va se passer */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Zap className="size-4 text-blue-600" />
            Ce que EasyCom AI va faire maintenant :
          </p>
          <ul className="space-y-2">
            {[
              "Créer votre espace communauté personnalisé",
              "Configurer vos premières automatisations",
              "Préparer les contenus suggérés pour vos prochains événements",
              "Connecter vos canaux de diffusion",
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

        {/* Navigation */}
        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={onPrev} disabled={saving} className="flex-shrink-0">
            <ChevronLeft className="size-4" />
            Retour
          </Button>
          <Button size="lg" className="flex-1" onClick={onFinish} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {simulationMode ? "Simulation en cours..." : "Création en cours…"}
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {simulationMode ? "Terminer la simulation" : "Lancer mon espace EasyCom AI"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
