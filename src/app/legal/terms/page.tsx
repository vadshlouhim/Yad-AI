import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d’utilisation - EasyCom IA",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
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
        <p className="leading-7 text-slate-600">
          Pour toute question contractuelle ou demande spécifique, contactez l’équipe à{" "}
          <a className="font-semibold text-blue-600 underline" href="mailto:contact@easycom-AI.com">
            contact@easycom-AI.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
