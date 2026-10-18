"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildAuthCallbackUrl, normalizeAuthNextPath } from "@/lib/supabase/auth-redirect";
import { getPublicToolDestination, getToolOnboardingPath } from "@/lib/public-tools";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("auth");
  const he = useLocale() === "he";
  const router = useRouter();
  const searchParams = useSearchParams();
  const toolDestination = getPublicToolDestination(searchParams.get("callbackUrl"));
  const callbackUrl = toolDestination ? getToolOnboardingPath(toolDestination) : normalizeAuthNextPath(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseConfigured = isSupabaseConfigured();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth
      .signInWithPassword({
        email,
        password,
      })
      .catch(() => ({
        error: new Error("Auth service unreachable"),
      }));

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? (he ? "כתובת האימייל או הסיסמה שגויות." : "Email ou mot de passe incorrect.")
          : (he ? "אירעה שגיאה. נסו שוב." : "Une erreur est survenue. Veuillez réessayer.")
      );
      setLoading(false);
      return;
    }

    await fetch("/api/auth/sync-locale", {
      method: "POST",
      cache: "no-store",
    }).catch(() => null);

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl(window.location.origin, callbackUrl),
          queryParams: {
            prompt: "select_account",
          },
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

  return (
    <div className="space-y-6">
      {!supabaseConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {he ? "הגדרת Supabase אינה תקינה." : <>Configuration Supabase invalide. Renseignez la vraie URL du projet dans <code>NEXT_PUBLIC_SUPABASE_URL</code>.</>}
        </div>
      )}

      {/* Google OAuth */}
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

      {/* Séparateur */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-50 px-3 text-slate-400">{t("or")}</span>
        </div>
      </div>

      {/* Formulaire email/password */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

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
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              {t("password")}
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-blue-600 hover:underline"
            >
              {t("forgot")}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={!supabaseConfigured}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 ps-10 pe-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!supabaseConfigured}>
          {t("login")}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        {t("noAccount")}{" "}
        <Link href={toolDestination ? `/auth/register?callbackUrl=${encodeURIComponent(toolDestination)}` : "/auth/register"} className="text-blue-600 hover:underline font-medium">
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
