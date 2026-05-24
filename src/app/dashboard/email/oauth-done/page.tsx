"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Page de clôture OAuth Gmail.
 * Ouverte dans un popup → envoie postMessage à l'opener et ferme la fenêtre.
 * Accédée directement → redirige vers la page email.
 */
export default function GmailOAuthDonePage() {
  useEffect(() => {
    if (window.opener) {
      try {
        window.opener.postMessage({ type: "gmail_oauth_success" }, window.location.origin);
      } catch {
        // cross-origin safety
      }
      window.close();
    } else {
      window.location.href = "/dashboard/email?oauth=gmail_success";
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-4 px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-50">
          <CheckCircle2 className="size-8 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Gmail connecté !</h1>
        <p className="text-sm text-slate-500">Cette fenêtre va se fermer automatiquement…</p>
      </div>
    </div>
  );
}
