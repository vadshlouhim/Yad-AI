"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Suspense } from "react";

function MetaOAuthDoneContent() {
  const searchParams = useSearchParams();
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const oauth = searchParams.get("oauth");
  const provider = searchParams.get("provider");
  const isSuccess = oauth === "success";

  useEffect(() => {
    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: isSuccess ? "meta_oauth_success" : "meta_oauth_error", provider, oauth },
          appOrigin
        );
      } catch { /* cross-origin safety */ }
      setTimeout(() => window.close(), 1200);
    } else {
      // Accès direct (popup bloqué) → retour sur l'onboarding
      window.location.href = `/onboarding?oauth=${oauth ?? ""}&provider=${provider ?? ""}`;
    }
  }, [appOrigin, isSuccess, oauth, provider]);

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

export default function MetaOAuthDonePage() {
  return (
    <Suspense>
      <MetaOAuthDoneContent />
    </Suspense>
  );
}
