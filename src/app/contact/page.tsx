"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Home,
  Send,
  Mail, 
  MessageSquare, 
  MapPin,
  CheckCircle2,
  Loader2
} from "lucide-react";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/easycom-ai-logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
            <span className="font-black text-slate-950">Yad.ia</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="inline-flex h-9 items-center gap-2 rounded-full px-1 transition hover:text-blue-700">
              <Home className="size-4" />
              Accueil
            </Link>
            <Link href="/method" className="inline-flex h-9 items-center gap-2 rounded-full px-1 transition hover:text-blue-700">Notre Méthode</Link>
            <Link href="/contact" className="inline-flex h-9 items-center gap-2 rounded-full px-1 text-blue-700">Contact</Link>
          </nav>
          <Link href="/auth/login" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition">
            Connexion
          </Link>
        </div>
      </header>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl mb-8">
                Parlons de votre <span className="text-blue-600">projet</span>.
              </h1>
              <p className="text-lg text-slate-600 mb-12">
                Vous avez une question, besoin d&apos;une démo personnalisée ou d&apos;un accompagnement spécifique ? Notre équipe est là pour vous aider.
              </p>

              <div className="space-y-8">
                {[
                  { icon: Mail, label: "Email", value: "contact@easycom-AI.com", color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: MessageSquare, label: "Support", value: "Disponible 7j/7 via l'application", color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: MapPin, label: "Bureaux", value: "Paris, France", color: "text-amber-600", bg: "bg-amber-50" }
                ].map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className={`p-3 rounded-xl ${item.bg}`}>
                      <item.icon className={`size-6 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                      <p className="text-slate-950 font-bold">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
              {status === "success" ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-950">Message envoyé !</h2>
                  <p className="text-slate-600">Merci de nous avoir contactés. Notre équipe vous répondra sous 24h.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-700">Nom</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="Jean Dupont"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-black text-slate-700">Email</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="jean@exemple.com"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition outline-none" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700">Sujet</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Comment puis-je vous aider ?"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-slate-700">Message</label>
                    <textarea 
                      required 
                      rows={5} 
                      placeholder="Votre message ici..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition outline-none resize-none" 
                    />
                  </div>
                  <button 
                    disabled={status === "loading"}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {status === "loading" ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>Envoyer le message <Send className="size-5" /></>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black text-center mb-12">FAQ Contact & Support</h2>
          <div className="space-y-4">
            {[
              { q: "Quels sont vos délais de réponse ?", a: "Nous répondons généralement en moins de 24h ouvrées. Pour les urgences, nos clients premium disposent d'un accès prioritaire." },
              { q: "Proposez-vous des démos en direct ?", a: "Oui ! Indiquez-le dans votre message et nous conviendrons d'un créneau pour vous montrer la puissance de l'outil." },
              { q: "Où êtes-vous basés ?", a: "Notre équipe est basée à Paris, mais nous travaillons avec des communautés et entreprises dans le monde entier." }
            ].map(faq => (
              <div key={faq.q} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
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


