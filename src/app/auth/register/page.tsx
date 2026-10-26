import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CheckCircle2, CalendarDays, Sparkles, Share2, Users } from "lucide-react";
import { getLocale } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPosterTemplateId } from "@/lib/public-tools";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { posterDisplayName } from "@/lib/templates/display-name";

// The poster picked in the public gallery, shown during sign-up so the choice is not lost.
async function getChosenPoster(callbackUrl: unknown) {
  const templateId = getPosterTemplateId(typeof callbackUrl === "string" ? callbackUrl : null);
  if (!templateId) return null;
  const { data } = await createAdminClient()
    .from("Template")
    .select("name, category, subCategory, thumbnailUrl, previewUrl")
    .eq("id", templateId)
    .eq("isActive", true)
    .eq("isGlobal", true)
    .maybeSingle();
  const imageUrl = data ? resolveTemplateAssetUrl(data.thumbnailUrl ?? data.previewUrl) : null;
  return data && imageUrl ? { name: posterDisplayName(data), imageUrl } : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const he = (await getLocale()) === "he";
  return { title: he ? "יצירת חשבון — EasyCom IA" : "Créer un compte — EasyCom IA", description: he ? "מתחילים עם EasyCom IA בחינם" : "Démarrez avec EasyCom IA gratuitement", openGraph: { locale: he ? "he_IL" : "fr_FR" } };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const he = (await getLocale()) === "he";
  const chosenPoster = await getChosenPoster((await searchParams).callbackUrl);
  const benefits = he
    ? [{ icon: Users, text: "פרופיל קהילה מלא" }, { icon: Sparkles, text: "יצירת תוכן AI ללא הגבלה" }, { icon: CalendarDays, text: "תכנון אוטומטי של אירועים" }, { icon: Share2, text: "הפצה ב־Instagram, Facebook, WhatsApp, Telegram ובאימייל" }, { icon: CheckCircle2, text: "תמיכה מועדפת" }]
    : [{ icon: Users, text: "Profil communauté complet" }, { icon: Sparkles, text: "Génération de contenu IA illimitée" }, { icon: CalendarDays, text: "Planification automatique des événements" }, { icon: Share2, text: "Diffusion sur Instagram, Facebook, WhatsApp, Telegram et Email" }, { icon: CheckCircle2, text: "Support prioritaire" }];
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
              {he ? "מגלים את EasyCom IA" : "Découvrez EasyCom IA"}
            </h1>
            <p className="text-violet-200 text-lg leading-relaxed">
              {he ? "מכירים את היישום ומגדירים את הקהילה בפחות משתי דקות." : "Explorez l’application et configurez votre communauté en moins de 2 minutes."}
            </p>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 space-y-3">
            <p className="font-semibold text-white">{he ? "מה תקבלו:" : "Ce que vous obtenez :"}</p>
            {benefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0 text-amber-300" />
                <span className="text-violet-100 text-sm">{text}</span>
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
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4 sm:mb-8">
            <img
              src="/easycom-ai-logo.png"
              alt="Logo EasyCom IA"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-xl font-bold text-slate-900">EasyCom IA</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{he ? "יצירת החשבון שלכם" : "Créer votre compte"}</h2>
            <p className="text-slate-500">{he ? "מגדירים את הקהילה בפחות משתי דקות" : "Configurez votre communauté en moins de 2 minutes"}</p>
          </div>

          {chosenPoster ? (
            <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={chosenPoster.imageUrl} alt="" className="h-20 w-16 shrink-0 rounded-lg bg-white object-cover shadow-sm" />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-violet-700">{he ? "המודעה שבחרתם" : "Votre affiche"}</p>
                <p className="mt-0.5 truncate text-sm font-black text-slate-900">{chosenPoster.name}</p>
                <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-600">{he ? "הבחירה נשמרה: תמצאו אותה מיד אחרי ההרשמה." : "Votre choix est enregistré : vous la retrouverez juste après l’inscription."}</p>
              </div>
            </div>
          ) : null}

          <Suspense fallback={<div className="skeleton h-72 w-full rounded-xl" />}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
