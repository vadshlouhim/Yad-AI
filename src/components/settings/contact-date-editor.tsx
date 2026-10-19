"use client";

import { useState } from "react";
import { getCurrentHebrewDate, getHebrewMonthsForYear } from "@/lib/contacts/hebrew-birthday";
import { buildMemberPatch } from "@/lib/contacts/member-patch";
import type { CommunityMember } from "@/lib/contacts/crm";
import type { MemberInput } from "@/lib/contacts/normalize";
import { useLocale } from "next-intl";
import { useDashboardCopy } from "@/lib/i18n/use-dashboard-copy";

export function ContactDateEditor({ contact, calendar, onSave, onCancel }: { contact: CommunityMember; calendar: "civil" | "hebrew"; onSave: (patch: MemberInput) => void; onCancel: () => void }) {
  const locale = useLocale();
  const tr = useDashboardCopy();
  const [civil, setCivil] = useState(contact.birthDate?.slice(0, 10) ?? "");
  const [day, setDay] = useState(String(contact.hebrewBirthDay ?? ""));
  const [month, setMonth] = useState(String(contact.hebrewBirthMonth ?? ""));
  const [year, setYear] = useState(String(contact.hebrewBirthYear ?? ""));
  const [sunset, setSunset] = useState(contact.birthAfterSunset);
  const [error, setError] = useState("");
  function save() {
    const patch: MemberInput = calendar === "civil" ? { birthDate: civil, birthAfterSunset: sunset } : { hebrewBirthDay: day, hebrewBirthMonth: month, hebrewBirthYear: year, birthAfterSunset: sunset };
    try { buildMemberPatch(contact, patch); onSave(patch); } catch (failure) { setError((failure as Error).message); }
  }
  const inputClass = "h-10 min-w-0 rounded border bg-white px-2 text-sm";
  return <div className="w-64 max-w-full space-y-3 p-2" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onCancel(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) save(); }}>
    {calendar === "civil" ? <input autoFocus aria-label={tr("Naissance civile")} type="date" className={`${inputClass} w-full`} value={civil} onChange={event => setCivil(event.target.value)} /> : <div className="grid grid-cols-[55px_1fr_75px] gap-1">
      <input autoFocus aria-label={locale === "he" ? "יום עברי" : "Jour hébraïque"} type="number" min={1} max={30} className={inputClass} placeholder={tr("Jour")} value={day} onChange={event => setDay(event.target.value)} />
      <select aria-label={locale === "he" ? "חודש עברי" : "Mois hébraïque"} className={inputClass} value={month} onChange={event => setMonth(event.target.value)}><option value="">{tr("Mois")}</option>{getHebrewMonthsForYear(Number(year) || getCurrentHebrewDate("Europe/Paris").getFullYear()).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <input aria-label={locale === "he" ? "שנה עברית" : "Année hébraïque"} type="number" min={3761} max={9999} className={inputClass} placeholder={tr("Année")} value={year} onChange={event => setYear(event.target.value)} />
    </div>}
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={sunset} onChange={event => setSunset(event.target.checked)} />{tr("Après le coucher du soleil")}</label>
    {error && <p role="alert" className="whitespace-normal text-xs text-red-700">{error}</p>}
    <div className="flex gap-3 text-xs"><button type="button" onMouseDown={event => event.preventDefault()} onClick={save}>{tr("Valider")}</button><button type="button" onMouseDown={event => event.preventDefault()} onClick={onCancel}>{tr("Annuler")}</button><button type="button" onMouseDown={event => event.preventDefault()} onClick={() => onSave({ birthDate: null })}>{tr("Effacer")}</button></div>
  </div>;
}
