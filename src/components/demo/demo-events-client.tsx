"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Loader2, MapPin, Plus, Users } from "lucide-react";
import { useState } from "react";
import { DEMO_EVENTS } from "@/lib/demo/data";
import { useDemoState } from "./demo-state";

export function DemoEventsClient() {
  const { state, createEvent } = useDemoState();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Grand Chabbat communautaire");
  const [date, setDate] = useState("2026-08-07T19:30");
  const [location, setLocation] = useState("21 rue des Rosiers, Paris");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    window.setTimeout(() => {
      createEvent({ title, date, location });
      setSaving(false);
      setShowForm(false);
    }, 650);
  }

  const journeyEvent = state.event ? {
    id: "journey-event", title: state.event.title,
    description: "Un moment chaleureux pour réunir toute la communauté.",
    startDate: new Date(state.event.date), location: state.event.location,
    audience: "Toute la communauté", category: "CHABBAT",
  } : null;
  const items = journeyEvent ? [journeyEvent, ...DEMO_EVENTS] : DEMO_EVENTS;

  return (
    <div className="space-y-5 pt-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Parcours de démonstration · Étape 1</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Agenda et événements</h1><p className="mt-1 text-sm text-slate-500">Créez un événement fictif pour lancer toute sa communication.</p></div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus className="size-4" /> Créer un événement</button>
        </div>
        {showForm && (
          <form onSubmit={submit} className="mt-5 grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">Nom de l’événement<input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label>
            <label className="text-xs font-semibold text-slate-700">Date et heure<input required type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label>
            <label className="text-xs font-semibold text-slate-700 md:col-span-2">Lieu<input required value={location} onChange={(event) => setLocation(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400" /></label>
            <button disabled={saving} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-bold text-white md:col-span-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{saving ? "Création simulée…" : "Enregistrer l’événement fictif"}</button>
          </form>
        )}
        {state.event && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><span className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-4" /> Événement créé. L’assistant peut préparer sa communication.</span><Link href="/demo/assistant" className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Continuer avec l’IA →</Link></div>}
      </section>
      <div className="grid gap-3">
        {items.map((eventItem) => <article key={eventItem.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{eventItem.title}</p><p className="mt-1 text-sm text-slate-600">{eventItem.description}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{eventItem.category}</span></div><div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {new Date(eventItem.startDate).toLocaleDateString("fr-FR")}</span>{eventItem.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {eventItem.location}</span>}{eventItem.audience && <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {eventItem.audience}</span>}</div></article>)}
      </div>
    </div>
  );
}
