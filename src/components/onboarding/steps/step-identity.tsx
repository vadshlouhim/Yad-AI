"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import {
  Building2, MapPin, Phone, Mail, Globe, HandHeart, ChevronRight,
  Image as ImageIcon, Loader2, Upload,
} from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
  simulationMode?: boolean;
}

export function StepIdentity({ data, updateData, onNext, simulationMode = false }: Props) {
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);
  const isValid = data.communityName.trim().length >= 2 && data.city.trim().length >= 2;

  async function handleContinue() {
    setContinueError(null);
    setContinuing(true);
    try {
      await onNext();
    } catch {
      setContinueError("Impossible d'enregistrer vos informations, réessayez.");
    } finally {
      setContinuing(false);
    }
  }

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
    <Card className="border-blue-100 shadow-xl shadow-blue-100/70">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 flex items-center justify-center mb-3">
          <Building2 className="size-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl">Identité de votre structure</CardTitle>
        <CardDescription>
          Ces informations permettent à EasyCom IA de comprendre votre identité et de personnaliser vos contenus automatiquement.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            Nom de votre structure <span className="text-red-500">*</span>
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
                  <img src={data.logoUrl} alt="Logo de votre structure" className="h-full w-full object-contain p-2" />
                ) : (
                  <ImageIcon className="size-7 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Logo votre structure</p>
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

        {/* Contacts - facultatif */}
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
          <div className="space-y-1">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <HandHeart className="size-3" /> Page de dons
            </p>
            <input
              type="url"
              value={data.donationUrl}
              onChange={(e) => updateData({ donationUrl: e.target.value })}
              placeholder="https://allodons.fr/votre-structure"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-xs leading-5 text-slate-400">Il sera propose automatiquement dans votre Newsletter Papier Chabbat.</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="pt-2">
          <Button
            onClick={handleContinue}
            disabled={(!simulationMode && !isValid) || continuing}
            size="lg"
            className="w-full"
          >
            {continuing ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
            Continuer
          </Button>
          {!simulationMode && !isValid && (
            <p className="text-xs text-slate-400 text-center mt-2">
              Renseignez le nom et la ville pour continuer.
            </p>
          )}
          {continueError && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
              {continueError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


