import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, HelpCircle, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ - EasyCom AI",
  description: "Foire aux questions courantes et support EasyCom AI",
};

const FAQ_ITEMS = [
  {
    question: "Comment connecter mes reseaux sociaux ?",
    answer:
      "Depuis Parametres puis Connexion reseaux sociaux, choisissez le canal a connecter et suivez le parcours propose pour autoriser EasyCom AI.",
  },
  {
    question: "A quoi servent les automatisations ?",
    answer:
      "Les automatisations servent a preparer a l'avance vos contenus recurrents, rappels, messages et publications pour gagner du temps au quotidien.",
  },
  {
    question: "Est-ce que les publications partent automatiquement ?",
    answer:
      "Selon le canal connecte et votre configuration, EasyCom AI peut preparer, programmer ou publier. Certains canaux demandent une validation ou une connexion prealable.",
  },
  {
    question: "Comment voir mes notifications importantes ?",
    answer:
      "Ouvrez la rubrique Notification depuis le menu. Vous y retrouvez les contenus prets, les alertes importantes et les actions qui demandent votre attention.",
  },
  {
    question: "Comment modifier les informations de ma communaute ?",
    answer:
      "Depuis Parametres, ouvrez Informations de la communaute pour mettre a jour le nom, la ville, l'email, le telephone, le site et le type de communaute.",
  },
  {
    question: "Comment ajouter ou organiser mes contacts ?",
    answer:
      "Depuis Parametres puis Contacts, vous pouvez ajouter des membres a la main, importer depuis le smartphone et enrichir chaque fiche avec des notes utiles.",
  },
  {
    question: "A quoi sert l'assistant du quotidien ?",
    answer:
      "Il vous aide a organiser votre agenda, vos rappels, vos taches communautaires et vos actions prioritaires sans perdre le fil.",
  },
  {
    question: "Que puis-je demander a l'assistant IA ?",
    answer:
      "Vous pouvez lui demander de rediger un email, preparer une publication, proposer des automatisations, repondre a un avis Google, organiser votre semaine ou preparer un visuel.",
  },
  {
    question: "Comment repondre a un avis Google avec EasyCom AI ?",
    answer:
      "Dans Avis Google, l'assistant peut vous aider a formuler une reponse rapide, polie et adaptee au contexte du message recu.",
  },
  {
    question: "Puis-je preparer du contenu pour WhatsApp, Facebook et Instagram ?",
    answer:
      "Oui. EasyCom AI peut vous aider a adapter le meme message pour plusieurs canaux avec un ton et un format plus coherents pour chacun.",
  },
  {
    question: "Comment retrouver mes ressources ?",
    answer:
      "Depuis Ressources ou Mes Ressources, vous pouvez consulter vos contenus, documents et elements utiles pour publier plus vite.",
  },
  {
    question: "Comment fonctionne la banque visuelle ?",
    answer:
      "La banque visuelle permet de retrouver des affiches, supports et visuels prets a adapter selon vos besoins communautaires.",
  },
  {
    question: "Pourquoi certaines pages demandent une connexion ?",
    answer:
      "Les pages du dashboard affichent les donnees de votre compte et de votre communaute. Une session active est donc necessaire pour les ouvrir.",
  },
  {
    question: "Que faire si un canal n'est plus connecte ?",
    answer:
      "Retournez dans Parametres puis Connexion reseaux sociaux pour reconnecter le canal concerne. Cela permet de retablir les publications et les actions liees.",
  },
  {
    question: "Puis-je utiliser EasyCom AI depuis mon telephone ?",
    answer:
      "Oui. L'interface est prevue pour fonctionner aussi sur mobile et tablette afin de suivre vos actions, notifications et contenus en deplacement.",
  },
  {
    question: "Comment demander une aide supplementaire ?",
    answer:
      "Si vous avez une demande precise, vous pouvez nous ecrire directement par email afin d'obtenir un accompagnement plus cible.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/dashboard/assistant"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800"
        >
          <ChevronLeft className="size-4" />
          Retour a l&apos;accueil
        </Link>

        <section className="overflow-hidden rounded-[1.9rem] border border-blue-200 bg-blue-700 shadow-[0_20px_48px_rgba(29,78,216,0.18)]">
          <div className="bg-[linear-gradient(135deg,#1d4ed8,#0ea5e9,#2563eb)] px-6 py-7 text-white sm:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-50">
                <HelpCircle className="size-3.5" />
                FAQ
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight">FAQ</h1>
              <p className="mt-3 text-sm leading-6 text-blue-50">
                Foire aux questions courantes
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {FAQ_ITEMS.map((item, index) => (
            <article
              key={item.question}
              className="rounded-[1.5rem] border border-slate-200/90 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  {index % 3 === 0 ? (
                    <HelpCircle className="size-4.5" />
                  ) : index % 3 === 1 ? (
                    <Sparkles className="size-4.5" />
                  ) : (
                    <Mail className="size-4.5" />
                  )}
                </span>
                <div className="h-1 w-10 rounded-full bg-blue-500" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">{item.question}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
            </article>
          ))}
        </section>

        <section className="rounded-[1.6rem] border border-blue-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Mail className="size-4.5" />
            </span>
            <div>
              <p className="text-base font-bold tracking-tight text-slate-900">Besoin d&apos;une aide supplementaire ?</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Contactez-nous a{" "}
                <a className="font-semibold text-blue-700 underline" href="mailto:contact@easycom-AI.com">
                  contact@easycom-AI.com
                </a>
                {" "}pour une aide plus precise.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
