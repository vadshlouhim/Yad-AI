"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, SlidersHorizontal, Sparkles } from "lucide-react";
import { birthdaySoon, matchesContact, type CommunityMember } from "@/lib/contacts/crm";
import { buildMemberPatch, cleanGroups } from "@/lib/contacts/member-patch";
import { getHebrewMonthLabel } from "@/lib/contacts/hebrew-birthday";
import { ContactSaveQueue, type SaveState } from "@/lib/contacts/save-queue";
import type { MemberInput } from "@/lib/contacts/normalize";
import { ContactDateEditor } from "./contact-date-editor";
import { useContactNavigationGuard } from "./use-contact-navigation-guard";
import { useLocale } from "next-intl";
import { useDashboardCopy } from "@/lib/i18n/use-dashboard-copy";

const columns = [
  ["lastName", "Nom"], ["firstName", "Prénom"], ["phone", "Téléphone"], ["email", "Email"],
  ["birthDate", "Naissance civile"], ["hebrewBirthDay", "Naissance hébraïque"], ["city", "Ville"], ["tags", "Groupes"],
] as const;
type Column = typeof columns[number][0];
type Editor = { id: string; key: Column; value: string; original: string; error?: string };
const cellText = (row: CommunityMember, key: Column) => key === "tags" ? (row.tags ?? []).join(", ") : String(row[key] ?? "");
const inputClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200";

