"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Suspense } from "react";

/**
 * Page de clôture OAuth (Meta ou Gmail) ouverte depuis Paramètres > Canaux.
 * Ouverte dans un popup → envoie postMessage à l'opener et ferme la fenêtre.
 * Accédée directement (popup bloqué) → redirige vers Paramètres > Canaux.
 */
function SettingsOAuthDoneContent() {
  const searchParams = useSearchParams();
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const oauth = searchParams.get("oauth") ?? "error";
  const provider = searchParams.get("provider");
  const isGmail = oauth.startsWith("gmail_");
  const isSuccess = isGmail ? oauth === "gmail_success" : oauth === "success";

  useEffect(() => {
    if (window.opener) {
      try {
        window.opener.postMessage(
          {
            type: isGmail
              ? (isSuccess ? "gmail_oauth_success" : "gmail_oauth_error")
              : (isSuccess ? "meta_oauth_success" : "meta_oauth_error"),
            provider,
            oauth,
          },
          appOrigin
        );
      } catch { /* cross-origin safety */ }
      setTimeout(() => window.close(), 1200);
    } else {
      const params = new URLSearchParams({ oauth });
      if (provider) params.set("provider", provider);
      window.location.href = `/dashboard/settings/channels?${params.toString()}`;
    }
  }, [appOrigin, isGmail, isSuccess, oauth, provider]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="space-y-4 px-8 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${isSuccess ? "bg-green-50" : "bg-red-50"}`}>
          {isSuccess
            ? <CheckCircle2 className="size-8 text-green-500" />
            : <XCircle className="size-8 text-red-500" />}
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {isSuccess ? "Connexion réussie !" : "Connexion annulée"}
        </h1>
        <p className="text-sm text-slate-500">Cette fenêtre va se fermer…</p>
      </div>
    </div>
  );
}


export default function SettingsOAuthDonePage() {
  return (
    <Suspense>
      <SettingsOAuthDoneContent />
    </Suspense>
  );
}
