"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { ContactsTable } from "./contacts-table";
import { useContactNavigationGuard } from "./use-contact-navigation-guard";
import { ContactDateEditor } from "./contact-date-editor";
import type { CommunityMember } from "@/lib/contacts/crm";
import type { MemberInput } from "@/lib/contacts/normalize";
import { buildMemberPatch, cleanGroups } from "@/lib/contacts/member-patch";
import { useLocale } from "next-intl";
import { useDashboardCopy } from "@/lib/i18n/use-dashboard-copy";

const fields = [["lastName", "Nom"], ["firstName", "Prénom"], ["displayName", "Nom d’affichage"], ["phone", "Téléphone"], ["email", "Email"], ["city", "Ville"], ["address", "Adresse"], ["profession", "Profession"], ["familyStatus", "Situation familiale"], ["tags", "Groupes (séparés par des virgules)"], ["notes", "Notes"]] as const;
type Form = Record<typeof fields[number][0], string>;
function toForm(contact?: CommunityMember): Form {
  return Object.fromEntries(fields.map(([key]) => [key, key === "tags" ? (contact?.tags ?? []).join(", ") : contact?.[key] ?? ""])) as Form;
}
const inputClass = "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200";
interface PhoneContact { name?: string[]; email?: string[]; tel?: string[] }
const blankMember: CommunityMember = { id: "", firstName: null, lastName: null, displayName: "", birthDate: null, birthAfterSunset: false, hebrewBirthDay: null, hebrewBirthMonth: null, hebrewBirthYear: null };

function parseVCard(content: string) {
  return content.split(/BEGIN:VCARD/i).slice(1).map(card => {
    const lines = card.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
    const value = (key: string) => lines.find(line => new RegExp(`^${key}[:;]`, "i").test(line))?.split(":").slice(1).join(":").trim() ?? "";
    const [lastName, firstName] = value("N").split(";");
    return { displayName: value("FN") || [firstName, lastName].filter(Boolean).join(" "), firstName, lastName, email: value("EMAIL"), phone: value("TEL"), source: "vcard_import" };
  }).filter(contact => contact.displayName || contact.email || contact.phone);
}

