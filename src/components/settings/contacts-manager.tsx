"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Mail, Pencil, Phone, Plus, Search, Smartphone, Sparkles, Trash2, Upload, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommunityMember {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  profession: string | null;
  city: string | null;
  notes: string | null;
  source: string;
  createdAt?: string;
}

interface ContactPickerContact {
  name?: string[];
  email?: string[];
  tel?: string[];
}

interface NavigatorWithContacts extends Navigator {
  contacts?: {
    select: (properties: Array<"name" | "email" | "tel">, options?: { multiple?: boolean }) => Promise<ContactPickerContact[]>;
  };
}

type Filter = "all" | "phone" | "email" | "incomplete";
type Sort = "name" | "recent" | "complete";

const emptyContact = { displayName: "", email: "", phone: "", city: "", profession: "", notes: "" };

function parseVCard(content: string) {
  return content
    .split(/BEGIN:VCARD/i)
    .slice(1)
    .map((card) => {
      const lines = card.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
      const value = (key: string) => lines.find((line) => line.toUpperCase().startsWith(key))?.split(":").slice(1).join(":").trim() ?? "";
      return {
        displayName: value("FN:") || value("N:").split(";").filter(Boolean).reverse().join(" "),
        email: value("EMAIL"),
        phone: value("TEL"),
        source: "vcard_import",
      };
    })
    .filter((contact) => contact.displayName || contact.email || contact.phone);
}

