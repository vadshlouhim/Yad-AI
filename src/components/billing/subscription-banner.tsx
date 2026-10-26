import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { trialDaysLeft, type CommunityAccess } from "@/lib/billing/subscription-policy";

/** Trial countdown or read-only notice shown above every dashboard page; hidden for subscribers. */
export async function SubscriptionBanner({ access, createdAt }: { access: CommunityAccess; createdAt: string }) {
  if (access === "subscribed") return null;
  const t = await getTranslations("billing");
  const readOnly = access === "readonly";

  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 py-2 text-sm font-bold", readOnly ? "bg-amber-100 text-amber-950" : "bg-[#f0e8ff] text-[#2f0d70]")} role="status">
      <span className="flex min-w-0 items-center gap-2">
        {readOnly ? <Lock className="size-4 shrink-0" /> : <Sparkles className="size-4 shrink-0" />}
        <span className="truncate">{readOnly ? t("bannerReadOnly") : t("bannerTrial", { days: trialDaysLeft(createdAt) })}</span>
      </span>
      <Link href="/dashboard/settings/billing" className="shrink-0 rounded-full bg-[#421388] px-3 py-1 text-xs font-black text-white hover:bg-[#2f0d70]">
        {t("bannerCta")}
      </Link>
    </div>
  );
}
