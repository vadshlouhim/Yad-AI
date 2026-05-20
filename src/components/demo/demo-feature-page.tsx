import Link from "next/link";
import { ArrowRight, CheckCircle2, Lock } from "lucide-react";

type DemoFeaturePageProps = {
  title: string;
  subtitle: string;
  highlights?: string[];
  primaryCta?: { label: string; href?: string };
  secondaryCta?: { label: string; href?: string };
  children?: React.ReactNode;
};

export function DemoFeaturePage({
  title,
  subtitle,
  highlights = [],
  primaryCta,
  secondaryCta,
  children,
}: DemoFeaturePageProps) {
  return (
    <div className="pt-8 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Lock className="size-3.5" />
              Mode demo interactif
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {primaryCta && (
              primaryCta.href ? (
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {primaryCta.label}
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white opacity-80"
                >
                  {primaryCta.label}
                </button>
              )
            )}
            {secondaryCta && (
              secondaryCta.href ? (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {secondaryCta.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  {secondaryCta.label}
                </button>
              )
            )}
          </div>
        </div>
        {highlights.length > 0 && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((highlight) => (
              <p
                key={highlight}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
              >
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                {highlight}
              </p>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

