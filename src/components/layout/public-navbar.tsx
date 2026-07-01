import Image from "next/image";
import Link from "next/link";
import { BookOpen, CheckCircle2, LogIn, MessageCircle } from "lucide-react";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/easycom-ai-logo.png"
            alt="Logo EasyCom IA"
            width={40}
            height={40}
            sizes="40px"
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-cover p-1 shadow-sm"
            priority
          />
          <div className="leading-tight">
            <p className="text-sm font-black tracking-tight text-slate-950">EasyCom IA</p>
            <p className="text-xs font-medium text-slate-500">Votre assistant communication IA</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          <Link href="/" className="inline-flex h-9 items-center gap-2 rounded-full px-1 transition hover:text-blue-700">
            Accueil
          </Link>
          <Link href="/method" className="inline-flex h-9 items-center gap-2 rounded-full px-1 transition hover:text-emerald-700">
            <CheckCircle2 className="size-4" />
            Notre Méthode
          </Link>
          <Link href="/blog" className="inline-flex h-9 items-center gap-2 rounded-full px-1 transition hover:text-blue-700">
            <BookOpen className="size-4" />
            Blog
          </Link>
          <Link href="/contact" className="inline-flex h-9 items-center gap-2 rounded-full px-1 transition hover:text-indigo-700">
            <MessageCircle className="size-4" />
            Contact
          </Link>
        </nav>

        <Link
          href="/auth/login"
          className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <LogIn className="mr-2 size-4" />
          Essayer maintenant
        </Link>
      </div>
    </header>
  );
}
