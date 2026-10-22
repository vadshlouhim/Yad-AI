"use client";

import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { composeNewsletter, PAPER, type NewsletterDocumentData } from "@/lib/newsletter/document-layout";
import { useTranslations } from "next-intl";
import { NEWSLETTER_ERROR_CODES, newsletterErrorCode } from "@/lib/newsletter/errors";

export type NewsletterDocumentHandle = { prepare: () => Promise<HTMLElement[]> };
const paint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

// Keep canonical DOM nodes stable during unrelated autosave/status re-renders.
const PageMarkup = memo(function PageMarkup({ html }: { html: string }) {
  return <div className="newsletter-print-page" dangerouslySetInnerHTML={{ __html: html }} />;
});

export const NewsletterDocument = forwardRef<NewsletterDocumentHandle, {
  data: NewsletterDocumentData;
  visible: boolean;
  onError: (error: string) => void;
  prepared?: { key: string; pages: string[] } | null;
}>(function NewsletterDocument({ data, visible, onError, prepared }, ref) {
  const t = useTranslations("newsletter.document");
  const key = JSON.stringify(data);
  const [rendered, setRendered] = useState<{ key: string; pages: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(1);
  const [selectedPage, setSelectedPage] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const printRoot = useRef<HTMLDivElement>(null);
  const previewRefs = useRef<Array<HTMLDivElement | null>>([]);
  const alive = useRef(true);
  const pending = useRef<{ key: string; promise: Promise<string[]> } | null>(null);
  const latestKey = useRef(key);

  useEffect(() => { latestKey.current = key; }, [key]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const prepare = useCallback(async () => {
    setBusy(true);
    try {
      if (pending.current?.key !== key) {
        pending.current = { key, promise: prepared?.key === key ? Promise.resolve(prepared.pages) : composeNewsletter(JSON.parse(key) as NewsletterDocumentData) };
      }
      const job = pending.current;
      const pages = await job.promise;
      if (!alive.current || latestKey.current !== key) throw new Error(t("contentChanged"));
      setRendered({ key, pages });
      await paint();
      return Array.from(printRoot.current?.querySelectorAll<HTMLElement>("article[data-newsletter-page]") ?? []);
    } catch (error) {
      if (pending.current?.key === key) pending.current = null;
      if (alive.current && latestKey.current === key) setRendered(null);
      throw error;
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [key, prepared, t]);

  useImperativeHandle(ref, () => ({ prepare }), [prepare]);
  useEffect(() => {
    if (visible) void prepare().catch((error: unknown) => {
      if (alive.current && latestKey.current === key) {
        const code = newsletterErrorCode(error);
        onError(code === NEWSLETTER_ERROR_CODES.layoutOverflow ? t("layoutOverflow", { pages: (JSON.parse(key) as NewsletterDocumentData).layout?.pageLimit ?? 2 }) : code === NEWSLETTER_ERROR_CODES.printableOverflow ? t("printableOverflow") : t("compositionError"));
      }
    });
  }, [visible, prepare, onError, key, t]);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / PAPER.width)));
    observer.observe(root);
    return () => observer.disconnect();
  }, [visible]);

  const pages = rendered?.key === key ? rendered.pages : [];
  return <>
    {visible ? <div ref={container} className="min-w-0 w-full" aria-busy={busy}>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden" aria-label={t("pagesAria")}>
        {pages.map((html, index) => <button key={index} type="button" onClick={() => {
          setSelectedPage(index);
          previewRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }} aria-current={selectedPage === index ? "page" : undefined} className="rounded-lg border border-[#bb8a36]/40 bg-[#faf7f0] px-3 py-2 text-sm font-semibold text-[#005572] aria-[current=page]:bg-[#005572] aria-[current=page]:text-white">{index === 0 ? t("front") : index === 1 ? t("back") : html.includes('data-composition="support-page"') ? t("support") : t("posters", { number: index + 1 })}</button>)}
        {busy ? <span role="status" className="text-sm text-slate-600">{t("previewComposing")}</span> : <span className="text-sm text-slate-600">{t("previewSummary", { count: pages.length })}</span>}
      </div>
      {pages.map((html, index) => <div key={index} dir="ltr" ref={(node) => { previewRefs.current[index] = node; }} className="relative mx-auto mb-6 overflow-hidden scroll-mt-6 bg-white shadow-lg" style={{ width: PAPER.width * scale, height: PAPER.height * scale }}>
        <div className="absolute left-0 top-0" style={{ width: PAPER.width, height: PAPER.height, transform: `scale(${scale})`, transformOrigin: "top left" }}><PageMarkup html={html} /></div>
      </div>)}
    </div> : null}
    {typeof document !== "undefined" ? createPortal(<div id="newsletter-print" ref={printRoot} aria-hidden="true" style={{ position: "fixed", left: -20000, top: 0, width: PAPER.width, pointerEvents: "none" }}>
      {pages.map((html, index) => <PageMarkup key={index} html={html} />)}
    </div>, document.body) : null}
    <style>{`@media print {
      @page { size: A4 portrait; margin: 0; }
      body:has(#newsletter-print) > *:not(#newsletter-print) { display: none !important; }
      #newsletter-print { position: static !important; width: 210mm !important; }
      #newsletter-print .newsletter-print-page { break-after: page; print-color-adjust: exact; }
      #newsletter-print .newsletter-print-page:last-child { break-after: auto; }
      #newsletter-print article { width: 210mm !important; height: 297mm !important; }
    }`}</style>
  </>;
});
