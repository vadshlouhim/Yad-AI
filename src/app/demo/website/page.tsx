import { DemoFeaturePage } from "@/components/demo/demo-feature-page";

export default function DemoWebsitePage() {
  return (
    <DemoFeaturePage
      title="Création site web"
      subtitle="Parcours guidé pour générer la vitrine communautaire avec événements, horaires et contact."
      highlights={[
        "Sections prédéfinies",
        "Synchronisation agenda",
        "Style personnalisable",
      ]}
      primaryCta={{ label: "Générer un site demo" }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Structure proposée</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>Accueil + identité communauté</li>
            <li>Événements à venir</li>
            <li>Horaires Chabbat</li>
            <li>Contact et dons</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Statut demo</p>
          <p className="mt-2 text-sm text-slate-600">Prévisualisation active. Publication simulée en environnement demo.</p>
        </div>
      </div>
    </DemoFeaturePage>
  );
}

