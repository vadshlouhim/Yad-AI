import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function ComingSoonBanner() {
  return (
    <Link
      href="/fonctionnalites-a-venir"
      className="group relative flex min-h-[94px] w-full items-center gap-3 overflow-hidden rounded-[22px] bg-[radial-gradient(120%_120%_at_100%_0%,#8b3dff_0%,transparent_55%),radial-gradient(90%_90%_at_0%_100%,#db2777_0%,transparent_60%),linear-gradient(160deg,#3b0f8c,#22095a)] p-4 text-white shadow-[0_14px_30px_rgba(59,15,140,.3)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(59,15,140,.36)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 motion-reduce:transform-none"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/14 backdrop-blur-sm">
        <Sparkles className="size-6 text-[#FFD66B]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-base font-black leading-tight">Bientôt dans EasyCom IA</strong>
        <span className="mt-1 block text-xs font-semibold leading-5 text-white/80">6 nouveaux outils arrivent : découvrez-les</span>
      </span>
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#FFD66B] text-[#3B0F8C] shadow-lg transition group-hover:translate-x-0.5">
        <ArrowRight className="size-[18px] stroke-[2.6]" aria-hidden="true" />
      </span>
    </Link>
  );
}