export function ContactsManager() {
  const locale = useLocale();
  const tr = useDashboardCopy();
  const [contacts, setContacts] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityMember | undefined>();
  const [form, setForm] = useState<Form>(() => toForm());
  const [birthday, setBirthday] = useState<MemberInput>({});
  const [dateEditor, setDateEditor] = useState<"civil" | "hebrew" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const vCardInput = useRef<HTMLInputElement>(null);
  const formDirty = formOpen && (dateEditor !== null || Object.keys(birthday).length > 0 || JSON.stringify(form) !== JSON.stringify(toForm(editing)));
  useContactNavigationGuard(formDirty || saving);

  async function loadContacts() {
    setLoading(true);
    try {
      const response = await fetch("/api/community/members", { cache: "no-store" });
      if (!response.ok) throw new Error(locale === "he" ? "לא ניתן לטעון את אנשי הקשר." : "Impossible de charger les contacts.");
      setContacts(await response.json());
    } catch (failure) { setError((failure as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadContacts(); }, []);

  function openForm(contact?: CommunityMember) {
    setEditing(contact); setForm(toForm(contact)); setError(""); setBirthday({}); setDateEditor(null); setFormOpen(true);
  }
  function closeForm() {
    if (saving || formDirty && !window.confirm(locale === "he" ? "לבטל את השינויים שלא נשמרו?" : "Abandonner les modifications non enregistrées ?")) return;
    setFormOpen(false);
  }
  async function saveContact() {
    setError("");
    try {
      if (![form.firstName, form.lastName, form.displayName, form.email, form.phone].some(value => value.trim())) throw new Error(locale === "he" ? "הוסיפו שם, אימייל או טלפון." : "Ajoutez un nom, un email ou un téléphone.");
      const initial = toForm(editing);
      const input: MemberInput = { ...birthday };
      for (const [key] of fields) {
        if (editing && form[key] === initial[key]) continue;
        if (key === "tags") input.tags = cleanGroups(form.tags.split(","));
        else Object.assign(input, { [key]: form[key] });
      }
      const normalized = buildMemberPatch(editing ?? {}, input);
      const body = editing ? input : { ...normalized, displayName: form.displayName || undefined, source: "manual" };
      setSaving(true);
      const response = await fetch(editing ? `/api/community/members/${editing.id}` : "/api/community/members", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || (locale === "he" ? "לא ניתן לשמור את איש הקשר." : "Impossible d’enregistrer ce contact."));
      setFormOpen(false); setMessage(locale === "he" ? (editing ? "איש הקשר נשמר." : "איש הקשר נוסף.") : (editing ? "Contact enregistré." : "Contact ajouté."));
      await loadContacts();
    } catch (failure) { setError((failure as Error).message); }
    finally { setSaving(false); }
  }
  async function importContacts(members: MemberInput[]) {
    if (!members.length) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/community/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ members }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (locale === "he" ? "הייבוא נכשל." : "Import impossible."));
      setMessage(locale === "he" ? `${Array.isArray(result) ? result.length : members.length} אנשי קשר יובאו.` : `${Array.isArray(result) ? result.length : members.length} contact(s) importé(s).`); await loadContacts();
    } catch (failure) { setError((failure as Error).message); }
    finally { setSaving(false); }
  }
  async function importPhoneContacts() {
    const api = (navigator as Navigator & { contacts?: { select: (properties: string[], options: { multiple: boolean }) => Promise<PhoneContact[]> } }).contacts;
    if (!api) { setError(locale === "he" ? "ב־iPhone יש לייבא קובץ vCard. גישה ישירה לאנשי הקשר זמינה ב־Chrome ב־Android." : "Sur iPhone, importez un fichier vCard. Le carnet direct est disponible sur Chrome Android."); return; }
    try {
      const selected = await api.select(["name", "email", "tel"], { multiple: true });
      await importContacts(selected.map(contact => ({ displayName: contact.name?.[0] ?? "", email: contact.email?.[0] ?? "", phone: contact.tel?.[0] ?? "", source: "phone_contacts" })));
    } catch (failure) { if (!(failure instanceof DOMException && failure.name === "AbortError")) setError(locale === "he" ? "לא ניתן לגשת לאנשי הקשר. אפשר לייבא קובץ vCard." : "Impossible d’accéder au carnet. Vous pouvez importer une vCard."); }
  }
  async function deleteContact(contact: CommunityMember) {
    if (!window.confirm(locale === "he" ? `למחוק את ${contact.displayName}?` : `Supprimer ${contact.displayName} ?`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/community/members/${contact.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(locale === "he" ? "לא ניתן למחוק את איש הקשר." : "Impossible de supprimer ce contact.");
      setContacts(current => current.filter(row => row.id !== contact.id)); setMessage(locale === "he" ? "איש הקשר נמחק." : "Contact supprimé.");
    } catch (failure) { setError((failure as Error).message); }
    finally { setSaving(false); }
  }
  const datedContact = { ...(editing ?? blankMember), ...buildMemberPatch(editing ?? blankMember, birthday) } as CommunityMember;
  return <section className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-3 sm:p-5">
    <div className="flex items-center justify-between gap-2"><div><h1 className="text-lg font-semibold text-slate-900">{tr("CRM intelligent")}</h1><p className="text-xs text-slate-500">{locale === "he" ? `${contacts.length} אנשי קשר` : `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`}</p></div><button disabled={busy || saving} onClick={() => openForm()} className="flex min-h-10 items-center gap-1 rounded-lg bg-violet-800 px-3 text-sm font-semibold text-white disabled:opacity-40"><Plus className="size-4" />{tr("Ajouter")}</button></div>
    {message && <div role="status" className="flex items-center gap-2 text-sm text-emerald-800">{message}<button aria-label={locale === "he" ? "סגירת ההודעה" : "Fermer le message"} onClick={() => setMessage("")}><X className="size-4" /></button></div>}
    {error && !formOpen && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <ContactsTable contacts={contacts} setContacts={setContacts} loading={loading} disabled={saving} onEdit={openForm} onDelete={contact => void deleteContact(contact)} onBusy={setBusy} />
    <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">{tr("Importer")}</summary><div className="flex flex-wrap gap-2 pt-3"><button disabled={busy || saving} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40" onClick={() => void importPhoneContacts()}>{tr("Depuis le téléphone")}</button><button disabled={busy || saving} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40" onClick={() => vCardInput.current?.click()}>{tr("Fichier vCard")}</button><input ref={vCardInput} type="file" aria-label={locale === "he" ? "ייבוא vCard" : "Importer une vCard"} accept=".vcf,text/vcard" className="hidden" onChange={async event => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (!file) return; try { await importContacts(parseVCard(await file.text())); } catch { setError(locale === "he" ? "הקובץ אינו קריא." : "Fichier illisible."); } }} /></div></details>
    <Dialog.Root open={formOpen} onOpenChange={open => { if (!open) closeForm(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
      <div className="flex items-center justify-between"><Dialog.Title className="text-lg font-semibold">{tr(editing ? "Fiche complète" : "Nouveau contact")}</Dialog.Title><button aria-label={locale === "he" ? "סגירת הכרטיס" : "Fermer la fiche"} onClick={closeForm}><X className="size-5" /></button></div>
      <form onSubmit={event => { event.preventDefault(); if (!dateEditor) void saveContact(); }} className="mt-4 space-y-4"><fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label]) => <label key={key} className={`space-y-1 text-xs font-medium ${key === "notes" ? "sm:col-span-2" : ""}`}><span>{tr(label)}</span>{key === "notes" ? <textarea className={inputClass} rows={3} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /> : <input className={inputClass} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} />}</label>)}
        {editing && !editing.firstName && !editing.lastName && <p className="text-xs text-slate-500 sm:col-span-2">{locale === "he" ? "השם המלא נשמר בשם התצוגה. מלאו שם פרטי ושם משפחה ללא פיצול אוטומטי." : "Nom complet conservé dans le nom d’affichage. Renseignez Nom et Prénom sans découpage automatique."}</p>}
        <div className="space-y-2 rounded-lg border p-3 sm:col-span-2"><p className="text-xs font-medium">{tr("Naissance")} {datedContact.birthDate ? "· " + datedContact.birthDate.slice(0, 10).split("-").reverse().join("/") : ""}</p>
          {dateEditor ? <ContactDateEditor contact={datedContact} calendar={dateEditor} onSave={patch => { setBirthday(patch); setDateEditor(null); }} onCancel={() => setDateEditor(null)} /> : <div className="flex gap-3 text-xs"><button type="button" onClick={() => setDateEditor("civil")}>{tr("Date civile")}</button><button type="button" onClick={() => setDateEditor("hebrew")}>{tr("Date hébraïque")}</button></div>}
        </div>
      </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={closeForm} className="rounded-lg border px-4 py-2 text-sm">{tr("Annuler")}</button><button disabled={saving || dateEditor !== null} className="rounded-lg bg-violet-800 px-4 py-2 text-sm text-white disabled:opacity-40">{tr(saving ? "Enregistrement…" : "Enregistrer")}</button></div></form>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>;
}
