"use client";

import { useState } from "react";
import Link from "next/link";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { ArrowRight, CheckCircle2, Headphones, Loader2, Mail, MapPin, MessageSquare, Send } from "lucide-react";

const CONTACT_POINTS = [
  { icon: Mail, label: "Email", value: "Remplissez le formulaire", color: "text-blue-700", bg: "bg-blue-50" },
  { icon: MessageSquare, label: "Support", value: "Disponible via l’application", color: "text-emerald-700", bg: "bg-emerald-50" },
  { icon: MapPin, label: "Bureaux", value: "Paris, France", color: "text-amber-700", bg: "bg-amber-50" },
];

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pageUrl: typeof window !== "undefined" ? window.location.href : "/contact",
        }),
      });
      const payload = await response.json();
      if (!response.ok && response.status !== 202) {
        throw new Error(payload.error ?? "Impossible d'envoyer votre message.");
      }
      setStatus("success");
      setForm({ name: "", email: "", phone: "", organization: "", subject: "", message: "" });
      setTimeout(() => setStatus("idle"), 3000);
    } catch (submitError) {
      setStatus("error");
      setError(submitError instanceof Error ? submitError.message : "Impossible d'envoyer votre message.");
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicNavbar />

      <section className="border-b border-slate-200 bg-white px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            <Headphones className="size-4" />
            Contact EasyCom IA
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-[clamp(2.35rem,7vw,4.5rem)] font-black leading-[1.02] tracking-tight">
            Parlons de votre communication
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Une question, une démo, un besoin de configuration ? Envoyez-nous un message et on vous répond rapidement.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {CONTACT_POINTS.map((item) => (
            <article key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className={`mx-auto flex size-12 items-center justify-center rounded-2xl ${item.bg}`}>
                <item.icon className={`size-6 ${item.color}`} />
              </div>
              <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-sm font-black text-slate-950">{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/70 sm:p-8">
          {status === "success" ? (
            <div className="flex min-h-[26rem] flex-col items-center justify-center space-y-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-950">Message envoyé !</h2>
              <p className="text-slate-600">Merci de nous avoir contactés. Notre équipe vous répondra sous 24h.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Nom" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required placeholder="Jean Dupont" />
                <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} required placeholder="jean@exemple.com" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Téléphone" type="tel" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="+33 6 12 34 56 78" />
                <Field label="Organisation" value={form.organization} onChange={(value) => setForm((current) => ({ ...current, organization: value }))} placeholder="Association, synagogue, commerce..." />
              </div>
              <Field label="Sujet" value={form.subject} onChange={(value) => setForm((current) => ({ ...current, subject: value }))} required placeholder="Comment pouvons-nous vous aider ?" />
              <div className="space-y-2 text-left">
                <label className="text-sm font-black text-slate-700">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Votre message ici..."
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              {status === "error" && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}
              <button
                disabled={status === "loading"}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-700 px-6 text-sm font-black text-white transition hover:bg-blue-800 disabled:opacity-70"
              >
                {status === "loading" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>Envoyer le message <Send className="ml-2 size-5" /></>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="px-4 py-16 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-blue-700">FAQ Contact & Support</p>
          <h2 className="mt-3 text-3xl font-black">Avant de nous écrire</h2>
          <div className="mt-10 space-y-4">
            {[
              { q: "Quels sont vos délais de réponse ?", a: "Nous répondons généralement en moins de 24h ouvrées." },
              { q: "Proposez-vous des démos en direct ?", a: "Oui. Indiquez-le dans votre message et nous conviendrons d’un créneau." },
              { q: "Où êtes-vous basés ?", a: "Notre équipe est basée à Paris, avec un accompagnement à distance." },
            ].map((faq) => (
              <article key={faq.q} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-black text-slate-950">{faq.q}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{faq.a}</p>
              </article>
            ))}
          </div>
          <Link href="/tarification" className="mt-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-black text-blue-800 transition hover:bg-blue-100">
            Voir les offres <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2 text-left">
      <label className="text-sm font-black text-slate-700">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}