export function ContactsManager() {
  const [contacts, setContacts] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityMember | null>(null);
  const [form, setForm] = useState(emptyContact);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vCardInput = useRef<HTMLInputElement>(null);

  async function loadContacts() {
    setLoading(true);
    try {
      const response = await fetch("/api/community/members");
      if (!response.ok) throw new Error("Impossible de charger les contacts.");
      setContacts(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les contacts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContacts();
  }, []);

  const stats = useMemo(() => ({
    total: contacts.length,
    phone: contacts.filter((contact) => contact.phone).length,
    email: contacts.filter((contact) => contact.email).length,
    enriched: contacts.filter((contact) => contact.profession || contact.city || contact.notes).length,
  }), [contacts]);

  const displayedContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return contacts
      .filter((contact) => {
        const matchesSearch = !normalizedQuery || [contact.displayName, contact.email, contact.phone, contact.city, contact.profession, contact.notes]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("fr").includes(normalizedQuery));
        const matchesFilter = filter === "all"
          || (filter === "phone" && Boolean(contact.phone))
          || (filter === "email" && Boolean(contact.email))
          || (filter === "incomplete" && !contact.profession && !contact.city && !contact.notes);
        return matchesSearch && matchesFilter;
      })
      .sort((left, right) => {
        if (sort === "recent") return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
        if (sort === "complete") {
          const score = (contact: CommunityMember) => Number(Boolean(contact.email)) + Number(Boolean(contact.phone)) + Number(Boolean(contact.profession || contact.city || contact.notes));
          return score(right) - score(left) || left.displayName.localeCompare(right.displayName, "fr");
        }
        return left.displayName.localeCompare(right.displayName, "fr");
      });
  }, [contacts, filter, query, sort]);

  function openCreate() {
    setEditing(null);
    setForm(emptyContact);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(contact: CommunityMember) {
    setEditing(contact);
    setForm({
      displayName: contact.displayName,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      city: contact.city ?? "",
      profession: contact.profession ?? "",
      notes: contact.notes ?? "",
    });
    setError(null);
    setFormOpen(true);
  }

  async function saveContact() {
    if (!form.displayName.trim() && !form.email.trim() && !form.phone.trim()) {
      setError("Indiquez au moins un nom, un email ou un téléphone.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(editing ? `/api/community/members/${editing.id}` : "/api/community/members", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: editing?.source ?? "manual" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Impossible d’enregistrer ce contact.");
      setFormOpen(false);
      setMessage(editing ? "Contact mis à jour." : "Contact ajouté.");
      await loadContacts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible d’enregistrer ce contact.");
    } finally {
      setSaving(false);
    }
  }

  async function importContacts(members: Array<Record<string, string>>) {
    if (members.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/community/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });
      const imported = await response.json().catch(() => []);
      if (!response.ok) throw new Error(imported.error ?? "Import impossible.");
      const count = Array.isArray(imported) ? imported.length : members.length;
      setMessage(`${count} contact${count > 1 ? "s" : ""} importé${count > 1 ? "s" : ""}.`);
      await loadContacts();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function importPhoneContacts() {
    const contactsApi = (navigator as NavigatorWithContacts).contacts;
    if (!contactsApi?.select) {
      setError("L’accès direct au carnet est proposé par Chrome sur Android. Sur iPhone, importez une fiche vCard ci-dessous.");
      return;
    }
    try {
      const selected = await contactsApi.select(["name", "email", "tel"], { multiple: true });
      await importContacts(selected.map((contact) => ({
        displayName: contact.name?.[0] ?? "",
        email: contact.email?.[0] ?? "",
        phone: contact.tel?.[0] ?? "",
        source: "phone_contacts",
      })));
    } catch {
      // Le sélecteur peut être fermé sans import : aucun message d'erreur dans ce cas.
    }
  }

  async function deleteContact(contact: CommunityMember) {
    if (!window.confirm(`Supprimer ${contact.displayName} ?`)) return;
    const response = await fetch(`/api/community/members/${contact.id}`, { method: "DELETE" });
    if (response.ok) {
      setContacts((current) => current.filter((item) => item.id !== contact.id));
      setMessage("Contact supprimé.");
    } else {
      setError("Impossible de supprimer ce contact.");
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.9rem] border border-emerald-100 bg-white shadow-[0_20px_54px_rgba(5,150,105,0.1)]">
      <div className="border-b border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-slate-950"><Users className="size-5 text-emerald-600" /><h2 className="text-lg font-black">Mes contacts</h2></div>
            <p className="mt-1 text-sm text-slate-500">Recherchez, enrichissez et préparez vos destinataires en quelques clics.</p>
          </div>
          <Button onClick={openCreate} className="bg-emerald-600 shadow-[0_12px_22px_-14px_rgba(5,150,105,0.85)] hover:bg-emerald-700"><Plus className="size-4" />Ajouter un contact</Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Contacts", stats.total, Users, "text-emerald-900"],
            ["Avec téléphone", stats.phone, Phone, "text-emerald-700"],
            ["Avec email", stats.email, Mail, "text-teal-700"],
            ["Profils enrichis", stats.enriched, Sparkles, "text-lime-700"],
          ].map(([label, value, Icon, color]) => {
            const StatIcon = Icon as typeof Users;
            return <div key={String(label)} className="rounded-2xl border border-emerald-100/80 bg-white/80 p-3 shadow-sm"><StatIcon className={cn("size-4", color)} /><p className={cn("mt-2 text-xl font-black", color)}>{String(value)}</p><p className="text-[11px] font-medium text-slate-500">{String(label)}</p></div>;
          })}
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-7">
        {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><CheckCircle2 className="size-4" />{message}<button className="ml-auto" onClick={() => setMessage(null)} aria-label="Fermer"><X className="size-4" /></button></div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un nom, téléphone, email ou ville…" className="h-11 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /></label>
          <label className="relative"><select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-11 appearance-none rounded-xl border border-emerald-200 bg-emerald-50/40 py-2 pl-3 pr-9 text-sm font-medium text-slate-600 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"><option value="name">A → Z</option><option value="recent">Plus récents</option><option value="complete">Plus complets</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-emerald-500" /></label>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[["all", "Tous"], ["phone", "Téléphone"], ["email", "Email"], ["incomplete", "À enrichir"]].map(([value, label]) => <button key={value} onClick={() => setFilter(value as Filter)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200", filter === value ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20" : "border border-emerald-100 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100")}>{label}</button>)}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2"><Smartphone className="mt-0.5 size-4 shrink-0 text-emerald-600" /><p className="text-xs leading-5 text-emerald-950"><strong>Import mobile.</strong> Android/Chrome ouvre le carnet de contacts. Sur iPhone, choisissez un fichier vCard exporté depuis Contacts.</p></div>
          <div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100" onClick={importPhoneContacts} disabled={saving}><Smartphone className="size-4" />Depuis le téléphone</Button><Button variant="outline" size="sm" className="border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100" onClick={() => vCardInput.current?.click()} disabled={saving}><Upload className="size-4" />vCard</Button><input ref={vCardInput} type="file" accept=".vcf,text/vcard" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (!file) return; await importContacts(parseVCard(await file.text())); }} /></div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-emerald-100">
          {loading ? <p className="p-8 text-center text-sm text-slate-400">Chargement des contacts…</p> : displayedContacts.length === 0 ? <div className="p-10 text-center"><Users className="mx-auto size-8 text-emerald-200" /><p className="mt-3 text-sm font-semibold text-slate-700">Aucun contact trouvé</p><p className="mt-1 text-xs text-slate-500">Modifiez votre recherche ou ajoutez votre premier contact.</p></div> : <div className="divide-y divide-emerald-50">{displayedContacts.map((contact) => <article key={contact.id} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-emerald-50/65"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-sm font-black text-emerald-700">{contact.displayName.slice(0, 1).toUpperCase()}</div><button className="min-w-0 flex-1 text-left" onClick={() => openEdit(contact)}><p className="truncate text-sm font-bold text-slate-900">{contact.displayName}</p><p className="mt-0.5 truncate text-xs text-slate-500">{[contact.phone, contact.email].filter(Boolean).join(" · ") || "Aucun canal renseigné"}</p>{(contact.profession || contact.city) && <p className="mt-1 truncate text-[11px] text-slate-400">{[contact.profession, contact.city].filter(Boolean).join(" · ")}</p>}</button><div className="hidden gap-1 sm:flex">{contact.phone && <Phone className="size-4 text-emerald-500" />}{contact.email && <Mail className="size-4 text-teal-500" />}</div><Button variant="ghost" size="icon-sm" className="text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800" onClick={() => openEdit(contact)} aria-label={`Modifier ${contact.displayName}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => void deleteContact(contact)} aria-label={`Supprimer ${contact.displayName}`}><Trash2 className="size-4" /></Button></article>)}</div>}
        </div>
      </div>

      {formOpen && <div className="fixed inset-0 z-50 flex items-end bg-emerald-950/30 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"><div className="w-full rounded-t-[2rem] border border-emerald-100 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-7"><div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-slate-950">{editing ? "Modifier le contact" : "Nouveau contact"}</h3><p className="text-xs text-slate-500">Les informations utiles pour mieux communiquer.</p></div><Button variant="ghost" size="icon-sm" className="text-emerald-700 hover:bg-emerald-50" onClick={() => setFormOpen(false)}><X className="size-4" /></Button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="Nom complet" className="h-11 rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:col-span-2" /><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Téléphone" className="h-11 rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /><input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="h-11 rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Ville" className="h-11 rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /><input value={form.profession} onChange={(event) => setForm({ ...form, profession: event.target.value })} placeholder="Profession" className="h-11 rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100" /><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes ou préférences" rows={3} className="rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 sm:col-span-2" /></div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-5 flex gap-2"><Button variant="outline" className="flex-1 border-emerald-200 text-emerald-800 hover:bg-emerald-50" onClick={() => setFormOpen(false)}>Annuler</Button><Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => void saveContact()} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button></div></div></div>}
    </section>
  );
}
