"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Suspense } from "react";

function GmbOAuthDoneContent() {
  const searchParams = useSearchParams();
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const oauth = searchParams.get("oauth");
  const location = searchParams.get("location");
  const isSuccess = oauth === "gmb_success";
  const errorMessages: Record<string, string> = {
    gmb_cancelled: "Connexion annulée.",
    gmb_missing_code: "Google n'a pas renvoyé de code de connexion.",
    gmb_no_community: "Aucune communauté n'est associée à ce compte.",
    gmb_no_token: "Google n'a pas renvoyé de token utilisable.",
    gmb_no_account: "Aucun compte Google Business Profile n'a été trouvé.",
    gmb_quota_exceeded: "Google a temporairement bloqué les appels car le quota par minute est dépassé. Attendez 1 à 2 minutes, puis réessayez une seule fois.",
    gmb_accounts_error: "Impossible de lire les comptes Google Business. Vérifiez que l'API Business Profile est activée et que le compte a les droits nécessaires.",
    gmb_database_error: "Connexion Google réussie, mais l'enregistrement en base a échoué. Il faut appliquer la migration du canal GOOGLE_BUSINESS.",
    gmb_error: "Erreur pendant la finalisation Google Business.",
  };

  useEffect(() => {
    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: isSuccess ? "gmb_oauth_success" : "gmb_oauth_error", location, oauth },
          appOrigin
        );
      } catch { /* cross-origin safety */ }
      setTimeout(() => window.close(), 1200);
    } else {
      // Accès direct → redirige vers la page avis
      window.location.href = "/dashboard/google-reviews?oauth=" + (oauth ?? "");
    }
  }, [appOrigin, isSuccess, location, oauth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 px-8">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${isSuccess ? "bg-green-50" : "bg-red-50"}`}>
          {isSuccess
            ? <CheckCircle2 className="size-8 text-green-500" />
            : <XCircle className="size-8 text-red-500" />}
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {isSuccess ? "Google My Business connecté !" : "Connexion annulée"}
        </h1>
        {isSuccess && location && (
          <p className="text-sm text-slate-600 font-medium">{location}</p>
        )}
        {!isSuccess && (
          <p className="max-w-md text-sm text-slate-600 font-medium">
            {errorMessages[oauth ?? ""] ?? errorMessages.gmb_error}
          </p>
        )}
        <p className="text-sm text-slate-500">Cette fenêtre va se fermer…</p>
      </div>
    </div>
  );
}

export default function GmbOAuthDonePage() {
  return (
    <Suspense>
      <GmbOAuthDoneContent />
    </Suspense>
  );
}
