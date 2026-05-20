import { DemoFeaturePage } from "@/components/demo/demo-feature-page";

export default function DemoTorahPage() {
  return (
    <DemoFeaturePage
      title="Cours de Torah IA"
      subtitle="Creation assistee de contenus d'etude: plans de cours, resumes, questions/reponses."
      highlights={[
        "Plans de cours guides",
        "Synthese de paracha",
        "Version courte pour reseaux",
      ]}
      primaryCta={{ label: "Generer un cours demo" }}
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-900">Exemple genere</p>
        <p className="mt-2 text-sm text-slate-600">
          &quot;Parachat Vayera: hospitalite, confiance et responsabilite. Version cours 20 min + version post Instagram + version message WhatsApp.&quot;
        </p>
      </div>
    </DemoFeaturePage>
  );
}
