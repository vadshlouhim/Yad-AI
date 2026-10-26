"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { buildAuthCallbackUrl } from "@/lib/supabase/auth-redirect";
import { Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const he = useLocale() === "he";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth
      .resetPasswordForEmail(email, {
        redirectTo: buildAuthCallbackUrl(
          window.location.origin,
          "/auth/reset-password",
        ),
      })
      .catch(() => ({
        error: new Error("Auth service unreachable"),
      }));

    setLoading(false);

    if (error) {
      setError(he ? "לא ניתן לשלוח את האימייל לאיפוס הסיסמה." : "Impossible d’envoyer l’email de réinitialisation.");
      return;
    }

    setMessage(he ? "אם קיים חשבון עם הכתובת הזו, נשלח אליו קישור לאיפוס." : "Si un compte existe avec cet email, un lien de réinitialisation vient d’être envoyé.");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center space-y-6">
      <div>
        <Link href="/auth/login" className="text-sm font-medium text-[#6018ce] hover:underline">
          {t("backToLogin")}
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{t("forgotTitle")}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {he ? "הזינו את כתובת האימייל כדי לקבל קישור לאיפוס." : "Indiquez votre email pour recevoir un lien de réinitialisation."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          {t("email")}
          <span className="relative block">
            <Mail className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="vous@exemple.com"
              className="w-full rounded-lg border border-slate-200 py-2.5 ps-10 pe-4 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </span>
        </label>

        <Button type="submit" className="w-full" loading={loading}>
          {t("sendLink")}
        </Button>
      </form>
    </main>
  );
}
