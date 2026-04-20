import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen brand-gradient flex flex-col items-center justify-center p-8 text-white">
      <div className="max-w-2xl text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">י</span>
          </div>
          <span className="text-3xl font-bold tracking-tight">Yad.ia</span>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold leading-tight">
            Le copilote IA de votre communauté
          </h1>
          <p className="text-xl text-blue-200 leading-relaxed">
            Centralisez, préparez et diffusez votre communication communautaire
            en un seul outil intelligent.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            "🗓️ Gestion d'événements récurrents",
            "✍️ Génération de contenu par IA",
            "📡 Diffusion multicanale automatisée",
            "🕍 Calendrier hébraïque intégré",
            "📊 Statistiques et historique",
            "🔔 Automatisations intelligentes",
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
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
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

        <p className="text-blue-300 text-sm">
          Aucune carte bancaire requise · Annulez à tout moment
        </p>
      </div>
    </div>
  );
}