export function ContactsTable({ contacts, setContacts, loading, disabled = false, onEdit, onDelete, onBusy }: {
  contacts: CommunityMember[]; setContacts: Dispatch<SetStateAction<CommunityMember[]>>; loading: boolean;
  onEdit: (contact: CommunityMember) => void; onDelete: (contact: CommunityMember) => void; onBusy: (busy: boolean) => void; disabled?: boolean;
}) {
  const locale = useLocale();
  const tr = useDashboardCopy();
  const [query, setQuery] = useState("");
  const [aiIds, setAiIds] = useState<string[] | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiVersion = useRef(0);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ phone: false, email: false, birth: false, upcoming: false, group: "", calendar: "hebrew" as "hebrew" | "civil" });
  const [sort, setSort] = useState<{ key: Column; direction: number }>({ key: "lastName", direction: 1 });
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const cancelBlur = useRef(false);
  const focusTarget = useRef<{ id: string; key: Column } | null>(null);
  const [snapshot, setSnapshot] = useState<string[] | null>(null);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [queue] = useState(() => new ContactSaveQueue(async (id, patch) => {
    const response = await fetch(`/api/community/members/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Sauvegarde impossible. Vérifiez votre connexion.");
    return payload as CommunityMember;
  }, (id, state, saved) => {
    setStates(current => ({ ...current, [id]: state }));
    if (saved) setContacts(current => current.map(row => row.id !== id ? row : state.pending.reduce<CommunityMember>((updated, patch) => ({ ...updated, ...buildMemberPatch(updated, patch) } as CommunityMember), saved)));
  }));
  const pending = Object.values(states).some(state => state.pending.length > 0);
  const busy = pending || editor !== null;
  const blocked = busy || disabled || loading;
  useContactNavigationGuard(busy);
  useEffect(() => { onBusy(busy); }, [busy, onBusy]);
  useEffect(() => {
    if (editor || !focusTarget.current) return;
    const { id, key } = focusTarget.current;
    const row = [...document.querySelectorAll<HTMLElement>("[data-contact-id]")].find(row => row.dataset.contactId === id);
    row?.querySelector<HTMLButtonElement>(`[data-column="${key}"]`)?.focus();
    focusTarget.current = null;
  }, [editor]);
  const groups = useMemo(() => cleanGroups(contacts.flatMap(row => row.tags ?? [])).sort((a, b) => a.localeCompare(b, locale)), [contacts, locale]);
  const filtered = useMemo(() => contacts.filter(row => {
    if (aiIds !== null ? !aiIds.includes(row.id) : !matchesContact(row, query)) return false;
    if (filters.phone && row.phone || filters.email && row.email) return false;
    if (filters.birth && (row.birthDate || row.hebrewBirthDay && row.hebrewBirthMonth && row.hebrewBirthYear)) return false;
    if (filters.group && !row.tags?.includes(filters.group)) return false;
    return !filters.upcoming || birthdaySoon(row, filters.calendar);
  }).sort((a, b) => {
    const value = (row: CommunityMember) => sort.key === "lastName" ? row.lastName || row.displayName : sort.key === "hebrewBirthDay" ? [row.hebrewBirthYear, row.hebrewBirthMonth, row.hebrewBirthDay].map(value => String(value ?? "").padStart(4, "0")).join("") : cellText(row, sort.key);
    return sort.direction * (value(a).localeCompare(value(b), locale, { sensitivity: "base", numeric: true }) || (a.firstName ?? "").localeCompare(b.firstName ?? "", locale) || a.id.localeCompare(b.id));
  }), [contacts, query, aiIds, filters, sort, locale]);
  const ordered = busy && snapshot ? snapshot.map(id => contacts.find(row => row.id === id)).filter((row): row is CommunityMember => Boolean(row)) : filtered;
  const pages = Math.max(1, Math.ceil(ordered.length / 50));
  const currentPage = Math.min(page, pages - 1);
  const displayed = ordered.slice(currentPage * 50, (currentPage + 1) * 50);

  function edit(row: CommunityMember, key: Column) {
    if (editor || disabled || loading) return;
    if (!busy) setSnapshot(filtered.map(row => row.id));
    cancelBlur.current = false;
    setEditor({ id: row.id, key, value: cellText(row, key), original: cellText(row, key) });
  }
  function submit(row: CommunityMember, patch: MemberInput) {
    try {
      const normalized = buildMemberPatch(row, patch);
      setContacts(current => current.map(item => item.id === row.id ? { ...item, ...normalized } as CommunityMember : item));
      queue.enqueue(row.id, patch);
      setEditor(null);
    } catch (failure) { setEditor(current => current ? { ...current, error: (failure as Error).message } : current); }
  }
  function commit(row: CommunityMember) {
    if (!editor || cancelBlur.current) return;
    if (editor.value === editor.original) { setEditor(null); return; }
    submit(row, editor.key === "tags" ? { tags: cleanGroups(editor.value.split(",")) } : { [editor.key]: editor.value });
  }
  function cancelEdit() {
    cancelBlur.current = true;
    focusTarget.current = editor ? { id: editor.id, key: editor.key } : null;
    setEditor(null);
  }
  async function searchAI() {
    const version = ++aiVersion.current;
    setAiLoading(true); setError("");
    try {
      const response = await fetch("/api/community/members/ai-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: query.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Recherche IA indisponible.");
      if (version === aiVersion.current) { setAiIds(Array.isArray(result.ids) ? result.ids : []); setAiSummary(result.summary || "Résultats IA"); setPage(0); }
    } catch (failure) { if (version === aiVersion.current) setError((failure as Error).message); }
    finally { if (version === aiVersion.current) setAiLoading(false); }
  }
  function text(row: CommunityMember, key: Column) {
    if (key === "lastName" && !row.lastName && !row.firstName) return <><span>{row.displayName}</span><small className="block text-[10px] font-normal text-slate-500">{tr("Nom complet")}</small></>;
    if (key === "birthDate") return row.birthDate ? row.birthDate.slice(0, 10).split("-").reverse().join("/") : "—";
    if (key === "hebrewBirthDay") return row.hebrewBirthDay && row.hebrewBirthMonth && row.hebrewBirthYear ? `${row.hebrewBirthDay} ${getHebrewMonthLabel(row.hebrewBirthMonth, row.hebrewBirthYear)} ${row.hebrewBirthYear}` : "—";
    return cellText(row, key) || "—";
  }
  return <div className="min-w-0 space-y-3">
    <div className="flex gap-2">
      <input aria-label={locale === "he" ? "חיפוש אנשי קשר" : "Rechercher les contacts"} type="search" disabled={blocked} className={`${inputClass} min-w-0 flex-1 disabled:bg-slate-50`} placeholder={tr("Rechercher…")} value={query} onChange={event => { aiVersion.current++; setQuery(event.target.value); setAiIds(null); setAiSummary(""); setAiLoading(false); setPage(0); }} />
      <button type="button" title={locale === "he" ? "חיפוש בעזרת AI" : "Rechercher avec l’IA"} aria-label={locale === "he" ? "חיפוש בעזרת AI" : "Rechercher avec l’IA"} disabled={aiLoading || query.trim().length < 2 || blocked} onClick={() => void searchAI()} className="flex h-10 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-40"><Sparkles className="size-4" />{aiLoading ? "…" : "IA"}</button>
      <button type="button" aria-label={tr("Filtres")} aria-expanded={showFilters} aria-controls="crm-filters" onClick={() => setShowFilters(!showFilters)} className="flex h-10 items-center gap-1 rounded-lg border px-3 text-sm"><SlidersHorizontal className="size-4" /><span className="hidden sm:inline">{tr("Filtres")}</span><span className="sr-only sm:hidden">{tr("Filtres")}</span></button>
    </div>
    {showFilters && <fieldset id="crm-filters" className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 text-xs" disabled={blocked}>
      {([ ["phone", "Sans téléphone"], ["email", "Sans email"], ["birth", "Date de naissance manquante"], ["upcoming", "Anniversaires : 30 jours"] ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-1.5"><input type="checkbox" checked={filters[key]} onChange={event => { setFilters({ ...filters, [key]: event.target.checked }); setPage(0); }} />{tr(label)}</label>)}
      <select aria-label={locale === "he" ? "סינון לפי קבוצה" : "Filtrer par groupe"} value={filters.group} className="max-w-44 rounded border bg-white p-2" onChange={event => { setFilters({ ...filters, group: event.target.value }); setPage(0); }}><option value="">{tr("Tous les groupes")}</option>{groups.map(group => <option key={group}>{group}</option>)}</select>
      {filters.upcoming && <select aria-label={locale === "he" ? "לוח ימי הולדת" : "Calendrier des anniversaires"} className="rounded border bg-white p-2" value={filters.calendar} onChange={event => { setFilters({ ...filters, calendar: event.target.value as "hebrew" | "civil" }); setPage(0); }}><option value="hebrew">{tr("Hébraïque")}</option><option value="civil">{tr("Civil")}</option></select>}
    </fieldset>}
    {aiSummary && <p role="status" className="text-xs text-slate-600">{aiSummary}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div tabIndex={0} role="region" aria-label={locale === "he" ? "טבלת אנשי קשר, גלילה אופקית" : "Tableau des contacts, défilement horizontal"} className="max-h-[65vh] w-full overflow-auto rounded-lg border border-slate-200 focus-visible:outline-violet-500">
      <table className="w-full min-w-[1330px] border-separate border-spacing-0 text-start text-sm">
        <caption className="sr-only">{locale === "he" ? "אנשי קשר — לחצו על תא כדי לערוך אותו" : "Contacts — cliquer sur une cellule pour la modifier"}</caption>
        <thead className="sticky top-0 z-20 bg-slate-50"><tr>{columns.map(([key, label], index) => <th key={key} scope="col" aria-sort={sort.key === key ? sort.direction === 1 ? "ascending" : "descending" : "none"} className={`border-b border-slate-200 bg-slate-50 px-3 py-2 ${index === 0 ? "sticky start-0 z-30 min-w-36 max-w-48 border-e" : "min-w-36"}`}><button disabled={blocked} className="flex min-h-9 items-center gap-1 whitespace-nowrap font-semibold" onClick={() => { setSort({ key, direction: sort.key === key ? -sort.direction : 1 }); setPage(0); }}>{tr(label)}{sort.key === key && (sort.direction === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}</button></th>)}<th scope="col" className="border-b border-slate-200 px-3"><span className="sr-only">{tr("Actions")}</span></th></tr></thead>
        <tbody>{displayed.map(row => <tr key={row.id} data-contact-id={row.id} className="group">
          {columns.map(([key, label], index) => <td key={key} className={`border-b border-slate-200 bg-white align-top ${index === 0 ? "sticky start-0 z-10 w-44 min-w-36 max-w-48 border-e" : "min-w-36 max-w-64"}`}>
            {editor?.id === row.id && editor.key === key ? key === "birthDate" || key === "hebrewBirthDay" ? <ContactDateEditor contact={row} calendar={key === "birthDate" ? "civil" : "hebrew"} onSave={patch => submit(row, patch)} onCancel={cancelEdit} /> : <div className="p-1"><input autoFocus aria-label={`${tr(label)} · ${row.displayName}`} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} className={inputClass} list={key === "tags" ? "crm-groups" : undefined} value={editor.value} onChange={event => setEditor({ ...editor, value: event.target.value, error: undefined })} onBlur={() => commit(row)} onKeyDown={event => { if (event.key === "Escape") { cancelEdit(); } if (event.key === "Enter") { event.preventDefault(); commit(row); } }} />{editor.error && <p role="alert" className="p-1 text-xs text-red-700">{editor.error}</p>}</div> : <button type="button" disabled={disabled || loading} data-column={key} aria-label={`${locale === "he" ? "עריכת" : "Modifier"} ${tr(label)} · ${row.displayName}`} onClick={() => edit(row, key)} className="min-h-12 w-full break-words px-3 py-3 text-start hover:bg-violet-50 focus-visible:outline-violet-600">{text(row, key)}</button>}
            {index === 0 && states[row.id] && <div aria-live="polite" className="px-3 pb-1 text-[11px] text-slate-500">{states[row.id].error ? <button title={states[row.id].error!} onClick={() => queue.retry(row.id)} className="text-red-700 underline">{tr("Réessayer")}</button> : tr(states[row.id].pending.length ? "Enregistrement…" : "Enregistré")}</div>}
          </td>)}
          <td className="border-b border-slate-200 px-2 py-2 align-top"><details><summary aria-label={`${tr("Actions")} · ${row.displayName}`} className="flex size-9 cursor-pointer list-none items-center justify-center rounded hover:bg-slate-100"><MoreHorizontal className="size-4" /></summary><div className="flex w-32 flex-col gap-2 py-2 text-xs"><button disabled={blocked} onClick={() => onEdit(row)} className="min-h-8 text-start disabled:opacity-40">{tr("Fiche complète")}</button><button disabled={blocked} onClick={() => onDelete(row)} className="min-h-8 text-start text-red-700 disabled:opacity-40">{tr("Supprimer")}</button></div></details></td>
        </tr>)}</tbody>
      </table>
      {loading ? <p role="status" className="p-6 text-sm">{tr("Chargement…")}</p> : !displayed.length && <p className="p-6 text-sm text-slate-500">{tr("Aucun contact trouvé.")}</p>}
    </div>
    <datalist id="crm-groups">{groups.map(group => <option key={group} value={group} />)}</datalist>
    <div className="flex items-center justify-between gap-2 text-xs text-slate-600"><span role="status">{locale === "he" ? `${ordered.length} תוצאות` : `${ordered.length} résultat${ordered.length !== 1 ? "s" : ""}`}</span><div className="flex items-center gap-3"><button className="min-h-10 disabled:opacity-40" disabled={blocked || currentPage === 0} onClick={() => setPage(currentPage - 1)}>{tr("Précédent")}</button><span>{currentPage + 1} / {pages}</span><button className="min-h-10 disabled:opacity-40" disabled={blocked || currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>{tr("Suivant")}</button></div></div>
  </div>;
}
