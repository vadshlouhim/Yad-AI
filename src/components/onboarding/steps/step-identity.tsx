"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import {
  Building2, MapPin, Phone, Mail, Globe, ChevronRight,
  Heart, Landmark, GraduationCap, Trophy, Palette,
  Briefcase, Home, BookOpen, Wifi, Users, Layers,
  Image as ImageIcon, Loader2, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
  simulationMode?: boolean;
}

const COMMUNITY_TYPES = [
  { value: "ASSOCIATION", label: "Association / ONG", icon: Heart, accent: "text-rose-600 bg-rose-50 border-rose-200" },
  { value: "RELIGIOUS", label: "Lieu de culte", icon: Landmark, accent: "text-purple-600 bg-purple-50 border-purple-200" },
  { value: "SCHOOL", label: "École / Formation", icon: GraduationCap, accent: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "SPORT", label: "Sport & Loisirs", icon: Trophy, accent: "text-orange-600 bg-orange-50 border-orange-200" },
  { value: "CULTURE", label: "Culture & Arts", icon: Palette, accent: "text-pink-600 bg-pink-50 border-pink-200" },
  { value: "PROFESSIONAL", label: "Réseau professionnel", icon: Briefcase, accent: "text-slate-700 bg-slate-100 border-slate-200" },
  { value: "LOCAL", label: "Quartier / Local", icon: Home, accent: "text-green-600 bg-green-50 border-green-200" },
  { value: "STUDENT", label: "Étudiants / Campus", icon: BookOpen, accent: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { value: "ONLINE", label: "Communauté en ligne", icon: Wifi, accent: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  { value: "CENTER", label: "Centre communautaire", icon: Users, accent: "text-teal-600 bg-teal-50 border-teal-200" },
  { value: "OTHER", label: "Autre", icon: Layers, accent: "text-slate-500 bg-white border-slate-200" },
];

export function StepIdentity({ data, updateData, onNext, simulationMode = false }: Props) {
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const isValid = data.communityName.trim().length >= 2 && data.city.trim().length >= 2;

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setLogoError(null);

    try {
      if (simulationMode) {
        updateData({ logoUrl: URL.createObjectURL(file) });
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads/community-logo", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        setLogoError(result.error ?? "Impossible de téléverser le logo.");
        return;
      }

      updateData({ logoUrl: result.logoUrl });
    } catch {
      setLogoError("Impossible de téléverser le logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
          <Building2 className="size-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Identité de votre communauté</CardTitle>
        <CardDescription>
          Ces informations permettent à l&apos;IA de personnaliser tous vos contenus automatiquement.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Nom de la communauté <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.communityName}
            onChange={(e) => updateData({ communityName: e.target.value })}
            placeholder="Ex. Association Sportive de Bordeaux"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {data.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.logoUrl} alt="Logo de la communauté" className="h-full w-full object-contain p-2" />
                ) : (
                  <ImageIcon className="size-7 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Logo de la communauté</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Ajoutez votre logo pour personnaliser vos contenus et votre espace.
                </p>
              </div>
            </div>

            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {logoUploading ? "Téléversement..." : simulationMode ? "Simuler un logo" : "Choisir un logo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={logoUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadLogo(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {logoError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {logoError}
            </p>
          )}
        </div>

        {/* Type de communauté */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Quel type de communauté êtes-vous ?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMMUNITY_TYPES.map(({ value, label, icon: Icon, accent }) => {
              const selected = data.communityType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateData({ communityType: value, isBethHabad: value === "RELIGIOUS" ? data.isBethHabad : false })}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-all",
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                    selected ? "bg-blue-100 border-blue-200 text-blue-600" : accent
                  )}>
                    <Icon className="size-3.5" />
                  </div>
                  <span className="leading-tight text-xs sm:text-sm">{label}</span>
                </button>
              );
            })}
          </div>
          {data.communityType === "RELIGIOUS" && (
            <label className="mt-3 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={data.isBethHabad}
                onChange={(event) => updateData({ isBethHabad: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span className="font-semibold">בס״ד</span>
              <span className="text-xs text-slate-500">Identifier ce lieu de culte comme Beth Habad</span>
            </label>
          )}
        </div>

        {/* Description — clé pour l'IA */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2 flex-wrap">
            Décrivez votre communauté en une phrase
            <span className="text-xs font-normal text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">
              Facultatif — recommandé
            </span>
          </label>
          <textarea
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="Ex. Club de football de 150 membres proposant des entraînements et tournois pour adultes et enfants à Lyon."
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
          <p className="text-xs text-slate-400">
            Cette phrase aide l&apos;IA à personnaliser vos contenus avec précision.
          </p>
        </div>

        {/* Localisation */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
              <MapPin className="size-3.5 text-slate-400" />
              Ville <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => updateData({ city: e.target.value })}
              placeholder="Paris"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Pays</label>
            <select
              value={data.country}
              onChange={(e) => updateData({ country: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="France">France</option>
              <option value="Belgium">Belgique</option>
              <option value="Switzerland">Suisse</option>
              <option value="Canada">Canada</option>
              <option value="Luxembourg">Luxembourg</option>
              <option value="Other">Autre</option>
            </select>
          </div>
        </div>

        {/* Contacts — facultatif */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            Contacts
            <span className="text-xs font-normal text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Facultatif</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Phone className="size-3" /> Téléphone
              </p>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => updateData({ phone: e.target.value })}
                placeholder="+33 1 23 45 67 89"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Mail className="size-3" /> Email public
              </p>
              <input
                type="email"
                value={data.email}
                onChange={(e) => updateData({ email: e.target.value })}
                placeholder="contact@macommunaute.fr"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Globe className="size-3" /> Site web
            </p>
            <input
              type="url"
              value={data.website}
              onChange={(e) => updateData({ website: e.target.value })}
              placeholder="https://www.macommunaute.fr"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="pt-2">
          <Button onClick={onNext} disabled={!simulationMode && !isValid} size="lg" className="w-full">
            Continuer
            <ChevronRight className="size-4" />
          </Button>
          {!simulationMode && !isValid && (
            <p className="text-xs text-slate-400 text-center mt-2">
              Renseignez le nom et la ville pour continuer.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
