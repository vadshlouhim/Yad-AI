"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Building2, Camera, Check, ExternalLink, Link2, ShieldCheck, X } from "lucide-react";
import { useLocale } from "next-intl";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
};

const META_CONNECT_PAGE_HELP = "https://www.facebook.com/help/instagram/570895513091465";
const INSTAGRAM_PRO_ACCOUNT_HELP = "https://help.instagram.com/2358103564437429";

export function InstagramPrerequisiteDialog({ open, onOpenChange, onContinue }: Props) {
  const he = useLocale() === "he";
  const [confirmed, setConfirmed] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setConfirmed(false);
    onOpenChange(nextOpen);
  }

  function continueToMeta() {
    if (!confirmed) return;
    setConfirmed(false);
    onOpenChange(false);
    onContinue();
  }

  const steps = he
    ? [
        { icon: Camera, title: "העבירו את Instagram לחשבון מקצועי", text: "באפליקציית Instagram: פרופיל ← תפריט ☰ ← הגדרות ופעילות ← עבור אנשי מקצוע ← סוג החשבון וכלים ← מעבר לחשבון מקצועי. בחרו Business או Creator." },
        { icon: Link2, title: "קשרו את החשבון לדף Facebook", text: "ב־Facebook עברו לדף שלכם: הגדרות ופרטיות ← הגדרות ← הרשאות ← חשבונות מקושרים ← Instagram ← חיבור חשבון. התחברו לחשבון Instagram המקצועי ואשרו." },
        { icon: Building2, title: "בדקו את ההרשאות לדף", text: "התחברו ל־Meta עם חשבון Facebook שיש לו גישת מנהל או שליטה מלאה בדף. בחלון Meta בחרו את הדף ואשרו את כל ההרשאות המבוקשות." },
      ]
    : [
        { icon: Camera, title: "Passez Instagram en compte professionnel", text: "Dans l’application Instagram : Profil → menu ☰ → Paramètres et activité → Pour les professionnels → Type de compte et outils → Passer à un compte professionnel. Choisissez Business ou Creator." },
        { icon: Link2, title: "Reliez le compte à une Page Facebook", text: "Dans Facebook, basculez sur votre Page : Paramètres et confidentialité → Paramètres → Autorisations → Comptes associés → Instagram → Connecter le compte. Identifiez-vous ensuite avec votre Instagram professionnel." },
        { icon: Building2, title: "Vérifiez votre accès à la Page", text: "Connectez-vous à Meta avec un compte Facebook ayant l’accès administrateur ou le contrôle total de la Page. Dans la fenêtre Meta, sélectionnez cette Page et acceptez toutes les autorisations demandées." },
      ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1200] bg-[#170534]/65 backdrop-blur-[4px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1201] flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[2rem] bg-[#fffaf7] shadow-[0_32px_100px_rgba(23,5,52,0.45)] outline-none sm:max-h-[calc(100dvh-3rem)]">
          <header className="relative shrink-0 overflow-hidden bg-[radial-gradient(circle_at_85%_10%,#ffb34a_0%,#e1306c_38%,#833ab4_72%,#421388_100%)] px-5 pb-5 pt-6 text-white sm:px-7 sm:pb-6">
            <DialogPrimitive.Close className="absolute end-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              <X className="size-5" /><span className="sr-only">{he ? "סגירה" : "Fermer"}</span>
            </DialogPrimitive.Close>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25"><Camera className="size-7" /></span>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-white/75">{he ? "דרישת Meta" : "Prérequis obligatoire Meta"}</p>
            <DialogPrimitive.Title className="mt-1 max-w-xl text-2xl font-black tracking-tight sm:text-3xl">{he ? "לפני חיבור Instagram" : "Avant de connecter Instagram"}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/85">
              {he ? "EasyCom IA משתמש בחיבור הרשמי של Meta. חשבון אישי שאינו מקושר לדף Facebook לא יוכל להתחבר." : "EasyCom IA utilise la connexion officielle Meta. Un compte personnel ou non relié à une Page Facebook ne pourra pas être connecté."}
            </DialogPrimitive.Description>
          </header>

          <div className="overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-5 shrink-0 text-amber-700" />{he ? "מרכז החשבונות לבדו אינו מספיק: Instagram חייב להיות מקושר ישירות לדף Facebook." : "Le Centre de comptes seul ne suffit pas : Instagram doit être directement relié à une Page Facebook."}</span>
            </div>

            <ol className="mt-5 space-y-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return <li key={step.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-orange-100 text-pink-700"><Icon className="size-5" /></span><div className="min-w-0"><h3 className="font-black text-slate-950">{index + 1}. {step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p></div></li>;
              })}
            </ol>

            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
              <a href={INSTAGRAM_PRO_ACCOUNT_HELP} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 text-pink-700 transition hover:bg-pink-50">{he ? "עזרת Instagram: חשבון מקצועי" : "Aide Instagram : compte professionnel"}<ExternalLink className="size-3.5" /></a>
              <a href={META_CONNECT_PAGE_HELP} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 text-blue-700 transition hover:bg-blue-50">{he ? "עזרת Meta: קישור לדף" : "Aide Meta : relier la Page"}<ExternalLink className="size-3.5" /></a>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="peer sr-only" />
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 border-violet-300 bg-white text-white transition peer-checked:border-[#7130d8] peer-checked:bg-[#7130d8] peer-focus-visible:ring-4 peer-focus-visible:ring-violet-200">{confirmed ? <Check className="size-4" strokeWidth={3} /> : null}</span>
              <span className="text-sm font-bold leading-6 text-slate-800">{he ? "אני מאשר/ת שהחשבון מקצועי, מקושר לדף Facebook ושיש לי הרשאת ניהול לדף." : "Je confirme que le compte est professionnel, relié à une Page Facebook et que j’ai un accès administrateur à cette Page."}</span>
            </label>

            <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_1.5fr]">
              <DialogPrimitive.Close className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200">{he ? "אעשה זאת מאוחר יותר" : "Je le ferai plus tard"}</DialogPrimitive.Close>
              <button type="button" onClick={continueToMeta} disabled={!confirmed} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#833ab4] via-[#e1306c] to-[#f77737] px-4 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-200 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">{he ? "המשך לחיבור Meta" : "Continuer vers la connexion Meta"}<ExternalLink className="size-4" /></button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
