"use client";

import { useState } from "react";
import { Clock3, Plus, X } from "lucide-react";
import { useLocale } from "next-intl";
import type { OutputLocale } from "@/lib/ai/output-locale";
import { parseOfficeText, resolveOfficeTime, type OfficeLine } from "@/lib/religious/office-times";

const QUICK_SERVICES: Record<OutputLocale, string[]> = {
  fr: ["Min'ha", "Arvit", "Cha'harit", "Moussaf", "Cours"],
  he: ["מנחה", "ערבית", "שחרית", "מוסף", "שיעור"],
};

/**
 * Lets the user write the services in their own words, then check and correct each line before
 * the poster is created. Times can be fixed ("18h30") or relative ("15 min avant l'allumage").
 */
export function OfficeTimesEditor({ lines, onChange, entry, exit, outputLocale }: {
  lines: OfficeLine[];
  onChange: (lines: OfficeLine[]) => void;
  entry: string;
  exit: string;
  outputLocale: OutputLocale;
}) {
  const he = useLocale() === "he";
  const [draft, setDraft] = useState("");
  const update = (index: number, patch: Partial<OfficeLine>) => onChange(lines.map((line, current) => current === index ? { ...line, ...patch } : line));

  function addDraft() {
    const parsed = parseOfficeText(draft);
    if (!parsed.length) return;
    onChange([...lines, ...parsed].slice(0, 12));
    setDraft("");
  }

  return (
    <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
      <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Clock3 className="size-4 text-[#421388]" />{he ? "זמני התפילות" : "Horaires des offices"}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {he ? "כתבו בחופשיות, למשל: „שישי מנחה 18:30, ערבית 18:50“ או „מנחה 15 דקות לפני הדלקת נרות“." : "Écrivez librement, par exemple : « Vendredi Min'ha 18h30, Arvit 18h50 » ou « Min'ha 15 min avant l'allumage »."}
      </p>
      <div className="mt-3 flex gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); addDraft(); } }}
          rows={2}
          maxLength={600}
          placeholder={he ? "שחרית 9:30, מוסף 11:00…" : "Cha'harit 9h30, Moussaf 11h…"}
          aria-label={he ? "זמני התפילות" : "Horaires des offices"}
          className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#421388] focus:ring-4 focus:ring-violet-100"
        />
        <button type="button" onClick={addDraft} disabled={!draft.trim()} className="flex shrink-0 items-center gap-1 self-start rounded-xl bg-[#421388] px-3 py-2.5 text-xs font-black text-white disabled:opacity-40">
          <Plus className="size-4" />{he ? "הוספה" : "Ajouter"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_SERVICES[outputLocale].map((service) => (
          <button key={service} type="button" onClick={() => onChange([...lines, { label: service, when: "" }].slice(0, 12))} className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-bold text-[#421388] hover:bg-violet-100">
            + {service}
          </button>
        ))}
      </div>

      {lines.length ? (
        <ul className="mt-3 space-y-2">
          {lines.map((line, index) => {
            const resolved = line.when ? resolveOfficeTime(line.when, { entry, exit }, outputLocale) : null;
            const relative = Boolean(resolved && !/^\s*\d{1,2}\s*[h:]/i.test(line.when));
            return (
              <li key={index} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-violet-100">
                <input value={line.label} onChange={(event) => update(index, { label: event.target.value })} aria-label={he ? "תפילה" : "Office"} placeholder={he ? "תפילה" : "Office"} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-bold" />
                <input value={line.when} onChange={(event) => update(index, { when: event.target.value })} aria-label={he ? "שעה" : "Heure"} placeholder={he ? "18:30" : "18h30"} className="w-28 shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm sm:w-40" />
                {relative ? <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700" title={he ? "מחושב לפי זמני השבוע" : "Calculé avec les horaires de la semaine"}>{resolved}</span> : null}
                <button type="button" onClick={() => onChange(lines.filter((_, current) => current !== index))} aria-label={he ? "מחיקה" : "Supprimer"} className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="size-4" /></button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
