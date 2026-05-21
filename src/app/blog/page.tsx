import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight,
  Clock,
  User,
  Tag
} from "lucide-react";

const POSTS = [
  {
    title: "Comment l'IA transforme la communication de proximité en 2026",
    excerpt: "Découvrez pourquoi les outils d'intelligence artificielle ne sont plus réservés aux géants de la tech.",
    category: "Tendance",
    date: "15 Mai 2026",
    author: "L'équipe EasyCom",
    color: "bg-blue-100 text-blue-700"
  },
  {
    title: "5 astuces pour automatiser vos rappels WhatsApp sans paraître robotique",
    excerpt: "Le secret d'une communication automatisée réussie réside dans la personnalisation du ton de voix.",
    category: "Guide",
    date: "10 Mai 2026",
    author: "Expert IA",
    color: "bg-emerald-100 text-emerald-700"
  },
  {
    title: "Pourquoi la cohérence visuelle est votre meilleur atout de vente",
    excerpt: "Une identité graphique forte renforce la confiance de votre communauté et booste vos conversions.",
    category: "Design",
    date: "05 Mai 2026",
    author: "Creative Team",
    color: "bg-amber-100 text-amber-700"
  }
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/easycom-ai-logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
            <span className="font-black text-slate-950">EasyCom AI</span>
          </Link>
          <nav className="hidden gap-8 md:flex">
            <Link href="/features" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Fonctionnalités</Link>
            <Link href="/method" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Méthode</Link>
            <Link href="/blog" className="text-sm font-bold text-blue-600">Blog</Link>
            <Link href="/contact" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Contact</Link>
          </nav>
          <Link href="/auth/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition">
            Connexion
          </Link>
        </div>
      </header>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl mb-6">
            Le Blog <span className="text-blue-600">EasyCom AI</span>
          </h1>
          <p className="text-lg text-slate-600">
            Conseils, guides et actualités pour maîtriser votre communication communautaire grâce à l'IA.
          </p>
        </div>

        <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
            <article key={post.title} className="flex flex-col rounded-3xl border border-slate-200 bg-white overflow-hidden transition hover:shadow-xl hover:-translate-y-1">
              <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center border-b border-slate-200">
                <span className="text-slate-400 font-bold italic">Image de l'article</span>
              </div>
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${post.color}`}>
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <Clock className="size-3" />
                    {post.date}
                  </div>
                </div>
                <h2 className="text-xl font-black text-slate-950 mb-4 leading-tight group-hover:text-blue-600 transition">
                  {post.title}
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="size-3 text-slate-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">{post.author}</span>
                  </div>
                  <Link href="#" className="text-blue-600 font-black text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Lire <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black text-center mb-12">FAQ Blog & Ressources</h2>
          <div className="space-y-4">
            {[
              { q: "À quelle fréquence publiez-vous de nouveaux articles ?", a: "Nous publions environ deux articles par semaine pour vous tenir au courant des dernières innovations en IA et communication." },
              { q: "Puis-je proposer un sujet d'article ?", a: "Absolument ! Nous adorons traiter les cas d'usage concrets de nos utilisateurs. Contactez-nous via la page dédiée." },
              { q: "Proposez-vous une newsletter ?", a: "Oui, vous pouvez vous inscrire pour recevoir nos meilleurs conseils directement dans votre boîte mail chaque lundi matin." }
            ].map(faq => (
              <div key={faq.q} className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="font-black text-slate-950 mb-2">{faq.q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
