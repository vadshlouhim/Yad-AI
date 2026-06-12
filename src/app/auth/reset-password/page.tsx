import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe - Yad.ia",
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center space-y-4">
        <Link href="/auth/login" className="text-sm font-medium text-blue-600 hover:underline">
          Retour à la connexion
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-900">Réinitialisation du mot de passe</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Si vous arrivez ici depuis un email Supabase, connectez-vous puis définissez un
            nouveau mot de passe depuis Paramètres &gt; Mon profil.
          </p>
        </div>
      </div>
    </main>
  );
}
