"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { Pen, ChevronRight, ChevronLeft, X, Plus, Zap, Bookmark, Smile, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const TONES = [
  {
    value: "MODERN",
    label: "Moderne & dynamique",
    desc: "Engageant, accessible, contemporain",
    icon: Zap,
    accent: "text-blue-600 bg-blue-50",
  },
  {
    value: "TRADITIONAL",
    label: "Traditionnel & classique",
    desc: "Respectueux, sobre, structuré",
    icon: Bookmark,
    accent: "text-amber-600 bg-amber-50",
  },
  {
    value: "FRIENDLY",
    label: "Chaleureux & convivial",
    desc: "Proche, bienveillant, familier",
    icon: Smile,
    accent: "text-emerald-600 bg-emerald-50",
  },
  {
    value: "FORMAL",
    label: "Formel & institutionnel",
    desc: "Sérieux, professionnel, officiel",
    icon: Shield,
    accent: "text-slate-700 bg-slate-100",
  },
  {
    value: "RELIGIOUS",
    label: "Inspirant & porteur de sens",
    desc: "Profond, motivant, engagé",
    icon: Sparkles,
    accent: "text-purple-600 bg-purple-50",
  },
];

const SUGGESTED_HASHTAGS = [
  "#communaute", "#evenement", "#agenda", "#actu",
  "#formation", "#rencontre", "#ensemble", "#local",
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
        <CardTitle className="text-xl">Style de communication</CardTitle>
        <CardDescription>
          Aidez l&apos;IA à comprendre votre ton pour créer des contenus qui vous ressemblent.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Ton de communication */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Ton de communication <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {TONES.map(({ value, label, desc, icon: Icon, accent }) => {
              const selected = data.tone === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateData({ tone: value })}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-all",
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    selected ? "bg-blue-100 text-blue-600" : accent
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      selected ? "text-blue-700" : "text-slate-800"
                    )}>
                      {label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all",
                    selected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                  )}>
                    {selected && <div className="w-full h-full rounded-full bg-white scale-50" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Langue */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Langue des publications</label>
          <select
            value={data.language}
            onChange={(e) => updateData({ language: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
            <option value="es">Espagnol</option>
            <option value="de">Allemand</option>
            <option value="ar">Arabe</option>
            <option value="he">Hébreu</option>
            <option value="pt">Portugais</option>
          </select>
        </div>

        {/* Signature - facultatif */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            Signature de fin de publication
            <span className="text-xs font-normal text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Facultatif</span>
          </label>
          <input
            type="text"
            value={data.signature}
            onChange={(e) => updateData({ signature: e.target.value })}
            placeholder={`Ex. L'équipe de ${data.communityName || "votre structure"}`}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <p className="text-xs text-slate-400">Ajoutée automatiquement à la fin de chaque publication.</p>
        </div>

        {/* Hashtags - facultatif */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            Hashtags habituels
            <span className="text-xs font-normal text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Facultatif</span>
          </label>
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
            {data.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 text-xs px-3 py-1 font-medium"
                  >
                    {tag}
                    <button type="button" onClick={() => removeHashtag(tag)} className="hover:text-blue-900">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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

        {/* Règles éditoriales - facultatif */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            Règles éditoriales
            <span className="text-xs font-normal text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Facultatif</span>
          </label>
          <textarea
            value={data.editorialRules}
            onChange={(e) => updateData({ editorialRules: e.target.value })}
            placeholder={`Ex. - Toujours mentionner l'adresse dans les posts d'événements\n- Utiliser un ton inclusif et bienveillant\n- Ajouter systématiquement un lien vers notre site`}
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


