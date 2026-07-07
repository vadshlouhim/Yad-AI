"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function MetaOAuthDonePage() {
  const searchParams = useSearchParams();
  const oauth = searchParams.get("oauth") ?? "error";
  const provider = searchParams.get("provider") ?? "meta";
  const isSuccess = oauth === "success";

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        {
          type: isSuccess ? "meta_oauth_success" : "meta_oauth_error",
          oauth,
          provider,
        },
        window.location.origin
      );
      window.close();
      return;
    }

    const fallbackUrl = new URL("/dashboard/settings/channels", window.location.origin);
    fallbackUrl.searchParams.set("oauth", oauth);
    fallbackUrl.searchParams.set("provider", provider);
    window.location.href = fallbackUrl.toString();
  }, [isSuccess, oauth, provider]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${isSuccess ? "bg-emerald-50" : "bg-red-50"}`}>
          {isSuccess ? (
            <CheckCircle2 className="size-8 text-emerald-500" />
          ) : (
            <AlertCircle className="size-8 text-red-500" />
          )}
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-900">
          {isSuccess ? "Connexion reussie" : "Connexion impossible"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">Cette fenetre va se fermer automatiquement...</p>
      </div>
    </div>
  );
}
