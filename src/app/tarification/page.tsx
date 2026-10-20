import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, Eye, LockKeyhole, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const he = locale === "he";
  const launchPrice = formatPrice(locale, 9.99);
  const monthlyPrice = formatPrice(locale, 19.99);
  return { title: he ? `תמחור EasyCom IA — ${monthlyPrice} לחודש` : `Tarification EasyCom IA — ${monthlyPrice} TTC/mois`, description: he ? `חודש ראשון ב־${launchPrice}, ולאחר מכן ${monthlyPrice} לחודש. אפשר להכיר את היישום בחופשיות לפני ביצוע פעולה.` : `Premier mois à ${launchPrice} TTC, puis ${monthlyPrice} TTC/mois. Explorez l'application librement avant de lancer vos actions.`, alternates: { canonical: "/tarification" }, openGraph: { locale: he ? "he_IL" : "fr_FR" } };
}

function formatPrice(locale: string, value: number) {
  return new Intl.NumberFormat(locale === "he" ? "he-IL" : "fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

const INCLUDED = [
  "Automatisations et rappels intelligents",
  "Affiches, contenus et générations IA",
  "Publications, WhatsApp et emails",
  "Newsletter Chabbat imprimable et PDF",
  "Avis Google et outils communautaires",
  "Annulation à tout moment depuis Stripe",
];

const STEPS = [
  { icon: Eye, title: "Vous explorez", text: "Toutes les pages et les outils restent visibles gratuitement." },
  { icon: Sparkles, title: "Vous lancez une action", text: "Au moment d’une génération, d’un envoi ou d’une automatisation." },
  { icon: Zap, title: "Vous débloquez tout", text: "" },
];

export default async function PricingPage() {
  const locale = await getLocale();
  const he = locale === "he";
  const launchPrice = formatPrice(locale, 9.99);
  const monthlyPrice = formatPrice(locale, 19.99);
  const included = he ? [
    "אוטומציות ותזכורות חכמות", "מודעות, תוכן ויצירה בעזרת AI", "פרסומים, WhatsApp ואימיילים",
    "עלון שבת להדפסה וב־PDF", "ביקורות Google וכלים קהילתיים", "ביטול בכל עת דרך Stripe",
  ] : INCLUDED;
  const steps = he ? [
    { icon: Eye, title: "מכירים את המערכת", text: "כל העמודים והכלים נשארים פתוחים לצפייה בחינם." },
    { icon: Sparkles, title: "מתחילים פעולה", text: "בעת יצירה, שליחה או הפעלת אוטומציה." },
    { icon: Zap, title: "פותחים את כל האפשרויות", text: `${launchPrice} בחודש הראשון, ולאחר מכן ${monthlyPrice} לחודש.` },
  ] : STEPS.map((step, index) => index === 2 ? { ...step, text: `${launchPrice} TTC le premier mois, puis ${monthlyPrice} TTC/mois.` } : step);
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fffaf4] text-slate-950">
      <PublicNavbar />

      <section className="relative overflow-hidden rounded-b-[3.25rem] bg-[radial-gradient(circle_at_76%_8%,#6f29c2_0%,#421388_40%,#210763_100%)] px-5 pb-12 pt-8 text-white shadow-[0_22px_42px_rgba(43,8,104,0.22)] sm:px-8 sm:pb-16 sm:pt-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_34%,rgba(142,78,232,0.28),transparent_31%),radial-gradient(circle_at_92%_72%,rgba(55,157,255,0.2),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.16em] ring-1 ring-white/15"><CreditCard className="size-3.5" />{he ? "הצעה אחת, הכול כלול" : "Une offre, tout inclus"}</div>
          <div className="mt-5 max-w-3xl">
            <h1 className="text-[clamp(2.4rem,11vw,4.7rem)] font-black leading-[0.94] tracking-[-0.06em]">{he ? "פשוט." : "Simple."}<br /><span className="text-[#ffd35f]">{he ? "שקוף." : "Transparent."}</span><br />{he ? "מוכנים לפעול." : "Prêt à agir."}</h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-7 text-white/82 sm:text-lg">{he ? "מכירים את EasyCom IA בלי לחץ. התשלום מתחיל רק כאשר בוחרים ליצור, לפרסם, לשלוח או לבצע אוטומציה." : "Découvrez EasyCom IA sans pression. Le paiement intervient uniquement lorsque vous décidez de créer, publier, envoyer ou automatiser."}</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-white/85"><span className="rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/10">{he ? "ללא התחייבות" : "Sans engagement"}</span><span className="rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/10">{he ? "תשלום מאובטח ב־Stripe" : "Paiement sécurisé Stripe"}</span></div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-5 max-w-5xl px-4 sm:-mt-7 sm:px-6">
        <article className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_24px_52px_rgba(43,8,104,0.16)]">
          <div className="bg-[linear-gradient(135deg,#fff8d9,#fffdf3_48%,#f2e9ff)] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="inline-flex items-center gap-1.5 rounded-full bg-[#421388] px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.13em] text-white"><Sparkles className="size-3" />{he ? "הצעת היכרות" : "Offre de bienvenue"}</p><h2 className="mt-4 text-[clamp(1.8rem,8vw,2.5rem)] font-black leading-none tracking-[-0.05em] text-slate-950">EasyCom IA</h2><p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-600">{he ? "כל התכונות שמקדמות את התקשורת שלכם באמת." : "Toutes les fonctions qui font réellement avancer votre communication."}</p></div><span className="flex size-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-white text-[#421388] shadow-[0_12px_24px_rgba(66,19,136,0.12)]"><Sparkles className="size-7 fill-[#ffbd17] text-[#ffbd17]" /></span></div>
            <div className="mt-6 flex items-end gap-2"><bdi dir="ltr" className="text-[clamp(3rem,14vw,4.5rem)] font-black leading-none tracking-[-0.08em] text-[#421388]">{launchPrice}</bdi><span className="pb-1.5 text-sm font-black text-slate-600">{he ? "בחודש הראשון" : "TTC · premier mois"}</span></div>
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/85 px-3 py-2 text-sm font-bold text-slate-600"><bdi dir="ltr" className="line-through decoration-2">{monthlyPrice}</bdi><span className="text-[#421388]">{he ? `ואז ${monthlyPrice} לחודש` : `puis ${monthlyPrice} TTC/mois`}</span></p>
          </div>
          <div className="p-5 sm:p-7"><div className="grid gap-3 sm:grid-cols-2">{included.map((item) => <p key={item} className="flex items-start gap-3 rounded-2xl bg-[#fffaf4] px-3 py-3 text-sm font-bold leading-5 text-slate-700"><Check className="mt-0.5 size-4 shrink-0 text-[#14a857]" />{item}</p>)}</div><Link href="/auth/register" className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#421388] px-5 text-base font-black text-white shadow-[0_16px_28px_rgba(66,19,136,0.28)] transition hover:bg-[#321070] active:scale-[0.985]">{he ? `מתחילים ב־${launchPrice}` : `Commencer à ${launchPrice} TTC`} <ArrowRight className="rtl-mirror size-5" /></Link><p className="mt-3 text-center text-xs font-semibold leading-5 text-slate-500">{he ? "מיועד למנוי הראשון של הקהילה שלכם." : "Réservé à la première souscription de votre communauté."}</p></div>
        </article>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-[#ffedb7] text-[#9b6100]"><LockKeyhole className="size-5" /></span><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#a96d00]">{he ? "בלי הפתעות" : "Sans surprise"}</p><h2 className="text-2xl font-black tracking-[-0.045em]">{he ? "איך זה עובד?" : "Comment ça marche ?"}</h2></div></div><div className="mt-6 grid gap-3 md:grid-cols-3">{steps.map((step, index) => <article key={step.title} className="relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_12px_26px_rgba(45,16,110,0.06)]"><span className="absolute end-4 top-2 text-5xl font-black tracking-[-0.1em] text-[#421388]/[0.07]">0{index + 1}</span><span className="flex size-11 items-center justify-center rounded-2xl bg-[#f0e8ff] text-[#421388]"><step.icon className="size-5" /></span><h3 className="mt-5 text-lg font-black">{step.title}</h3><p className="mt-2 text-sm font-medium leading-6 text-slate-500">{step.text}</p></article>)}</div></section>

      <section className="border-y border-[#421388]/10 bg-[#f3edff] px-5 py-10 sm:px-6"><div className="mx-auto flex max-w-5xl flex-col gap-5 rounded-[1.8rem] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#dff8e9] text-[#13964d]"><ShieldCheck className="size-5" /></span><div><h2 className="text-lg font-black">{he ? "השליטה נשארת אצלכם" : "Vous gardez le contrôle"}</h2><p className="mt-1 text-sm font-medium leading-6 text-slate-500">{he ? "הפעולות החשובות תמיד גלויות ומאושרות על ידכם." : "Vos actions importantes restent toujours visibles et validées par vous."}</p></div></div><Link href="/auth/register" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#075ce5] px-5 text-sm font-black text-white shadow-[0_10px_20px_rgba(7,92,229,0.2)]">{he ? "יצירת חשבון" : "Créer mon compte"}</Link></div></section>

      <PublicFooter />
    </main>
  );
}
