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
          <h2 className="text-xl font-bold">Abonnement et essai gratuit</h2>
          <p className="leading-7 text-slate-600">
            Chaque communauté bénéficie d’un essai gratuit de 7 jours, sans carte bancaire, à compter
            de sa création. EasyCom IA propose ensuite un abonnement unique, mensuel ou annuel, sans
            engagement et résiliable à tout moment. Sans abonnement actif après l’essai, le compte
            reste consultable en lecture seule : les contenus existants restent accessibles, mais
            la création de nouveaux contenus est suspendue.
          </p>
        </section>
        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-bold">Modèles d’affiches et liens Canva</h2>
          <p className="leading-7 text-slate-600">
            Les modèles d’affiches et les liens Canva fournis par EasyCom IA sont réservés à l’usage
            de la communauté abonnée, pour sa propre communication. Il est interdit de les
            transmettre, de les publier, de les revendre ou de les mettre à disposition de personnes
            ou de structures qui ne disposent pas de leur propre abonnement.
          </p>
          <p className="leading-7 text-slate-600">
            Chaque ouverture d’un modèle Canva est enregistrée (compte, communauté, date). En cas
            d’utilisation contraire à ces conditions, EasyCom IA peut suspendre l’accès aux modèles
            ou au compte concerné.
          </p>
        </section>
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
