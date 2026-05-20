import { DemoFeaturePage } from "@/components/demo/demo-feature-page";

const ARTICLES = [
  { id: "ar-1", name: "Pack visuel Chabbat", price: "29 EUR", reason: "Le plus demandé par les communautés." },
  { id: "ar-2", name: "Template Hanouka premium", price: "39 EUR", reason: "Conçu pour l'engagement social." },
  { id: "ar-3", name: "Campagne collecte de dons", price: "49 EUR", reason: "Prêt à diffuser multi-canaux." },
];

export default function DemoArticlesPage() {
  return (
    <DemoFeaturePage
      title="Articles & services"
      subtitle="Catalogue demo des offres créatives et services additionnels."
      highlights={[
        "Catalogue prêt à l'emploi",
        "Recommandations intelligentes",
        "Commande simulée",
      ]}
      primaryCta={{ label: "Commander en demo" }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((article) => (
          <article key={article.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="aspect-[4/3] rounded-2xl bg-slate-100" />
            <p className="mt-3 font-semibold text-slate-900">{article.name}</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{article.price}</p>
            <p className="mt-1 text-xs text-slate-500">{article.reason}</p>
          </article>
        ))}
      </div>
    </DemoFeaturePage>
  );
}

