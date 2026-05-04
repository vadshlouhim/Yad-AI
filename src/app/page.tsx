import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen brand-gradient flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12 text-white">
      <div className="max-w-5xl text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">ש</span>
          </div>
          <span className="text-3xl font-bold tracking-tight">Shalom IA</span>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Le copilote IA de votre communauté
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-blue-200 sm:text-xl">
            Centralisez, préparez et diffusez votre communication communautaire
            en un seul outil intelligent.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            "📱 Gestion des réseaux sociaux",
            "🤖 Assistant du quotidien",
            "📝 Contenus et publications automatiques",
            "💬 Messagerie connectée",
            "🖼️ Banque visuelle",
            "📅 Agenda intelligent",
          ].map((feat) => (
            <div
              key={feat}
              className="flex items-center bg-white/10 rounded-xl px-4 py-3 text-left"
            >
              <span className="text-blue-100">{feat}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors"
          >
            Démarrer gratuitement — 14 jours
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-white/20 text-white font-semibold hover:bg-white/30 transition-colors border border-white/30"
          >
            ✨ Voir la démo
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center h-12 px-8 rounded-xl border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
          >
            Se connecter
          </Link>
        </div>

        <p className="text-sm text-blue-300">
          Aucune carte bancaire requise · Annulez à tout moment
        </p>

        <div className="flex justify-center gap-4 text-xs text-blue-200">
          <Link href="/privacy" className="hover:text-white hover:underline">
            Politique de confidentialité
          </Link>
          <Link href="/data-deletion" className="hover:text-white hover:underline">
            Suppression des données
          </Link>
        </div>
      </div>
    </div>
  );
}
