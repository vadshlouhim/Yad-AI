import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, HelpCircle, Mail, MessageCircle, Sparkles } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";

export const metadata: Metadata = {
  title: "FAQ - EasyCom IA",
  description: "Foire aux questions courantes et support EasyCom IA",
};

const FAQ_ITEMS = [
  {
    question: "Comment connecter mes reseaux sociaux ?",
    answer:
      "Depuis Parametres puis Connexion reseaux sociaux, choisissez le canal a connecter et suivez le parcours propose pour autoriser EasyCom IA.",
  },
  {
    question: "A quoi servent les automatisations ?",
    answer:
      "Les automatisations servent a preparer a l'avance vos contenus recurrents, rappels, messages et publications pour gagner du temps au quotidien.",
  },
  {
    question: "Est-ce que les publications partent automatiquement ?",
    answer:
      "Selon le canal connecte et votre configuration, EasyCom IA peut preparer, programmer ou publier. Certains canaux demandent une validation ou une connexion prealable.",
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
    question: "Comment repondre a un avis Google avec EasyCom IA ?",
    answer:
      "Dans Avis Google, l'assistant peut vous aider a formuler une reponse rapide, polie et adaptee au contexte du message recu.",
  },
  {
    question: "Puis-je preparer du contenu pour WhatsApp, Facebook et Instagram ?",
    answer:
      "Oui. EasyCom IA peut vous aider a adapter le meme message pour plusieurs canaux avec un ton et un format plus coherents pour chacun.",
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
    question: "Puis-je utiliser EasyCom IA depuis mon telephone ?",
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

        <AgentPageBanner
          eyebrow="Centre d’aide"
          title="FAQ"
          description="Retrouvez les réponses essentielles pour utiliser EasyCom IA, connecter vos outils et comprendre les principales rubriques du dashboard."
          icon={HelpCircle}
          tone="purple"
        />

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
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Mail className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold tracking-tight text-slate-900">Besoin d&apos;une aide supplementaire ?</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Envoyez-nous votre demande depuis le formulaire de contact afin que l’équipe puisse vous répondre proprement.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#421388] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(66,19,136,0.18)] transition hover:-translate-y-0.5 hover:bg-[#35106f] sm:w-auto"
            >
              <MessageCircle className="size-4" />
              Contacter l’équipe
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
