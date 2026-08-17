"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    router.replace(isMobile ? "/dashboard/overview" : "/dashboard/assistant");
  }, [router]);

  return (
    <main className="flex min-h-[50dvh] items-center justify-center" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-[#421388] shadow-sm">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        Ouverture d&apos;EasyCom IA…
      </div>
    </main>
  );
}
