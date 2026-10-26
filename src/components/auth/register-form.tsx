"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPublicToolDestination, getToolOnboardingPath } from "@/lib/public-tools";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  DEFAULT_COUNTRY,
  isSupportedCountry,
  normalizeSupportedCountry,
  SUPPORTED_COUNTRIES,
  type SupportedCountry,
  withRegistrationCountry,
} from "@/lib/community/countries";
import {
  buildAuthCallbackUrl,
  DEFAULT_POST_REGISTER_PATH,
} from "@/lib/supabase/auth-redirect";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, Globe, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const he = locale === "he";
  const searchParams = useSearchParams();
  const toolDestination = getPublicToolDestination(searchParams.get("callbackUrl"));
  const onboardingPath = getToolOnboardingPath(toolDestination);
  const [country, setCountry] = useState<SupportedCountry>(DEFAULT_COUNTRY);
  const registrationPath = withRegistrationCountry(onboardingPath, country);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabaseConfigured = isSupabaseConfigured();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupportedCountry(country)) {
      setError(he ? "בחרו מדינה תקינה." : "Veuillez sélectionner un pays valide.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError(he ? "הסיסמה חייבת להכיל לפחות 8 תווים." : "Le mot de passe doit contenir au moins 8 caractères.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        name,
        email,
        password,
        country,
        locale: he ? "he" : "fr",
        nextPath: registrationPath,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null) as
        | { error?: string }
        | null;
      if (payload?.error === "rate_limited") {
        setError(he ? "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." : "Trop de tentatives. Veuillez réessayer dans quelques minutes.");
      } else if (payload?.error === "email_delivery_failed") {
        setError(he ? "לא ניתן היה לשלוח את האימייל. נסו שוב." : "L’email de confirmation n’a pas pu être envoyé. Veuillez réessayer.");
      } else {
        setError(he ? "אירעה שגיאה. נסו שוב." : "Une erreur est survenue. Veuillez réessayer.");
      }
      setLoading(false);
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setError(null);
    if (!isSupportedCountry(country)) {
      setError(he ? "בחרו מדינה תקינה." : "Veuillez sélectionner un pays valide.");
      return;
    }
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl(
            window.location.origin,
            registrationPath,
            DEFAULT_POST_REGISTER_PATH
          ),
          queryParams: { prompt: "select_account" },
        },
      })
      .catch(() => ({
        error: new Error("Auth service unreachable"),
      }));
    if (error) {
      setError(he ? "לא ניתן להתחבר עם Google." : "Impossible de se connecter avec Google.");
      setGoogleLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold text-emerald-900">{t("checkEmail")}</h3>
        <p className="text-sm text-emerald-700">
          {he ? <>קישור אישור נשלח אל <strong><bdi dir="ltr">{email}</bdi></strong>. לחצו עליו כדי להפעיל את החשבון ולהתחיל.</> : <>Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte et démarrer l&apos;onboarding.</>}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!supabaseConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {he ? "הגדרת Supabase אינה תקינה." : <>Configuration Supabase invalide. Renseignez la vraie URL du projet dans <code>NEXT_PUBLIC_SUPABASE_URL</code>.</>}
        </div>
      )}

      <div className="space-y-1.5">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="register-country"
        >
          {he ? "מדינה" : "Pays"} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <select
            id="register-country"
            value={country}
            onChange={(event) =>
              setCountry(normalizeSupportedCountry(event.target.value))
            }
            required
            disabled={!supabaseConfigured || loading || googleLoading}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            {SUPPORTED_COUNTRIES.map((option) => (
              <option key={option.code} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogleLogin}
        loading={googleLoading}
        disabled={!supabaseConfigured}
      >
        <Globe className="size-4" />
        {t("google")}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 px-3 text-slate-400">{t("or")}</span>
        </div>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="name">
            {t("name")}
          </label>
          <div className="relative">
            <User className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={he ? "שם פרטי ומשפחה" : "Prénom Nom"}
              required
              autoComplete="name"
              disabled={!supabaseConfigured}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            {t("email")}
          </label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
              autoComplete="email"
              disabled={!supabaseConfigured}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            {t("password")}
          </label>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={he ? "לפחות 8 תווים" : "8 caractères minimum"}
              required
              autoComplete="new-password"
              disabled={!supabaseConfigured}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 ps-10 pe-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    password.length >= level * 2
                      ? password.length >= 10
                        ? "bg-emerald-500"
                        : "bg-amber-400"
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!supabaseConfigured}>
          {t("register")}
        </Button>

        <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-center text-sm font-semibold leading-6 text-violet-900">
          {t("trialReminder")}
        </p>

        <p className="text-xs text-slate-400 text-center leading-relaxed">
          {he ? "ביצירת חשבון אתם מסכימים ל" : "En créant un compte, vous acceptez nos"}{" "}
          <Link href="/legal/terms" className="text-[#6018ce] hover:underline">
            {he ? "תנאי השימוש" : "conditions d’utilisation"}
          </Link>{" "}
          {he ? " ול" : "et notre"}{" "}
          <Link href="/privacy" className="text-[#6018ce] hover:underline">
            {he ? "מדיניות הפרטיות" : "politique de confidentialité"}
          </Link>
          .
        </p>
      </form>

      <p className="text-center text-sm text-slate-500">
        {t("hasAccount")}{" "}
        <Link href={toolDestination ? `/auth/login?callbackUrl=${encodeURIComponent(toolDestination)}` : "/auth/login"} className="text-[#6018ce] hover:underline font-medium">
          {t("login")}
        </Link>
      </p>
    </div>
  );
}
