import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — Shalom IA",
  description: "Connectez-vous à votre espace Shalom IA",
};

export default function LoginPage() {
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
              Le copilote IA de votre communauté
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed">
              Centralisez, préparez et diffusez votre communication communautaire
              depuis un seul outil intelligent.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              { icon: "🗓️", text: "Gestion des événements récurrents" },
              { icon: "✍️", text: "Génération de contenu par IA" },
              { icon: "📡", text: "Diffusion multicanale automatisée" },
              { icon: "🕍", text: "Calendrier hébraïque intégré" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-blue-100">{item.text}</span>
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
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4 sm:mb-8">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center">
              <span className="text-white font-bold text-lg">ש</span>
            </div>
            <span className="text-xl font-bold text-slate-900">Shalom IA</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Connexion</h2>
            <p className="text-slate-500">
              Accédez à votre espace de communication
            </p>
          </div>

          <Suspense fallback={<div className="skeleton h-64 w-full rounded-xl" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
