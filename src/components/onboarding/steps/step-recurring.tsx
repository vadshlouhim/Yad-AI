"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import {
  Calendar, ChevronRight, ChevronLeft, Plus, X,
  Users, BookOpen, Star, Mail, Heart, Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const DAYS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

const SUGGESTED_RECURRING = [
  {
    title: "Réunion hebdomadaire",
    category: "MEETING",
    icon: Users,
    dayOfWeek: 1,
    freq: "Chaque semaine · Lundi",
    accent: "bg-blue-50 border-blue-200 text-blue-700",
    iconColor: "text-blue-600 bg-blue-100",
  },
  {
    title: "Cours / Atelier régulier",
    category: "COURSE",
    icon: BookOpen,
    dayOfWeek: 3,
    freq: "Chaque semaine · Mercredi",
    accent: "bg-amber-50 border-amber-200 text-amber-700",
    iconColor: "text-amber-600 bg-amber-100",
  },
  {
    title: "Activités jeunesse",
    category: "YOUTH",
    icon: Star,
    dayOfWeek: 0,
    freq: "Chaque semaine · Dimanche",
    accent: "bg-pink-50 border-pink-200 text-pink-700",
    iconColor: "text-pink-600 bg-pink-100",
  },
  {
    title: "Newsletter mensuelle",
    category: "NEWSLETTER",
    icon: Mail,
    dayOfWeek: undefined,
    freq: "1× par mois",
    accent: "bg-indigo-50 border-indigo-200 text-indigo-700",
    iconColor: "text-indigo-600 bg-indigo-100",
  },
  {
    title: "Collecte / Appel aux dons",
    category: "FUNDRAISING",
    icon: Heart,
    dayOfWeek: undefined,
    freq: "Ponctuel",
    accent: "bg-rose-50 border-rose-200 text-rose-700",
    iconColor: "text-rose-600 bg-rose-100",
  },
  {
    title: "Communication mensuelle",
    category: "EVENT",
    icon: Megaphone,
    dayOfWeek: undefined,
    freq: "1× par mois",
    accent: "bg-emerald-50 border-emerald-200 text-emerald-700",
    iconColor: "text-emerald-600 bg-emerald-100",
  },
];

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
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-xl">Événements récurrents</CardTitle>
          <span className="text-xs font-medium text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Facultatif</span>
        </div>
        <CardDescription>
          Sélectionnez vos rendez-vous réguliers. L&apos;IA préparera automatiquement les contenus associés avant chaque occurrence.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Suggestions */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Suggestions fréquentes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTED_RECURRING.map((item) => {
              const added = isSuggestionAdded(item.title);
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => added ? removeEvent(item.title) : addSuggested(item)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                    added
                      ? "border-purple-600 bg-purple-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    added ? "bg-purple-100 text-purple-600" : item.iconColor
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      added ? "text-purple-700" : "text-slate-700"
                    )}>
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.freq}</p>
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

        {/* Événements sélectionnés */}
        {data.recurringEvents.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Sélectionnés ({data.recurringEvents.length})
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              {data.recurringEvents.map((event) => (
                <div
                  key={event.title}
                  className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-slate-100"
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
                    className="text-slate-400 hover:text-red-500 transition-colors ml-3"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
