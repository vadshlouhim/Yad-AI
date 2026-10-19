"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Undo2 } from "lucide-react";
import { composeNewsletter, type NewsletterDocumentData } from "@/lib/newsletter/document-layout";
import { REVISION_FIELDS, validateNewsletterRevision, type RevisionField, type NewsletterRevision as Revision } from "@/lib/newsletter/revision";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function NewsletterRevision({ data, onApply, onUndo, canUndo, onBusy }: { data: NewsletterDocumentData; onApply: (revision: Revision, pages: string[], key: string) => void; onUndo: () => void; canUndo: boolean; onBusy: (busy: boolean) => void }) {
  const t = useTranslations("newsletter.revision");
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [allowed, setAllowed] = useState<RevisionField[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const latestKey = useRef(JSON.stringify(data));
  const mounted = useRef(true);
  useEffect(() => { latestKey.current = JSON.stringify(data); }, [data]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function revise() {
    if (busyRef.current || !instructions.trim()) return;
    busyRef.current = true; setBusy(true); onBusy(true); setError(""); setMessage("");
    const sourceKey = JSON.stringify(data);
    try {
      const response = await fetch("/api/newsletter/revise", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(65000), body: JSON.stringify({
        instructions, editableFields: allowed, layout: data.layout, outputLocale: data.outputLocale,
        texts: { ...data.generated, parnessText: data.parnessText, kiddushText: data.kiddushText },
        blockIds: ["rav", "parasha", "sefer-hamitsvot", "events-intro", ...data.events.map(event => `event-${event.id}`), "birthdays"],
      }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(t("unavailable"));
      const revision = validateNewsletterRevision(payload, allowed);
      const { parnessText, kiddushText, ...texts } = revision.changes;
      const candidate = { ...data, generated: { ...data.generated, ...texts }, parnessText: parnessText ?? data.parnessText, kiddushText: kiddushText ?? data.kiddushText, layout: { ...data.layout, ...revision.layout } };
      const pages = await composeNewsletter(candidate);
      if (!mounted.current) return;
      if (latestKey.current !== sourceKey) throw new Error(t("draftChanged"));
      if (!pages.length || pages.length > 2) throw new Error(t("tooManyPages"));
      onApply(revision, pages, JSON.stringify(candidate));
      setMessage(t("success"));
      setOpen(false);
    } catch (failure) { setError(`${failure instanceof Error ? failure.message : t("error")} ${t("preserved")}`); }
    finally { busyRef.current = false; setBusy(false); onBusy(false); }
  }
  return <div className="mb-5 space-y-3 print:hidden">
    <Button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="newsletter-ai-instructions" disabled={busy} className="min-h-14 w-full whitespace-normal rounded-2xl bg-gradient-to-r from-violet-700 via-fuchsia-600 to-rose-500 px-5 py-3 text-start font-bold text-white shadow-lg shadow-fuchsia-200/50 hover:brightness-110"><Sparkles className="size-5 shrink-0" />{t("title")}</Button>
    {open && <div id="newsletter-ai-instructions" className="space-y-3 rounded-2xl border border-violet-200 bg-white p-4">
      <label className="block text-sm font-semibold">{t("question")}<textarea autoFocus rows={3} maxLength={2000} value={instructions} onChange={event => setInstructions(event.target.value)} placeholder={t("placeholder")} className="mt-2 w-full rounded-xl border border-violet-200 p-3 text-base font-normal" /></label>
      <details><summary className="cursor-pointer text-sm font-semibold text-violet-800">{t("allow")}</summary><p className="my-2 text-xs text-slate-600">{t("help")}</p><div className="flex flex-wrap gap-3">{REVISION_FIELDS.map(field => <label key={field} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={allowed.includes(field)} onChange={event => setAllowed(event.target.checked ? [...allowed, field] : allowed.filter(item => item !== field))} />{t(`fields.${field}`)}</label>)}</div></details>
      <Button type="button" loading={busy} disabled={!instructions.trim() || busy} onClick={() => void revise()} className="rounded-xl bg-violet-700 text-white">{t("submit")}</Button>
    </div>}
    {busy && <p role="status" className="text-sm text-violet-800">{t("busy")}</p>}
    {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
    {canUndo && <button type="button" disabled={busy} onClick={() => { onUndo(); setMessage(t("restored")); setError(""); }} className="flex items-center gap-2 text-sm font-semibold text-violet-800 underline"><Undo2 className="size-4" />{t("undo")}</button>}
  </div>;
}
