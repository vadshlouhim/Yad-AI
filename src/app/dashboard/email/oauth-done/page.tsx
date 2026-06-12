"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

/**
 * Page de clôture OAuth Gmail.
 * Ouverte dans un popup → envoie postMessage à l'opener et ferme la fenêtre.
 * Accédée directement → redirige vers la page email.
 */
export default function GmailOAuthDonePage() {
  const searchParams = useSearchParams();
  const oauth = searchParams.get("oauth") ?? "gmail_error";
  const isSuccess = oauth === "gmail_success";

  useEffect(() => {
    const appOrigin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      window.location.origin;

    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: isSuccess ? "gmail_oauth_success" : "gmail_oauth_error", oauth },
          appOrigin
        );
      } catch {
        // cross-origin safety
      }
      window.close();
    } else {
      window.location.href = `/dashboard/email?oauth=${encodeURIComponent(oauth)}`;
    }
  }, [isSuccess, oauth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 px-8">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${isSuccess ? "bg-green-50" : "bg-red-50"}`}>
          <CheckCircle2 className={`size-8 ${isSuccess ? "text-green-500" : "text-red-500"}`} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{isSuccess ? "Gmail connecté !" : "Connexion Gmail impossible"}</h1>
        <p className="text-sm text-slate-500">Cette fenêtre va se fermer automatiquement…</p>
      </div>
    </div>
  );
}
