"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { Pen, ChevronRight, ChevronLeft, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const TONES = [
  { value: "MODERN", label: "Moderne & dynamique", desc: "Engageant, accessible, contemporain", emoji: "⚡" },
  { value: "TRADITIONAL", label: "Traditionnel", desc: "Respectueux, sobre, classique", emoji: "📜" },
  { value: "FRIENDLY", label: "Chaleureux & convivial", desc: "Proche, bienveillant, familier", emoji: "🤗" },
  { value: "FORMAL", label: "Formel & institutionnel", desc: "Sérieux, professionnel, officiel", emoji: "🏛️" },
  { value: "RELIGIOUS", label: "Religieux & spirituel", desc: "Inspirant, profond, communautaire", emoji: "✡️" },
];

const SUGGESTED_HASHTAGS = [
  "#communaute", "#shabbat", "#judaisme", "#torahlearning",
  "#fetesjuives", "#evenement", "#cours", "#paris",
];

export function StepEditorial({ data, updateData, onNext, onPrev }: Props) {
  const [hashtagInput, setHashtagInput] = useState("");

  function addHashtag(tag: string) {
    const cleaned = tag.startsWith("#") ? tag : `#${tag}`;
    if (!data.hashtags.includes(cleaned)) {
      updateData({ hashtags: [...data.hashtags, cleaned] });
    }
    setHashtagInput("");
  }

  function removeHashtag(tag: string) {
    updateData({ hashtags: data.hashtags.filter((h) => h !== tag) });
  }

  function handleHashtagKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === ",") && hashtagInput.trim()) {
      e.preventDefault();
      addHashtag(hashtagInput.trim());
    }
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3">
          <Pen className="size-6 text-amber-600" />
        </div>
        <CardTitle className="text-xl">Identité éditoriale</CardTitle>
        <CardDescription>
          Définissez le ton et les règles que l&apos;IA appliquera à tous vos contenus.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Ton de communication */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Ton de communication <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {TONES.map((tone) => (
              <button
                key={tone.value}
                type="button"
                onClick={() => updateData({ tone: tone.value })}
                className={cn(
                  "w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-all",
                  data.tone === tone.value
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <span className="text-2xl">{tone.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    data.tone === tone.value ? "text-blue-700" : "text-slate-800"
                  )}>
                    {tone.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{tone.desc}</p>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all",
                  data.tone === tone.value
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-300"
                )}>
                  {data.tone === tone.value && (
                    <div className="w-full h-full rounded-full bg-white scale-50" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Signature */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Signature de fin de publication
          </label>
          <input
            type="text"
            value={data.signature}
            onChange={(e) => updateData({ signature: e.target.value })}
            placeholder="Ex. L'équipe du Beth Habad de Paris 16 🕍"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <p className="text-xs text-slate-400">Sera ajoutée automatiquement à la fin de chaque post.</p>
        </div>

        {/* Hashtags */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Hashtags habituels</label>
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
            {/* Tags ajoutés */}
            {data.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 text-xs px-3 py-1 font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeHashtag(tag)}
                      className="hover:text-blue-900"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={handleHashtagKeyDown}
                placeholder="Tapez un hashtag + Entrée"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => hashtagInput.trim() && addHashtag(hashtagInput.trim())}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {/* Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_HASHTAGS
                .filter((s) => !data.hashtags.includes(s))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addHashtag(tag)}
                    className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-full px-2.5 py-0.5 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Règles éditoriales */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Règles éditoriales spéciales
          </label>
          <textarea
            value={data.editorialRules}
            onChange={(e) => updateData({ editorialRules: e.target.value })}
            placeholder={`Ex. — Toujours mentionner l'adresse complète dans les posts d'événements\n— Ne jamais publier le vendredi soir (Chabbat)\n— Toujours ajouter une phrase en hébreu pour les fêtes`}
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
          <p className="text-xs text-slate-400">
            L&apos;IA respectera ces règles lors de chaque génération de contenu.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="lg" onClick={onPrev} className="flex-shrink-0">
            <ChevronLeft className="size-4" />
            Retour
          </Button>
          <Button size="lg" className="flex-1" onClick={onNext}>
            Continuer
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
