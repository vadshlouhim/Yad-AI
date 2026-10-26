import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CalendarDays, Sparkles, Radio, Users } from "lucide-react";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const he = (await getLocale()) === "he";
  return { title: he ? "התחברות — EasyCom IA" : "Connexion — EasyCom IA", description: he ? "התחברו למרחב EasyCom IA שלכם" : "Connectez-vous à votre espace EasyCom IA", openGraph: { locale: he ? "he_IL" : "fr_FR" } };
}

export default async function LoginPage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const he = (await getLocale()) === "he";
  const benefits = he
    ? [{ icon: CalendarDays, text: "ניהול אירועים חוזרים" }, { icon: Sparkles, text: "יצירת תוכן בעזרת AI" }, { icon: Radio, text: "הפצה אוטומטית בכמה ערוצים" }, { icon: Users, text: "מתאים לכל סוגי הקהילות" }]
    : [{ icon: CalendarDays, text: "Gestion des événements récurrents" }, { icon: Sparkles, text: "Génération de contenu par IA" }, { icon: Radio, text: "Diffusion multicanale automatisée" }, { icon: Users, text: "Adapté à tous types de communautés" }];
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panneau gauche — Brand */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <img
            src="/easycom-ai-logo.png"
            alt="Logo EasyCom IA"
            className="h-10 w-10 rounded-xl bg-white/15 object-cover p-0.5"
          />
          <span className="text-xl font-bold tracking-tight">EasyCom IA</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight">
              {he ? "שותף ה־AI של הקהילה שלכם" : "Le copilote IA de votre communauté"}
            </h1>
            <p className="text-violet-200 text-lg leading-relaxed">
              {he ? "מרכזים, מכינים ומפיצים את התקשורת הקהילתית מכלי חכם אחד." : "Centralisez, préparez et diffusez votre communication communautaire depuis un seul outil intelligent."}
            </p>
          </div>

          <div className="grid gap-4">
            {benefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon className="size-5 shrink-0 text-violet-300" />
                <span className="text-violet-100">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-violet-300 text-sm">
          © {new Date().getFullYear()} EasyCom IA — {he ? "תקשורת קהילתית חכמה" : "Communication communautaire augmentée"}
        </div>
      </div>

      {/* Panneau droit — Formulaire */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4 sm:mb-8">
            <img
              src="/easycom-ai-logo.png"
              alt="Logo EasyCom IA"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold text-slate-900">EasyCom IA</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{he ? "התחברות" : "Connexion"}</h2>
            <p className="text-slate-500">
              {he ? "היכנסו למרחב התקשורת שלכם" : "Accédez à votre espace de communication"}
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
