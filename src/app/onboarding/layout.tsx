import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuration de votre communauté — Yad.ia",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header minimaliste onboarding */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center">
              <span className="text-white font-bold text-sm">י</span>
            </div>
            <span className="font-semibold text-slate-900">Yad.ia</span>
          </div>
          <span className="text-xs text-slate-400">Configuration initiale</span>
        </div>
      </header>

      <main className="pt-14">{children}</main>
    </div>
  );
}
