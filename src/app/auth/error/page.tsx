import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Erreur d'authentification — Shalom IA" };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  const message = params.message ?? "Une erreur est survenue lors de la connexion.";

  const messages: Record<string, string> = {
    auth_callback_failed: "L'authentification OAuth a échoué. Veuillez réessayer.",
    access_denied: "Accès refusé. Vous avez annulé la connexion.",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Erreur d&apos;authentification</h1>
          <p className="text-slate-500 mt-2">
            {messages[message] ?? message}
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
