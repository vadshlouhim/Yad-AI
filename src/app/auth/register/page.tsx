import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CheckCircle2, CalendarDays, Sparkles, Share2, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Créer un compte — EasyCom AI",
  description: "Démarrez avec EasyCom AI gratuitement",
};

export default function RegisterPage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panneau gauche — Brand */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <img
            src="/easycom-ai-logo.png"
            alt="Logo EasyCom AI"
            className="h-10 w-10 rounded-xl bg-white/15 object-cover p-0.5"
          />
          <span className="text-xl font-bold tracking-tight">EasyCom AI</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight">
              Découvrez EasyCom AI
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed">
              Explorez l&apos;application et configurez votre communauté en moins de 2 minutes.
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 space-y-3">
            <p className="font-semibold text-white">Ce que vous obtenez :</p>
            {[
              { icon: Users, text: "Profil communauté complet" },
              { icon: Sparkles, text: "Génération de contenu IA illimitée" },
              { icon: CalendarDays, text: "Planification automatique des événements" },
              { icon: Share2, text: "Diffusion sur Instagram, Facebook, WhatsApp, Telegram et Email" },
              { icon: CheckCircle2, text: "Support prioritaire" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0 text-amber-300" />
                <span className="text-blue-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-blue-300 text-sm">
          © {new Date().getFullYear()} EasyCom AI — Communication communautaire augmentée
        </div>
      </div>

      {/* Panneau droit — Formulaire */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4 sm:mb-8">
            <img
              src="/easycom-ai-logo.png"
              alt="Logo EasyCom AI"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold text-slate-900">EasyCom AI</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Créer votre compte</h2>
            <p className="text-slate-500">Configurez votre communauté en moins de 2 minutes</p>
          </div>

          <Suspense fallback={<div className="skeleton h-72 w-full rounded-xl" />}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
