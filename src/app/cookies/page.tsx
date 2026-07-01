import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique cookies",
  description: "Comprendre l'utilisation des cookies et technologies similaires sur EasyCom IA.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-gradient-to-b from-blue-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm font-bold text-blue-700 hover:underline">Retour à l&apos;accueil</Link>
          <h1 className="mt-6 text-[clamp(2rem,6vw,3.5rem)] font-black tracking-tight">Politique cookies</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            Cette page explique comment EasyCom IA peut utiliser des cookies ou technologies similaires pour assurer le fonctionnement du service, sécuriser l&apos;accès et améliorer l&apos;expérience.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        {[
          {
            title: "Cookies strictement nécessaires",
            text: "Ils permettent l'authentification, la sécurité, la conservation de session et le bon fonctionnement des pages du service.",
          },
          {
            title: "Mesure et amélioration",
            text: "Lorsque des outils de mesure sont activés, ils servent à comprendre l'usage global du site afin d'améliorer les parcours. Les données doivent rester proportionnées à cet objectif.",
          },
          {
            title: "Services tiers",
            text: "Certains services connectés, comme l'authentification, les paiements, les emails ou les réseaux sociaux, peuvent utiliser leurs propres technologies conformément à leurs politiques.",
          },
          {
            title: "Gestion de vos choix",
            text: "Vous pouvez configurer votre navigateur pour bloquer ou supprimer certains cookies. Certaines fonctionnalités sécurisées peuvent toutefois nécessiter des cookies techniques.",
          },
        ].map((section) => (
          <article key={section.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{section.text}</p>
          </article>
        ))}

        <p className="text-sm leading-7 text-slate-500">
          Pour toute question, contactez EasyCom IA depuis la page <Link href="/contact" className="font-bold text-blue-700 hover:underline">contact</Link>.
        </p>
      </section>
    </main>
  );
}
