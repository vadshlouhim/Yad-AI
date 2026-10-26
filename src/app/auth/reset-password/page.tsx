import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const he = (await getLocale()) === "he";
  return { title: he ? "איפוס סיסמה - EasyCom IA" : "Réinitialiser le mot de passe - EasyCom IA" };
}

export default async function ResetPasswordPage() {
  const he = (await getLocale()) === "he";
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center space-y-4">
        <Link href="/auth/login" className="text-sm font-medium text-[#6018ce] hover:underline">
          {he ? "חזרה להתחברות" : "Retour à la connexion"}
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h1 className="text-2xl font-bold text-slate-900">{he ? "איפוס הסיסמה" : "Réinitialisation du mot de passe"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {he ? "אם הגעתם לכאן מאימייל של Supabase, התחברו ולאחר מכן הגדירו סיסמה חדשה דרך הגדרות > הפרופיל שלי." : "Si vous arrivez ici depuis un email Supabase, connectez-vous puis définissez un nouveau mot de passe depuis Paramètres > Mon profil."}
          </p>
        </div>
      </div>
    </main>
  );
}
