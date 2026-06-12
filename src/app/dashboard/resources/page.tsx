import type { Metadata } from "next";
import { BookOpen, FileAudio, FileText, Upload, WandSparkles } from "lucide-react";

export const metadata: Metadata = { title: "Mes ressources - Yad.ia" };

const resourceCards = [
  {
    title: "Audios",
    description: "Téléversez vos cours, notes vocales et capsules audio pour les retrouver facilement.",
    icon: FileAudio,
    tone: "from-rose-50 to-orange-50 border-rose-100 text-rose-700",
  },
  {
    title: "Documents",
    description: "Ajoutez vos documents, feuilles de travail et supports déjà préparés par votre équipe.",
    icon: FileText,
    tone: "from-blue-50 to-cyan-50 border-blue-100 text-blue-700",
  },
  {
    title: "Publication rapide",
    description: "Gardez tout ici, puis transformez et publiez vos ressources en quelques clics.",
    icon: WandSparkles,
    tone: "from-emerald-50 to-teal-50 border-emerald-100 text-emerald-700",
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a,#1e3a8a,#2563eb)] p-[1px] shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
        <div className="rounded-[calc(2rem-1px)] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.94),rgba(37,99,235,0.9))] px-6 py-7 text-white sm:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
              <BookOpen className="size-3.5" />
              Mes ressources
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">Vos contenus prêts à être retrouvés, retravaillés et publiés</h1>
            <p className="mt-3 text-sm leading-6 text-blue-50/90">
              Ici, les membres de votre équipe pourront téléverser des audios et des documents déjà travaillés.
              Ils resteront stockés dans cet espace, puis pourront être publiés en quelques clics.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {resourceCards.map((card) => (
          <article
            key={card.title}
            className={`rounded-[1.75rem] border bg-gradient-to-br p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] ${card.tone}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <card.icon className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-900">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.9rem] border border-dashed border-slate-300 bg-white p-6 text-center shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Upload className="size-5" />
        </div>
        <h2 className="mt-4 text-xl font-black text-slate-900">Espace de téléversement à venir</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          La prochaine étape consistera à déposer ici vos fichiers audio et vos documents pour les centraliser,
          puis les publier rapidement dans Yad.ia.
        </p>
      </section>
    </div>
  );
}

