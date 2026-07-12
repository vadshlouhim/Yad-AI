import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/billing";

export interface PlanFeature {
  label: string;
  included: boolean;
}

interface Props {
  tier: PlanTier;
  title: string;
  priceLabel: string;
  priceSuffix?: string;
  features: Array<string | PlanFeature>;
  badge?: string;
  highlighted?: boolean;
  /** Rend toute la carte cliquable (usage sélecteur, ex. onboarding) */
  selected?: boolean;
  onClick?: () => void;
  /** Zone d'action personnalisée (usage page Facturation) */
  footer?: ReactNode;
}

const TIER_ACCENT: Record<PlanTier, string> = {
  FREE: "border-slate-200",
  PRO: "border-blue-600",
  BUSINESS: "border-violet-600",
};

export function PlanCard({
  tier,
  title,
  priceLabel,
  priceSuffix = "/mois",
  features,
  badge,
  highlighted = false,
  selected = false,
  onClick,
  footer,
}: Props) {
  const isClickable = typeof onClick === "function";

  const content = (
    <>
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold text-white",
              tier === "BUSINESS" ? "bg-violet-600" : tier === "PRO" ? "bg-blue-600" : "bg-slate-950"
            )}
          >
            {badge}
          </span>
        </div>
      )}
      <div className="flex min-h-24 flex-col justify-end text-center">
        <p className="text-base font-black text-slate-950 sm:text-lg">{title}</p>
        <div className="mt-3 flex min-h-10 flex-nowrap items-end justify-center gap-1 whitespace-nowrap">
          <span className="whitespace-nowrap text-2xl font-black tracking-tight text-slate-950">{priceLabel}</span>
          {priceLabel !== "0 €" && <span className="whitespace-nowrap pb-1 text-xs font-semibold text-slate-500">{priceSuffix}</span>}
        </div>
      </div>
      <ul className="space-y-2.5 text-left">
        {features.map((feature) => {
          const { label, included } = typeof feature === "string" ? { label: feature, included: true } : feature;

          return (
            <li
              key={label}
              className={cn(
                "flex min-h-5 items-start gap-2 text-xs leading-5 sm:text-sm",
                included ? "text-slate-700" : "text-slate-400 line-through"
              )}
            >
              {included ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-slate-300" aria-hidden="true" />
              )}
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
      {footer}
    </>
  );

  const className = cn(
    "relative space-y-5 rounded-3xl border-2 bg-white p-6 shadow-sm transition-all",
    selected || highlighted ? TIER_ACCENT[tier] : "border-slate-200",
    tier === "PRO" && badge && "plan-card-popular",
    selected && (tier === "BUSINESS" ? "bg-violet-50/40" : tier === "PRO" ? "bg-blue-50/40" : "bg-slate-50"),
    isClickable && "cursor-pointer hover:border-slate-300 text-left"
  );

  if (isClickable) {
    return (
      <button type="button" onClick={onClick} className={cn(className, "w-full")}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
