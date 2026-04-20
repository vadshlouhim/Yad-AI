"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { Building2, MapPin, Phone, Mail, Globe, ChevronRight } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const COMMUNITY_TYPES = [
  { value: "SYNAGOGUE", label: "Synagogue", icon: "🕍" },
  { value: "ASSOCIATION", label: "Association", icon: "🤝" },
  { value: "SCHOOL", label: "École / Yeshiva", icon: "📚" },
  { value: "CENTER", label: "Centre communautaire", icon: "🏛️" },
  { value: "OTHER", label: "Autre", icon: "✨" },
];

const RELIGIOUS_STREAMS = [
  "Ashkénaze", "Séfarade", "Mixte", "Loubavitch / Beth Habad",
  "Massorti", "Réformé", "Orthodoxe Moderne", "Autre",
];

export function StepIdentity({ data, updateData, onNext }: Props) {
  const isValid = data.communityName.trim().length >= 2 && data.city.trim().length >= 2;

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
          <Building2 className="size-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Identité de votre communauté</CardTitle>
        <CardDescription>
          Ces informations seront utilisées par l&apos;IA pour personnaliser tous vos contenus.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Nom de la communauté */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Nom de la communauté <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.communityName}
            onChange={(e) => updateData({ communityName: e.target.value })}
            placeholder="Ex. Beth Habad de Paris 16"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Type de communauté */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Type de structure</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COMMUNITY_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => updateData({ communityType: type.value })}
                className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm transition-all ${
                  data.communityType === type.value
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span>{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Courant religieux */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Courant / Tradition</label>
          <select
            value={data.religiousStream}
            onChange={(e) => updateData({ religiousStream: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Sélectionner (optionnel)</option>
            {RELIGIOUS_STREAMS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Localisation */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              <MapPin className="size-3.5 inline mr-1" />
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
              <option value="Israel">Israël</option>
              <option value="Other">Autre</option>
            </select>
          </div>
        </div>

        {/* Contacts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              <Phone className="size-3.5 inline mr-1" />Téléphone
            </label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => updateData({ phone: e.target.value })}
              placeholder="+33 1 23 45 67 89"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              <Mail className="size-3.5 inline mr-1" />Email public
            </label>
            <input
              type="email"
              value={data.email}
              onChange={(e) => updateData({ email: e.target.value })}
              placeholder="contact@macommunaute.fr"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            <Globe className="size-3.5 inline mr-1" />Site web
          </label>
          <input
            type="url"
            value={data.website}
            onChange={(e) => updateData({ website: e.target.value })}
            placeholder="https://www.macommunaute.fr"
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Navigation */}
        <div className="pt-2">
          <Button
            onClick={onNext}
            disabled={!isValid}
            size="lg"
            className="w-full"
          >
            Continuer
            <ChevronRight className="size-4" />
          </Button>
          {!isValid && (
            <p className="text-xs text-slate-400 text-center mt-2">
              Renseignez au minimum le nom et la ville pour continuer.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
