import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aide - EasyCom AI",
  description: "Questions fréquentes et support EasyCom AI",
};

const FAQ_ITEMS = [
  {
    question: "Comment connecter mes réseaux sociaux ?",
    answer:
      "Depuis Paramètres > Réseaux sociaux, choisissez le canal à connecter puis suivez le parcours OAuth proposé.",
  },
  {
    question: "Pourquoi certaines pages demandent une connexion ?",
    answer:
      "Les pages du dashboard utilisent les données de votre communauté et nécessitent donc une session active.",
  },
  {
    question: "Comment modifier les informations de ma communauté ?",
    answer:
      "Ouvrez Paramètres, puis l’onglet Communauté pour mettre à jour le nom, la ville, les contacts et le ton éditorial.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          Retour à l’accueil
        </Link>

        <div>
          <h1 className="text-3xl font-bold">Aide</h1>
          <p className="mt-2 text-slate-600">
            Retrouvez les réponses rapides et les contacts utiles pour utiliser EasyCom AI.
          </p>
        </div>

        <section className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <article key={item.question} className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold">{item.question}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
            </article>
          ))}
        </section>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900">
          Besoin d’aide ? Contactez-nous à{" "}
          <a className="font-semibold underline" href="mailto:contact@shalom-ia.com">
            contact@shalom-ia.com
          </a>
          .
        </div>
      </div>
    </main>
  );
}
