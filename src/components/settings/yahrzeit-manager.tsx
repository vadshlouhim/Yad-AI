"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame as Candle, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Member = { id: string; displayName: string };
type Yahrzeit = { id: string; memberId: string; deceasedName: string; deceasedHebrewName: string | null; relationship: string | null; hebrewDeathDay: number; hebrewDeathMonth: number; hebrewDeathYear: number; member?: { displayName: string } };
const empty = { memberId: "", deceasedName: "", deceasedHebrewName: "", relationship: "", fatherHebrewName: "", motherHebrewName: "", deathDate: "", deathAfterSunset: false, notes: "" };

export function YahrzeitManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Yahrzeit[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.displayName.localeCompare(b.displayName, "fr")), [members]);

  async function load() {
    const [membersResponse, yahrzeitResponse] = await Promise.all([fetch("/api/community/members", { cache: "no-store" }), fetch("/api/yahrzeits", { cache: "no-store" })]);
    if (membersResponse.ok) setMembers(await membersResponse.json());
    if (yahrzeitResponse.ok) setItems(await yahrzeitResponse.json());
  }
  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetch("/api/community/members", { cache: "no-store" }), fetch("/api/yahrzeits", { cache: "no-store" })]).then(async ([membersResponse, yahrzeitResponse]) => {
      if (cancelled) return;
      if (membersResponse.ok) setMembers(await membersResponse.json());
      if (yahrzeitResponse.ok) setItems(await yahrzeitResponse.json());
    });
    return () => { cancelled = true; };
  }, []);
  async function save() {
    setBusy(true); setError("");
    const response = await fetch("/api/yahrzeits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || "Enregistrement impossible."); else { setOpen(false); setForm(empty); await load(); }
    setBusy(false);
  }
  async function remove(item: Yahrzeit) {
    if (!window.confirm(`Supprimer le Yahrzeit de ${item.deceasedName} ?`)) return;
    const response = await fetch(`/api/yahrzeits/${item.id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((value) => value.id !== item.id));
  }

  return <section className="rounded-[1.8rem] border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><Candle className="size-5" /></span><div><h2 className="font-black text-slate-950">Yahrzeit des membres</h2><p className="mt-1 text-sm text-slate-600">Ajoutez plusieurs proches par membre, avec leur nom hébraïque et leur filiation.</p></div></div><Button onClick={() => setOpen(true)} className="rounded-xl bg-amber-700 hover:bg-amber-800"><Plus className="size-4" />Ajouter un Yahrzeit</Button></div>
    {items.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-5 text-center text-sm text-slate-500">Aucun Yahrzeit enregistré.</p> : <div className="mt-5 grid gap-2 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-3"><Candle className="size-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{item.deceasedName}{item.deceasedHebrewName ? ` · ${item.deceasedHebrewName}` : ""}</p><p className="truncate text-xs text-slate-500">Pour {item.member?.displayName ?? "membre"}{item.relationship ? ` · ${item.relationship}` : ""} · {item.hebrewDeathDay}/{item.hebrewDeathMonth}/{item.hebrewDeathYear}</p></div><Button variant="ghost" size="icon-sm" onClick={() => void remove(item)} className="text-red-600"><Trash2 className="size-4" /></Button></article>)}</div>}
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4" onClick={() => setOpen(false)}><div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h3 className="text-xl font-black">Ajouter un Yahrzeit</h3><button onClick={() => setOpen(false)} aria-label="Fermer"><X className="size-5" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })} className="h-11 rounded-xl border px-3 text-sm sm:col-span-2"><option value="">Membre concerné</option>{sortedMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select><input value={form.deceasedName} onChange={(event) => setForm({ ...form, deceasedName: event.target.value })} placeholder="Nom du proche décédé" className="h-11 rounded-xl border px-3 text-sm" /><input value={form.deceasedHebrewName} onChange={(event) => setForm({ ...form, deceasedHebrewName: event.target.value })} placeholder="Nom hébraïque" className="h-11 rounded-xl border px-3 text-sm" /><input value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} placeholder="Lien (père, mère...)" className="h-11 rounded-xl border px-3 text-sm" /><input type="date" value={form.deathDate} onChange={(event) => setForm({ ...form, deathDate: event.target.value })} aria-label="Date civile du décès" className="h-11 rounded-xl border px-3 text-sm" /><input value={form.fatherHebrewName} onChange={(event) => setForm({ ...form, fatherHebrewName: event.target.value })} placeholder="Nom hébraïque du père" className="h-11 rounded-xl border px-3 text-sm" /><input value={form.motherHebrewName} onChange={(event) => setForm({ ...form, motherHebrewName: event.target.value })} placeholder="Nom hébraïque de la mère" className="h-11 rounded-xl border px-3 text-sm" /><label className="flex items-center gap-2 rounded-xl border bg-amber-50 px-3 py-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.deathAfterSunset} onChange={(event) => setForm({ ...form, deathAfterSunset: event.target.checked })} />Décès après le coucher du soleil</label><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" rows={2} className="rounded-xl border px-3 py-2 text-sm sm:col-span-2" /></div>{error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}<div className="mt-5 flex gap-2"><Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl">Annuler</Button><Button onClick={() => void save()} disabled={busy || !form.memberId || !form.deceasedName || !form.deathDate} className="flex-1 rounded-xl bg-amber-700 hover:bg-amber-800">{busy && <Loader2 className="size-4 animate-spin" />}Enregistrer</Button></div></div></div>}
  </section>;
}
