import { DemoFeaturePage } from "@/components/demo/demo-feature-page";
import { DEMO_DRAFTS } from "@/lib/demo/data";

export default function DemoTemplatesPage() {
  return (
    <DemoFeaturePage
      title="Affiches"
      subtitle="Bibliothèque visuelle demo avec sélection rapide, personnalisation guidée et génération simulée."
      highlights={[
        "Suggestions par thème",
        "Prévisualisation instantanée",
        "Personnalisation avant publication",
      ]}
      primaryCta={{ label: "Générer une affiche demo" }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_DRAFTS.map((draft) => (
          <article key={draft.id} className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-blue-100 via-sky-50 to-amber-100" />
            <p className="mt-3 text-sm font-bold text-slate-900">{draft.title ?? "Affiche communautaire"}</p>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{draft.body}</p>
            <button type="button" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              Ouvrir en mode demo
            </button>
          </article>
        ))}
      </div>
    </DemoFeaturePage>
  );
}

