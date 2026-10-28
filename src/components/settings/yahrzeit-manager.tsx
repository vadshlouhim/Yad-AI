"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame as Candle, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentHebrewDate, getHebrewMonthsForYear } from "@/lib/contacts/hebrew-birthday";

type Member = { id: string; displayName: string };
type Yahrzeit = { id: string; memberId: string; deceasedName: string; deceasedHebrewName: string | null; relationship: string | null; hebrewDeathDay: number; hebrewDeathMonth: number; hebrewDeathYear: number; member?: { displayName: string } };
const empty = { memberId: "", deceasedName: "", deceasedHebrewName: "", relationship: "", fatherHebrewName: "", motherHebrewName: "", deathDate: "", deathAfterSunset: false, notes: "", hebrewDeathDay: "", hebrewDeathMonth: "", hebrewDeathYear: "" };
const fieldClass = "h-11 w-full rounded-xl border px-3 text-sm";
const labelClass = "block text-xs font-bold text-slate-700";

export function YahrzeitManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Yahrzeit[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Many families only know the Hebrew date of death: both calendars are offered.
  const [dateMode, setDateMode] = useState<"civil" | "hebrew">("civil");
  const [newMemberName, setNewMemberName] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const hebrewYearForMonths = Number(form.hebrewDeathYear) >= 3761 ? Number(form.hebrewDeathYear) : getCurrentHebrewDate(Intl.DateTimeFormat().resolvedOptions().timeZone).getFullYear();
  const dateComplete = dateMode === "civil" ? Boolean(form.deathDate) : Boolean(form.hebrewDeathDay && form.hebrewDeathMonth && form.hebrewDeathYear);
  const missing = [!form.memberId && "le membre concerné", !form.deceasedName.trim() && "le nom du proche décédé", !dateComplete && "la date du décès"].filter(Boolean) as string[];
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
    const { hebrewDeathDay, hebrewDeathMonth, hebrewDeathYear, ...rest } = form;
    const body = dateMode === "civil"
      ? rest
      : { ...rest, deathDate: "", hebrewDeathDay: Number(hebrewDeathDay), hebrewDeathMonth: Number(hebrewDeathMonth), hebrewDeathYear: Number(hebrewDeathYear) };
    const response = await fetch("/api/yahrzeits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error || "Enregistrement impossible."); else { setOpen(false); setForm(empty); setDateMode("civil"); await load(); }
    setBusy(false);
  }
  /** The person who commemorates may not be in the CRM yet: create them without leaving the form. */
  async function addMember() {
    const name = newMemberName.trim();
    if (!name) return;
    setAddingMember(true); setError("");
    const [firstName, ...others] = name.split(/\s+/);
    const response = await fetch("/api/community/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName, lastName: others.join(" ") }) });
    const payload = await response.json().catch(() => null);
    const created = Array.isArray(payload) ? payload[0] as Member | undefined : undefined;
    if (!response.ok || !created) setError(payload?.error || "Impossible d’ajouter ce membre.");
    else { setMembers((current) => [...current, created]); setForm((current) => ({ ...current, memberId: created.id })); setNewMemberName(""); }
    setAddingMember(false);
  }
  async function remove(item: Yahrzeit) {
    if (!window.confirm(`Supprimer le Yahrzeit de ${item.deceasedName} ?`)) return;
    const response = await fetch(`/api/yahrzeits/${item.id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((value) => value.id !== item.id));
  }

  return <section className="rounded-[1.8rem] border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><Candle className="size-5" /></span><div><h2 className="font-black text-slate-950">Yahrzeit des membres</h2><p className="mt-1 text-sm text-slate-600">Ajoutez plusieurs proches par membre, avec leur nom hébraïque et leur filiation.</p></div></div><Button onClick={() => setOpen(true)} className="rounded-xl bg-amber-700 hover:bg-amber-800"><Plus className="size-4" />Ajouter un Yahrzeit</Button></div>
    {items.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-5 text-center text-sm text-slate-500">Aucun Yahrzeit enregistré.</p> : <div className="mt-5 grid gap-2 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-3"><Candle className="size-5 shrink-0 text-amber-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900">{item.deceasedName}{item.deceasedHebrewName ? ` · ${item.deceasedHebrewName}` : ""}</p><p className="truncate text-xs text-slate-500">Pour {item.member?.displayName ?? "membre"}{item.relationship ? ` · ${item.relationship}` : ""} · {item.hebrewDeathDay}/{item.hebrewDeathMonth}/{item.hebrewDeathYear}</p></div><Button variant="ghost" size="icon-sm" onClick={() => void remove(item)} className="text-red-600"><Trash2 className="size-4" /></Button></article>)}</div>}
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4" onClick={() => setOpen(false)}><div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem] sm:p-6" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h3 className="text-xl font-black">Ajouter un Yahrzeit</h3><button onClick={() => setOpen(false)} aria-label="Fermer"><X className="size-5" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelClass}>Membre concerné (qui commémore) *
          <select value={form.memberId} onChange={(event) => setForm({ ...form, memberId: event.target.value })} className={`${fieldClass} mt-1.5`}><option value="">{sortedMembers.length ? "Choisir dans la liste" : "Aucun membre pour l’instant"}</option>{sortedMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select>
        </label>
        <div className="mt-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-2.5">
          <p className="text-xs font-semibold text-slate-600">La personne n’est pas dans la liste ? Ajoutez-la :</p>
          <div className="mt-1.5 flex gap-2">
            <input value={newMemberName} onChange={(event) => setNewMemberName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addMember(); } }} placeholder="Prénom et nom" aria-label="Prénom et nom du nouveau membre" className="h-10 min-w-0 flex-1 rounded-xl border bg-white px-3 text-sm" />
            <Button type="button" variant="outline" onClick={() => void addMember()} disabled={addingMember || !newMemberName.trim()} className="h-10 shrink-0 rounded-xl">{addingMember ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}Ajouter</Button>
          </div>
        </div>
      </div>
      <label className={labelClass}>Nom du proche décédé *<input value={form.deceasedName} onChange={(event) => setForm({ ...form, deceasedName: event.target.value })} placeholder="Ex. : François Bass" className={`${fieldClass} mt-1.5`} /></label>
      <label className={labelClass}>Nom hébraïque<input value={form.deceasedHebrewName} onChange={(event) => setForm({ ...form, deceasedHebrewName: event.target.value })} placeholder="Facultatif" className={`${fieldClass} mt-1.5`} /></label>
      <label className={labelClass}>Lien avec le membre<input value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} placeholder="Père, mère…" className={`${fieldClass} mt-1.5`} /></label>
      <fieldset className="sm:col-span-2">
        <legend className={labelClass}>Date du décès *</legend>
        <div className="mt-1.5 inline-flex rounded-xl border bg-slate-50 p-1" role="radiogroup" aria-label="Calendrier de la date">
          {([["civil", "Date civile"], ["hebrew", "Date hébraïque"]] as const).map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={dateMode === value} onClick={() => setDateMode(value)} className={`min-h-9 rounded-lg px-3 text-sm font-bold ${dateMode === value ? "bg-white text-amber-800 shadow-sm" : "text-slate-500"}`}>{label}</button>)}
        </div>
        {dateMode === "civil"
          ? <input type="date" value={form.deathDate} onChange={(event) => setForm({ ...form, deathDate: event.target.value })} aria-label="Date civile du décès" className={`${fieldClass} mt-2 min-h-11`} />
          : <div className="mt-2 grid grid-cols-[5rem_1fr_6rem] gap-2">
            <input type="number" inputMode="numeric" min={1} max={30} value={form.hebrewDeathDay} onChange={(event) => setForm({ ...form, hebrewDeathDay: event.target.value })} placeholder="Jour" aria-label="Jour hébraïque" className={fieldClass} />
            <select value={form.hebrewDeathMonth} onChange={(event) => setForm({ ...form, hebrewDeathMonth: event.target.value })} aria-label="Mois hébraïque" className={fieldClass}><option value="">Mois</option>{getHebrewMonthsForYear(hebrewYearForMonths).map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}</select>
            <input type="number" inputMode="numeric" min={3761} max={9999} value={form.hebrewDeathYear} onChange={(event) => setForm({ ...form, hebrewDeathYear: event.target.value })} placeholder="Année" aria-label="Année hébraïque" className={fieldClass} />
          </div>}
      </fieldset>
      <label className={labelClass}>Nom hébraïque du père<input value={form.fatherHebrewName} onChange={(event) => setForm({ ...form, fatherHebrewName: event.target.value })} placeholder="Facultatif" className={`${fieldClass} mt-1.5`} /></label>
      <label className={labelClass}>Nom hébraïque de la mère<input value={form.motherHebrewName} onChange={(event) => setForm({ ...form, motherHebrewName: event.target.value })} placeholder="Facultatif" className={`${fieldClass} mt-1.5`} /></label>
      {dateMode === "civil" ? <label className="flex items-center gap-2 rounded-xl border bg-amber-50 px-3 py-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.deathAfterSunset} onChange={(event) => setForm({ ...form, deathAfterSunset: event.target.checked })} />Décès après le coucher du soleil</label> : null}
      <label className={`${labelClass} sm:col-span-2`}>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Facultatif" rows={2} className="mt-1.5 w-full rounded-xl border px-3 py-2 text-sm" /></label>
    </div>{error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}
    {!error && missing.length ? <p className="mt-3 text-xs font-semibold text-slate-500">Pour enregistrer, indiquez {missing.join(", ")}.</p> : null}
    <div className="mt-5 flex gap-2"><Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-xl">Annuler</Button><Button onClick={() => void save()} disabled={busy || missing.length > 0} className="flex-1 rounded-xl bg-amber-700 hover:bg-amber-800">{busy && <Loader2 className="size-4 animate-spin" />}Enregistrer</Button></div></div></div>}
  </section>;
}
