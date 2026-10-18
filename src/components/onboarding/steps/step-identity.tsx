"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import {
  Building2, MapPin, Phone, Mail, Globe, HandHeart, ChevronRight,
  Image as ImageIcon, Loader2, Upload,
} from "lucide-react";
import { isSupportedCountry, SUPPORTED_COUNTRIES } from "@/lib/community/countries";
import { useLocale } from "next-intl";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
  simulationMode?: boolean;
}

export function StepIdentity({ data, updateData, onNext, simulationMode = false }: Props) {
  const he = useLocale() === "he";
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);
  const isValid = data.communityName.trim().length >= 2
    && data.city.trim().length >= 2
    && isSupportedCountry(data.country);

  async function handleContinue() {
    setContinueError(null);
    setContinuing(true);
    try {
      await onNext();
    } catch (error) {
      setContinueError(error instanceof Error ? error.message : (he ? "לא ניתן לשמור את הפרטים. נסו שוב." : "Impossible d'enregistrer vos informations, réessayez."));
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
        setLogoError(result.error ?? (he ? "לא ניתן להעלות את הלוגו." : "Impossible de téléverser le logo."));
        return;
      }

      updateData({ logoUrl: result.logoUrl });
    } catch {
      setLogoError(he ? "לא ניתן להעלות את הלוגו." : "Impossible de téléverser le logo.");
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
        <CardTitle className="text-xl">{he ? "זהות הארגון שלכם" : "Identité de votre structure"}</CardTitle>
        <CardDescription>
          {he ? "הפרטים האלה עוזרים ל־EasyCom IA להכיר את הארגון ולהתאים את התוכן באופן אוטומטי." : "Ces informations permettent à EasyCom IA de comprendre votre identité et de personnaliser vos contenus automatiquement."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* Nom */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            {he ? "שם הארגון" : "Nom de votre structure"} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.communityName}
            onChange={(e) => updateData({ communityName: e.target.value })}
            placeholder={he ? "לדוגמה: בית חב״ד פריז" : "Ex. Association Sportive de Bordeaux"}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {data.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.logoUrl} alt={he ? "לוגו הארגון" : "Logo de votre structure"} className="h-full w-full object-contain p-2" />
                ) : (
                  <ImageIcon className="size-7 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{he ? "לוגו הארגון" : "Logo votre structure"}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {he ? "הוסיפו לוגו כדי להתאים את התוכן והמרחב שלכם." : "Ajoutez votre logo pour personnaliser vos contenus et votre espace."}
                </p>
              </div>
            </div>

            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
              {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {logoUploading ? (he ? "מעלה..." : "Téléversement...") : simulationMode ? (he ? "הדמיית לוגו" : "Simuler un logo") : (he ? "בחירת לוגו" : "Choisir un logo")}
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
              {he ? "עיר" : "Ville"} <span className="text-red-500">*</span>
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
            <label className="text-sm font-medium text-slate-700">
              {he ? "מדינה" : "Pays"} <span className="text-red-500">*</span>
            </label>
            <select
              value={data.country}
              onChange={(e) => updateData({ country: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {SUPPORTED_COUNTRIES.map((country) => (
                <option key={country.code} value={country.value}>{country.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contacts - facultatif */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            {he ? "פרטי קשר" : "Contacts"}
            <span className="text-xs font-normal text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">{he ? "רשות" : "Facultatif"}</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Phone className="size-3" /> {he ? "טלפון" : "Téléphone"}
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
                <Mail className="size-3" /> {he ? "אימייל ציבורי" : "Email public"}
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
              <Globe className="size-3" /> {he ? "אתר" : "Site web"}
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
              <HandHeart className="size-3" /> {he ? "עמוד תרומות" : "Page de dons"}
            </p>
            <input
              type="url"
              value={data.donationUrl}
              onChange={(e) => updateData({ donationUrl: e.target.value })}
              placeholder="https://allodons.fr/votre-structure"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-xs leading-5 text-slate-400">{he ? "הקישור יוצע אוטומטית בעלון השבת המודפס." : "Il sera proposé automatiquement dans votre Newsletter Papier Chabbat."}</p>
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
            {continuing ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="rtl-mirror size-4" />}
            {he ? "המשך" : "Continuer"}
          </Button>
          {!simulationMode && !isValid && (
            <p className="text-xs text-slate-400 text-center mt-2">
              {he ? "הזינו שם ועיר כדי להמשיך." : "Renseignez le nom et la ville pour continuer."}
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


