"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Suspense } from "react";

function GmbOAuthDoneContent() {
  const searchParams = useSearchParams();
  const oauth = searchParams.get("oauth");
  const location = searchParams.get("location");
  const isSuccess = oauth === "gmb_success";

  useEffect(() => {
    if (window.opener) {
      try {
        window.opener.postMessage(
          { type: isSuccess ? "gmb_oauth_success" : "gmb_oauth_error", location },
          window.location.origin
        );
      } catch { /* cross-origin safety */ }
      setTimeout(() => window.close(), 1200);
    } else {
      // Accès direct → redirige vers la page avis
      window.location.href = "/dashboard/google-reviews?oauth=" + (oauth ?? "");
    }
  }, [isSuccess, location, oauth]);

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
