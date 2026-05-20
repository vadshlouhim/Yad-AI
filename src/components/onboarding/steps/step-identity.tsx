"use client";

import { useEffect, useState } from "react";
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
  { value: "SYNAGOGUE", label: "Synagogue", icon: "Syn." },
  { value: "ASSOCIATION", label: "Association", icon: "Asso." },
  { value: "SCHOOL", label: "École / Yeshiva", icon: "Édu." },
  { value: "CENTER", label: "Centre communautaire", icon: "Ctr." },
  { value: "OTHER", label: "Autre", icon: "Autre" },
];

interface CommunityRhythm {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export function StepIdentity({ data, updateData, onNext }: Props) {
  const [remoteRhythms, setRemoteRhythms] = useState<CommunityRhythm[]>([]);
  const rhythms = remoteRhythms;
  const selectedRhythm = rhythms.find((rhythm) => rhythm.id === data.rhythmId);
  const isOtherRhythm = selectedRhythm?.slug === "autre";
  const requiresRhythm = data.communityType === "SYNAGOGUE";
  const hasRhythm = !requiresRhythm || Boolean(data.rhythmId);
  const hasOtherPrecision = !requiresRhythm || !isOtherRhythm || data.rhythmOther.trim().length >= 2;
  const isValid = data.communityName.trim().length >= 2 && data.city.trim().length >= 2 && hasRhythm && hasOtherPrecision;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/community/rhythms")
      .then((response) => (response.ok ? response.json() : []))
      .then((items: CommunityRhythm[]) => {
        if (!cancelled) setRemoteRhythms(items);
      })
      .catch(() => {
        if (!cancelled) setRemoteRhythms([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function selectCommunityType(value: string) {
    updateData({
      communityType: value,
      ...(value === "SYNAGOGUE" ? {} : { rhythmId: "", rhythmOther: "", religiousStream: "" }),
    });
  }

  function selectRhythm(rhythmId: string) {
    const rhythm = rhythms.find((item) => item.id === rhythmId);
    updateData({
      rhythmId,
      religiousStream: rhythm?.slug === "autre" ? data.rhythmOther : rhythm?.name ?? "",
    });
  }

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
                onClick={() => selectCommunityType(type.value)}
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
        <div className={data.communityType === "SYNAGOGUE" ? "space-y-1.5" : "hidden"}>
          <label className="text-sm font-medium text-slate-700">
            Quel est le rythme ou le style de votre communauté ? <span className="text-red-500">*</span>
          </label>
          <select
            value={data.rhythmId}
            onChange={(e) => selectRhythm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Sélectionner un rythme</option>
            {rhythms.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {isOtherRhythm && (
            <input
              type="text"
              value={data.rhythmOther}
              onChange={(event) => updateData({ rhythmOther: event.target.value, religiousStream: event.target.value })}
              placeholder="Précisez le rythme de votre communauté"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          )}
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
              Renseignez au minimum le nom, la ville et le rythme de la communauté pour continuer.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
