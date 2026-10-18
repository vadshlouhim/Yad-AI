import Link from "next/link";
import type { Metadata } from "next";
import { PublicFooter } from "@/components/layout/public-footer";
import { LegalLanguageNotice } from "@/components/i18n/legal-language-notice";

export const metadata: Metadata = {
  title: "Conditions d’utilisation - EasyCom IA",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <LegalLanguageNotice />
      <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          Retour à l’accueil
        </Link>
        <h1 className="text-3xl font-bold">Conditions d’utilisation</h1>
        <p className="leading-7 text-slate-600">
          EasyCom IA aide les communautés à préparer, organiser et diffuser leurs contenus.
          L’utilisateur reste responsable des informations saisies, des validations finales et
          des publications envoyées vers ses canaux.
        </p>
        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold">Annonces et ventes entre utilisateurs</h2>
          <p className="leading-7 text-slate-600">
            La rubrique communautaire met directement en relation des utilisateurs particuliers.
            Le vendeur est responsable de son annonce, de ses droits sur le contenu, du prix, du
            paiement, de la remise ou de l’expédition et, le cas échéant, du remboursement.
            EasyCom-AI ne collecte pas le paiement et n’est pas partie à la transaction.
          </p>
          <p className="leading-7 text-slate-600">
            Les contenus interdits, illicites, trompeurs ou portant atteinte aux droits d’un tiers
            peuvent être signalés et retirés. La vente professionnelle n’est pas autorisée dans
            cette première version du service.
          </p>
        </section>
        <p className="leading-7 text-slate-600">
          Pour toute question contractuelle, signalement ou demande spécifique, contactez l’équipe à{" "}
          <a className="font-semibold text-blue-600 underline" href="mailto:contact@easycom-AI.com">
            contact@easycom-AI.com
          </a>
          .
        </p>
      </div>
      <PublicFooter />
    </main>
  );
}
