"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import {
  Building2, MapPin, ChevronDown, ChevronRight,
  Image as ImageIcon, Loader2, Upload,
} from "lucide-react";
import { isSupportedCountry, SUPPORTED_COUNTRIES } from "@/lib/community/countries";
import { useLocale } from "next-intl";

const optionalInputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

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
  const [contactsOpen, setContactsOpen] = useState(false);
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
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl"><Building2 className="size-5 text-blue-600" />{he ? "הארגון שלכם" : "Votre structure"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">
            {he ? "שם הארגון" : "Nom de votre structure"} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.communityName}
            onChange={(e) => updateData({ communityName: e.target.value })}
            placeholder={he ? "לדוגמה: בית חב״ד פריז" : "Ex. Beth Habad Paris"}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-700">
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

        {/* Logo: a small, discreet row. */}
        <div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-200 px-3 py-2 transition hover:border-blue-300 hover:bg-blue-50/40">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoUrl} alt={he ? "לוגו הארגון" : "Logo de votre structure"} className="h-full w-full object-contain p-1" />
              ) : (
                <ImageIcon className="size-4 text-slate-400" />
              )}
            </span>
            <span className="flex-1 text-sm text-slate-600">{he ? "לוגו" : "Logo"} <span className="text-xs text-slate-400">({he ? "רשות" : "facultatif"})</span></span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
              {logoUploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {logoUploading ? (he ? "מעלה..." : "Envoi…") : data.logoUrl ? (he ? "החלפה" : "Changer") : (he ? "הוספה" : "Ajouter")}
            </span>
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
          {logoError && (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{logoError}</p>
          )}
        </div>

        {/* Optional contacts stay folded until the user asks for them. */}
        <div>
          <button
            type="button"
            onClick={() => setContactsOpen((open) => !open)}
            aria-expanded={contactsOpen}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronDown className={`size-3.5 transition-transform ${contactsOpen ? "rotate-180" : ""}`} />
            {he ? "פרטי קשר (רשות)" : "Contact (facultatif)"}
          </button>
          {contactsOpen && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="tel" value={data.phone} onChange={(e) => updateData({ phone: e.target.value })} placeholder={he ? "טלפון" : "Téléphone"} aria-label={he ? "טלפון" : "Téléphone"} className={optionalInputClass} />
              <input type="email" value={data.email} onChange={(e) => updateData({ email: e.target.value })} placeholder={he ? "אימייל ציבורי" : "Email public"} aria-label={he ? "אימייל ציבורי" : "Email public"} className={optionalInputClass} />
              <input type="url" value={data.website} onChange={(e) => updateData({ website: e.target.value })} placeholder={he ? "אתר" : "Site web"} aria-label={he ? "אתר" : "Site web"} className={optionalInputClass} />
              <input type="url" value={data.donationUrl} onChange={(e) => updateData({ donationUrl: e.target.value })} placeholder={he ? "עמוד תרומות" : "Page de dons"} aria-label={he ? "עמוד תרומות" : "Page de dons"} className={optionalInputClass} />
            </div>
          )}
        </div>

        <div className="pt-1">
          <Button
            onClick={handleContinue}
            disabled={(!simulationMode && !isValid) || continuing}
            size="lg"
            className="w-full"
          >
            {continuing ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="rtl-mirror size-4" />}
            {he ? "כניסה ל־EasyCom IA" : "Accéder à EasyCom IA"}
          </Button>
          {!simulationMode && !isValid && (
            <p className="mt-2 text-center text-xs text-slate-400">
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
