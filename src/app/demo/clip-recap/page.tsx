import { DemoFeaturePage } from "@/components/demo/demo-feature-page";

export default function DemoClipRecapPage() {
  return (
    <DemoFeaturePage
      title="Clip récap"
      subtitle="Synthèse visuelle hebdomadaire des activités communautaires en mode demo."
      highlights={[
        "Timeline automatique",
        "Montage assisté",
        "Export prêt à publier",
      ]}
      primaryCta={{ label: "Créer un clip demo" }}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900" />
        <p className="mt-3 text-sm text-slate-600">
          Aperçu demo: 45 secondes, 6 séquences, musique et sous-titres auto.
        </p>
      </div>
    </DemoFeaturePage>
  );
}

