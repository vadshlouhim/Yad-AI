import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité de Yad.ia.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          Retour à l&apos;accueil
        </Link>

        <div className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Yad.ia</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Politique de confidentialité
            </h1>
            <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : 28 avril 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">1. Données collectées</h2>
            <p className="leading-7">
              Yad.ia collecte les informations nécessaires à la création et à la gestion d&apos;un
              compte utilisateur, d&apos;une communauté, de ses canaux de communication, de ses
              contenus, de ses contacts membres et de ses publications.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">2. Utilisation des données</h2>
            <p className="leading-7">
              Les données sont utilisées pour fournir les fonctionnalités de l&apos;application :
              génération de contenus assistée par IA, préparation d&apos;affiches, calendrier
              communautaire, envoi ou préparation de messages, publication sur les canaux connectés
              et gestion des contacts de la communauté.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">3. Connexion Facebook et Instagram</h2>
            <p className="leading-7">
              Lorsque vous connectez Facebook ou Instagram, Yad.ia utilise l&apos;autorisation OAuth
              Meta afin d&apos;accéder uniquement aux Pages Facebook ou comptes Instagram professionnels
              que vous autorisez. Ces accès servent à identifier les canaux connectés et à publier
              les contenus que vous validez depuis l&apos;application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">4. Contacts de la communauté</h2>
            <p className="leading-7">
              Les contacts ajoutés manuellement ou importés depuis un smartphone sont utilisés comme
              destinataires de communications communautaires, notamment par email ou WhatsApp. Ces
              contacts ne disposent pas d&apos;accès administrateur à Yad.ia.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">5. Partage des données</h2>
            <p className="leading-7">
              Yad.ia ne vend pas les données personnelles. Certaines données peuvent être transmises
              à des services techniques nécessaires au fonctionnement de l&apos;application, comme
              l&apos;hébergement, l&apos;authentification, l&apos;envoi d&apos;emails, les services IA ou les API
              de publication connectées par l&apos;utilisateur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">6. Sécurité et conservation</h2>
            <p className="leading-7">
              Les données sont conservées aussi longtemps que nécessaire pour fournir le service ou
              respecter les obligations légales applicables. Les accès sensibles, comme les jetons
              OAuth, sont stockés côté serveur et ne sont pas exposés publiquement.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">7. Suppression des données</h2>
            <p className="leading-7">
              Vous pouvez demander la suppression de vos données ou la révocation des accès connectés
              en contactant l&apos;équipe Yad.ia. Vous pouvez également déconnecter les canaux sociaux
              depuis les paramètres de l&apos;application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">8. Contact</h2>
            <p className="leading-7">
              Pour toute question relative à cette politique ou à vos données, contactez-nous à :
              <a className="ml-1 font-medium text-blue-600 hover:underline" href="mailto:contact@shalom-ia.com">
                contact@shalom-ia.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
