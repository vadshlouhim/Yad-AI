"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingAutomationPreset, OnboardingData } from "../onboarding-wizard";
import {
  GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS,
  GENERAL_DEFAULT_PUBLICATION_CATEGORY,
} from "@/lib/automation/suggested-publications";
import { getCommunityProfileDisplayLabel } from "@/lib/community/profile-labels";
import { enablePushNotifications } from "@/lib/push/client";
import { Calendar, Check, ChevronLeft, ChevronRight, Loader2, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingConfig } from "@/lib/billing";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onPrev: () => void;
  onFinish: () => void;
  saving?: boolean;
  automationPresets?: OnboardingAutomationPreset[];
  billingConfig?: BillingConfig;
}
function normalizeProfile(value: string) {
  return value;
}

export function StepRecurring({
  data,
  updateData,
  onPrev,
  onFinish,
  saving = false,
  automationPresets = [],
  billingConfig,
}: Props) {
  const publicationProfileType = normalizeProfile(data.communityType);
  const profileLabel = getCommunityProfileDisplayLabel(data.communityType);
  const profilePublications = automationPresets.filter((preset) =>
    preset.category !== GENERAL_DEFAULT_PUBLICATION_CATEGORY && preset.clientTypes.includes(publicationProfileType)
  );
  const dbDefaultPublications = automationPresets.filter((preset) => preset.category === GENERAL_DEFAULT_PUBLICATION_CATEGORY);
  const suggestedPublications =
    profilePublications.length > 0
      ? profilePublications
      : dbDefaultPublications.length > 0
        ? dbDefaultPublications
        : GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS;

  function togglePublication(id: string) {
    const selected = data.selectedAutomationScenarioIds.includes(id);
    updateData({
      selectedAutomationScenarioIds: selected
        ? data.selectedAutomationScenarioIds.filter((publicationId) => publicationId !== id)
        : [...data.selectedAutomationScenarioIds, id],
    });
  }

  return (
    <Card className="border-white bg-white shadow-xl shadow-slate-200/80">
      <CardHeader className="pb-4">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100">
          <Calendar className="size-6 text-violet-700" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-xl">Automatisations de vos réseaux sociaux</CardTitle>
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-400">
            Facultatif
          </span>
        </div>
        <CardDescription>
          Sélectionnez vos rendez-vous réguliers. L&apos;IA préparera automatiquement les contenus et publications automatiques.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-sm font-semibold text-slate-800">Préférences d&apos;automatisation</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Vous pourrez modifier ces réglages à tout moment dans les paramètres.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Notification
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={data.automationNotificationLeadHours}
                  onChange={(event) =>
                    updateData({
                      automationNotificationLeadHours: Math.max(0.25, Number(event.target.value) || 2),
                    })
                  }
                  className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-sm text-slate-500">h avant</span>
              </div>
              <p className="text-xs text-slate-400">Par défaut : 2 heures avant.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Validation
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "manual" as const,
                    title: "Valider avant envoi",
                    description: "Recommandé : l'IA prépare, vous confirmez.",
                  },
                  {
                    value: "automatic" as const,
                    title: "Envoyer automatiquement",
                    description: "Les automatisations partent seules à l'heure prévue.",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      updateData({ automationValidationMode: option.value });
                      if (option.value === "manual") void enablePushNotifications();
                    }}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      data.automationValidationMode === option.value
                        ? "border-blue-300 bg-white text-blue-800 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                    )}
                  >
                    <span className="block text-sm font-bold">{option.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">
            Publications automatiques IA proposées pour{" "}
            {profileLabel && <span className="text-[1.18em] font-black text-blue-500">{profileLabel}</span>}
          </p>

          {suggestedPublications.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestedPublications.map((publication) => {
                const selected = data.selectedAutomationScenarioIds.includes(publication.id);
                return (
                  <button
                    key={publication.id}
                    type="button"
                    onClick={() => togglePublication(publication.id)}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                        {publication.icon ?? "⚡"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{publication.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {publication.description ?? "Publication automatique IA proposée pour ce profil."}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
                          {selected ? "Sélectionnée" : "Sélectionner"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Aucune publication automatique IA n&apos;a encore été définie pour ce profil.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black text-slate-900">Choisissez votre mode de départ</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Vous pourrez modifier ce choix après l&apos;onboarding depuis la facturation.
              </p>
            </div>
            {billingConfig && (
              <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                Offre lancement jusqu&apos;au {new Date(`${billingConfig.launchEndsAt}T12:00:00`).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => updateData({ billingChoice: "free" })}
              className={cn(
                "rounded-2xl border-2 p-4 text-left transition",
                data.billingChoice === "free"
                  ? "border-slate-900 bg-slate-50 ring-2 ring-slate-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <p className="font-black text-slate-950">Gratuit</p>
              <p className="mt-1 text-2xl font-black text-slate-950">0 €</p>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                {[
                  "Tableau de bord et aperçu",
                  "1 affiche modifiable",
                  "1 publication sociale",
                  "1 automatisation IA",
                  "20 messages assistant IA",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    {item}
                  </p>
                ))}
                {["WhatsApp bloqué", "Affiches illimitées bloquées"].map((item) => (
                  <p key={item} className="flex items-center gap-2 text-slate-400">
                    <X className="size-3.5" />
                    {item}
                  </p>
                ))}
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateData({ billingChoice: "paid" })}
              className={cn(
                "rounded-2xl border-2 p-4 text-left transition",
                data.billingChoice === "paid"
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-blue-100 bg-white hover:border-blue-200"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">Payant</p>
                  {billingConfig ? (
                    <div className="mt-1 flex flex-wrap items-end gap-2">
                      <span className="text-sm font-bold text-slate-400 line-through">
                        {(billingConfig.basePriceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT
                      </span>
                      <span className="text-2xl font-black text-blue-700">
                        {(billingConfig.launchPriceCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT
                      </span>
                      <span className="text-xs font-semibold text-slate-500">/ mois</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-2xl font-black text-blue-700">9,99 € HT / mois</p>
                  )}
                </div>
                <Lock className="size-5 text-blue-600" />
              </div>
              {billingConfig && <p className="mt-2 text-xs font-semibold text-blue-700">{billingConfig.launchMessage}</p>}
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                {[
                  "WhatsApp débloqué",
                  "Affiches sans limite",
                  "Publications sociales sans limite",
                  "Automatisations IA sans limite",
                  "Assistant IA sans limite",
                ].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-500" />
                    {item}
                  </p>
                ))}
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
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
