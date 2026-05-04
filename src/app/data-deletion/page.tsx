import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suppression des données",
  description: "Instructions pour demander la suppression des données Shalom IA.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          Retour à l&apos;accueil
        </Link>

        <div className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Shalom IA</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Instructions pour la suppression des données
            </h1>
            <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : 28 avril 2026</p>
          </div>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Demander la suppression</h2>
            <p className="leading-7">
              Vous pouvez demander la suppression de votre compte Shalom IA, de votre communauté, de
              vos contacts, contenus, canaux connectés et données associées en nous envoyant une
              demande par email.
            </p>
            <p className="leading-7">
              Envoyez votre demande à :
              <a className="ml-1 font-medium text-blue-600 hover:underline" href="mailto:contact@shalom-ia.com">
                contact@shalom-ia.com
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Informations à fournir</h2>
            <p className="leading-7">
              Pour traiter votre demande, indiquez l&apos;adresse email de votre compte, le nom de
              votre communauté et, si applicable, les canaux Facebook ou Instagram connectés.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Déconnexion Facebook et Instagram</h2>
            <p className="leading-7">
              Vous pouvez également révoquer l&apos;accès de Shalom IA depuis votre compte Meta ou depuis
              les paramètres de l&apos;application Shalom IA dans la section Canaux. La révocation supprime
              l&apos;autorisation de publier via les API Meta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-950">Délai de traitement</h2>
            <p className="leading-7">
              Les demandes de suppression sont traitées dans un délai raisonnable. Une confirmation
              peut vous être envoyée lorsque la suppression est finalisée.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
