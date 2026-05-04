import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte — Shalom IA",
  description: "Démarrez avec Shalom IA gratuitement",
};

export default function RegisterPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/");
  }
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panneau gauche — Brand */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-lg">ש</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Shalom IA</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight">
              Démarrez gratuitement
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed">
              14 jours d&apos;essai gratuit — aucune carte bancaire requise.
              Configurez votre communauté en moins de 10 minutes.
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 space-y-3">
            <p className="font-semibold text-white">Ce que vous obtenez :</p>
            {[
              "Profil communauté complet",
              "Génération de contenu IA illimitée",
              "Planification automatique Chabbat & fêtes",
              "Diffusion sur Instagram, Facebook, WhatsApp, Telegram et Email",
              "Support prioritaire",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-blue-100 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-blue-300 text-sm">
          © {new Date().getFullYear()} Shalom IA — Communication communautaire augmentée
        </div>
      </div>

      {/* Panneau droit — Formulaire */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4 sm:mb-8">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center">
              <span className="text-white font-bold text-lg">ש</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Shalom IA</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Créer votre compte</h2>
            <p className="text-slate-500">14 jours d&apos;essai gratuit, sans engagement</p>
          </div>

          <Suspense fallback={<div className="skeleton h-72 w-full rounded-xl" />}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
