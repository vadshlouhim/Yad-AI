"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { Calendar, ChevronRight, ChevronLeft, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const SUGGESTED_RECURRING = [
  { title: "Chabbat hebdomadaire", category: "SHABBAT", icon: "🕯️", dayOfWeek: 5 },
  { title: "Cours de Torah du soir", category: "COURSE", icon: "📖", dayOfWeek: 2 },
  { title: "Prière du matin", category: "PRAYER", icon: "🙏", dayOfWeek: undefined },
  { title: "Activités jeunesse", category: "YOUTH", icon: "🎉", dayOfWeek: 0 },
  { title: "Cours pour femmes", category: "COURSE", icon: "✨", dayOfWeek: 4 },
  { title: "Collecte mensuelle", category: "FUNDRAISING", icon: "💛", dayOfWeek: undefined },
];

const DAYS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

export function StepRecurring({ data, updateData, onNext, onPrev }: Props) {
  function addSuggested(item: typeof SUGGESTED_RECURRING[0]) {
    const exists = data.recurringEvents.some((e) => e.title === item.title);
    if (!exists) {
      updateData({
        recurringEvents: [
          ...data.recurringEvents,
          { title: item.title, category: item.category, dayOfWeek: item.dayOfWeek },
        ],
      });
    }
  }

  function removeEvent(title: string) {
    updateData({
      recurringEvents: data.recurringEvents.filter((e) => e.title !== title),
    });
  }

  function isSuggestionAdded(title: string) {
    return data.recurringEvents.some((e) => e.title === title);
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-3">
          <Calendar className="size-6 text-purple-600" />
        </div>
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl">Événements récurrents</CardTitle>
          <span className="text-xs font-medium text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Facultatif</span>
        </div>
        <CardDescription>
          Ces événements seront automatiquement planifiés dans votre calendrier.
          L&apos;IA génèrera les contenus associés avant chaque occurrence.
          Vous pouvez passer cette étape et y revenir plus tard depuis les paramètres.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Suggestions rapides */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Suggestions fréquentes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTED_RECURRING.map((item) => {
              const added = isSuggestionAdded(item.title);
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => added ? removeEvent(item.title) : addSuggested(item)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                    added
                      ? "border-purple-600 bg-purple-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <span className="text-xl">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      added ? "text-purple-700" : "text-slate-700"
                    )}>
                      {item.title}
                    </p>
                    {item.dayOfWeek !== undefined && (
                      <p className="text-xs text-slate-400">
                        {DAYS[item.dayOfWeek]}
                      </p>
                    )}
                  </div>
                  {added ? (
                    <X className="size-4 text-purple-600 flex-shrink-0" />
                  ) : (
                    <Plus className="size-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Événements ajoutés */}
        {data.recurringEvents.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Événements sélectionnés ({data.recurringEvents.length})
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              {data.recurringEvents.map((event) => (
                <div
                  key={event.title}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">{event.title}</p>
                    {event.dayOfWeek !== undefined && (
                      <p className="text-xs text-slate-400">{DAYS[event.dayOfWeek]}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEvent(event.title)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>💡 Note :</strong> Le calendrier hébraïque (Chabbat, fêtes, parasha)
            est automatiquement intégré. Vous n&apos;avez pas besoin de l&apos;ajouter ici.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="lg" onClick={onPrev} className="flex-shrink-0">
            <ChevronLeft className="size-4" />
            Retour
          </Button>
          <Button size="lg" className="flex-1" onClick={onNext}>
            Finaliser
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
        >
          Passer cette étape, je le ferai plus tard →
        </button>
      </CardContent>
    </Card>
  );
}
