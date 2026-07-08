import Link from "next/link";
import { Lock, CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  title: string;
  description: string;
  features: string[];
}

/** Écran plein-page affiché à la place d'une fonctionnalité réservée à l'offre Business */
export function BusinessFeatureLocked({ title, description, features }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-100">
        <Lock className="size-7 text-blue-700" />
      </div>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
        Réservé à l&apos;offre Business
      </div>
      <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-6 grid w-full gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-left text-sm text-slate-700">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/settings/billing"
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
      >
        Passer à l&apos;offre Business
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
