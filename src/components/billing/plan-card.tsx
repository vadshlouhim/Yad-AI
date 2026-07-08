import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/billing";

interface Props {
  tier: PlanTier;
  title: string;
  priceLabel: string;
  priceSuffix?: string;
  features: string[];
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
      <div className="text-center">
        <p className="text-lg font-black text-slate-950">{title}</p>
        <div className="mt-3 flex items-end justify-center gap-1">
          <span className="text-3xl font-black text-slate-950">{priceLabel}</span>
          {priceLabel !== "0 €" && <span className="pb-1 text-sm font-semibold text-slate-500">{priceSuffix}</span>}
        </div>
      </div>
      <ul className="space-y-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {footer}
    </>
  );

  const className = cn(
    "relative space-y-5 rounded-3xl border-2 bg-white p-6 shadow-sm transition-all",
    selected || highlighted ? TIER_ACCENT[tier] : "border-slate-200",
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
