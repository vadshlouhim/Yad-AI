"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Crown, Download, Edit3, ImageIcon, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanvaLogo } from "@/components/templates/template-actions";
import { cn } from "@/lib/utils";
import type { OutputLocale } from "@/lib/ai/output-locale";

export type ScheduleTemplate = {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  isPremium: boolean;
  supportsAi?: boolean;
  canvaUrl?: string | null;
  subCategory?: string | null;
  tags?: string[] | null;
};

export function ScheduleTemplateImage({ template, className }: { template: ScheduleTemplate; className?: string }) {
  const [source, setSource] = useState(template.previewUrl ?? template.thumbnailUrl);
  if (!source) return <div className={cn("flex items-center justify-center bg-slate-100 text-slate-300", className)}><ImageIcon className="size-10" /></div>;
  return <img src={source} alt={template.name} className={cn("object-cover", className)} onError={() => setSource(source === template.thumbnailUrl ? null : template.thumbnailUrl)} />;
}

export function ScheduleTemplateGallery({
  templates,
  isPaid,
  onSelect,
  emptyTitle,
  emptyHelp,
  offeredLabel,
  premiumLabel,
  variantLabel,
}: {
  templates: ScheduleTemplate[];
  isPaid: boolean;
  onSelect: (template: ScheduleTemplate, index: number) => void;
  emptyTitle: string;
  emptyHelp: string;
  offeredLabel: string;
  premiumLabel: string;
  variantLabel?: (template: ScheduleTemplate) => { label: string; className: string } | null;
}) {
  if (templates.length === 0) return (
    <div className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center">
      <ImageIcon className="mx-auto size-10 text-slate-300" />
      <p className="mt-3 font-black text-slate-900">{emptyTitle}</p>
      <p className="mt-1 text-sm text-slate-500">{emptyHelp}</p>
    </div>
  );

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((template, index) => {
        const locked = !isPaid && index > 0;
        const variant = variantLabel?.(template);
        return (
          <article key={template.id} className="group flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-1.5 text-start shadow-sm transition duration-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-950/10">
            <button type="button" onClick={() => onSelect(template, index)} className="min-w-0 text-start focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300">
              <div className="relative aspect-square overflow-hidden rounded-[1.2rem] bg-slate-100">
                <ScheduleTemplateImage template={template} className="h-full w-full transition duration-300 group-hover:scale-[1.02]" />
                <span className="absolute start-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-700 shadow-sm backdrop-blur">{index === 0 ? offeredLabel : premiumLabel}</span>
                {variant ? <span className={cn("absolute bottom-2 end-2 z-10 rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm backdrop-blur", variant.className)}>{variant.label}</span> : null}
                {locked ? <div className="absolute inset-0 flex items-center justify-center bg-slate-950/48 backdrop-blur-[1px]"><span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-black text-[#421388] shadow-xl"><Crown className="size-4 text-amber-500" /> Premium</span></div> : null}
                {template.canvaUrl ? <span className="absolute bottom-2 start-2 inline-flex rounded-full bg-white/95 px-2 py-1 shadow"><CanvaLogo className="h-4" /></span> : null}
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-3">
                <span className="line-clamp-1 text-sm font-black text-slate-900">{template.name}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[#421388] transition group-hover:bg-[#421388] group-hover:text-white">{locked ? <Crown className="size-4" /> : <Sparkles className="size-4" />}</span>
              </div>
            </button>
          </article>
        );
      })}
    </div>
  );
}

export function SchedulePosterDialog({
  open,
  busy,
  eyebrow,
  title,
  closeLabel,
  headerVisual,
  onClose,
  children,
}: {
  open: boolean;
  busy: boolean;
  eyebrow: string;
  title: string;
  closeLabel: string;
  headerVisual?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [busy, onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="religious-poster-dialog-title" className="max-h-[94dvh] w-full max-w-5xl overflow-y-auto rounded-t-[2rem] bg-slate-50 shadow-2xl sm:max-h-[92vh] sm:rounded-[2rem]">
        <SchedulePosterDialogHeader titleId="religious-poster-dialog-title" busy={busy} eyebrow={eyebrow} title={title} closeLabel={closeLabel} headerVisual={headerVisual} onClose={onClose} />
        {children}
      </section>
    </div>
  );
}

export function SchedulePosterDialogHeader({ titleId, busy, eyebrow, title, closeLabel, headerVisual, onClose }: { titleId: string; busy: boolean; eyebrow: string; title: string; closeLabel: string; headerVisual?: ReactNode; onClose: () => void }) {
  return <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-violet-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6"><div className="relative flex size-14 shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-violet-50 text-[#421388] ring-1 ring-violet-100">{headerVisual ?? <Sparkles className="m-auto size-7" />}</div><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#421388]">{eyebrow}</p><h2 id={titleId} className="truncate text-lg font-black text-slate-950">{title}</h2></div><button type="button" aria-label={closeLabel} onClick={onClose} disabled={busy} className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"><X className="size-5" /></button></div>;
}

export function OutputLocalePicker({ value, onChange, label, help, frLabel, heLabel }: { value: OutputLocale; onChange: (locale: OutputLocale) => void; label: string; help: string; frLabel: string; heLabel: string }) {
  return <div className="rounded-[1.6rem] border border-violet-200 bg-white p-4 shadow-sm"><label className="text-sm font-black text-slate-900">{label}</label><p className="mt-1 text-xs text-slate-500">{help}</p><div className="mt-3 grid grid-cols-2 gap-2" dir="ltr">{(["fr", "he"] as const).map((locale) => <button key={locale} type="button" onClick={() => onChange(locale)} className={cn("rounded-xl border px-4 py-2.5 text-sm font-black", value === locale ? "border-[#421388] bg-violet-50 text-[#421388]" : "border-slate-200 bg-white text-slate-600")}>{locale === "fr" ? frLabel : heLabel}</button>)}</div></div>;
}

export function SchedulePosterPreview({ template, imageUrl, alt }: { template: ScheduleTemplate; imageUrl?: string | null; alt: string }) {
  return <div className="mx-auto flex w-full justify-center py-2"><div className="relative aspect-[12/25] w-full max-w-[315px] rounded-[3.5rem] border-[1.5px] border-[#b0853e] bg-[#f2935a] p-[4px] shadow-[0_22px_54px_rgba(15,23,42,0.34)]"><div className="absolute -left-[5px] top-[110px] h-[30px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" /><div className="absolute -left-[5px] top-[160px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" /><div className="absolute -left-[5px] top-[230px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" /><div className="absolute -right-[5px] top-[175px] h-[75px] w-[5px] rounded-r-md border-y border-r border-[#b0853e] bg-[#f2935a]" /><div className="relative flex h-full w-full flex-col overflow-hidden rounded-[3.2rem] bg-white"><div className="flex h-12 w-full shrink-0 items-center justify-between px-6 pt-2 text-black"><span className="w-1/3 ps-1 text-[14px] font-semibold">9:41</span><span className="mt-1 h-[29px] w-[105px] rounded-full bg-black" /><span className="flex w-1/3 justify-end pe-1 text-[11px] font-bold">5G</span></div><div className="min-h-0 flex-1 bg-slate-50 p-3 pb-7"><div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] bg-white shadow-inner ring-1 ring-slate-200/80">{imageUrl ? <img src={imageUrl} alt={alt} className="h-full w-full object-contain" /> : <ScheduleTemplateImage template={template} className="h-full w-full object-contain" />}</div></div><div className="absolute bottom-2 flex w-full justify-center pb-1"><div className="h-[5px] w-[125px] rounded-full bg-slate-300" /></div></div></div></div>;
}

export function PosterResultActions({ onEdit, onDownload, editLabel, downloadLabel }: { onEdit: () => void; onDownload: () => void; editLabel: string; downloadLabel: string }) {
  return <div className="grid grid-cols-2 gap-3"><button type="button" onClick={onEdit} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-blue-400 bg-gradient-to-r from-[#315ecb] to-[#4b7fe8] p-3 text-sm font-black text-white shadow-md shadow-blue-200 transition hover:-translate-y-0.5 hover:brightness-105"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#2364d2] shadow-sm"><Edit3 className="size-5" /></span>{editLabel}</button><button type="button" onClick={onDownload} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-pink-400 bg-gradient-to-r from-[#d92d7c] to-[#f06b45] p-3 text-sm font-black text-white shadow-md shadow-rose-200 transition hover:-translate-y-0.5 hover:brightness-105"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#d12d7e] shadow-sm"><Download className="size-5" /></span>{downloadLabel}</button></div>;
}

export function SocialPublishPanel({ connected, selected, onToggle, onPublish, publishing, title, help, disconnectedLabel, publishLabel }: { connected: Set<string>; selected: string[]; onToggle: (id: string) => void; onPublish: () => void; publishing: boolean; title: string; help: string; disconnectedLabel: string; publishLabel: string }) {
  return <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h3 className="font-black text-slate-950">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{help}</p></div><Send className="size-5 text-[#421388]" /></div><div className="mt-4 grid grid-cols-2 gap-2">{[{ id: "FACEBOOK", label: "Facebook" }, { id: "INSTAGRAM", label: "Instagram" }].map(({ id, label }) => { const active = selected.includes(id); const isConnected = connected.has(id); return <button key={id} type="button" disabled={!isConnected} onClick={() => onToggle(id)} className={cn("relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border p-2 text-xs font-black transition", active && id === "FACEBOOK" && "border-blue-400 bg-[#315ecb] text-white", active && id === "INSTAGRAM" && "border-pink-400 bg-gradient-to-r from-[#d92d7c] to-[#f06b45] text-white", !active && "border-slate-200 bg-white text-slate-600", !isConnected && "cursor-not-allowed bg-slate-50 text-slate-400 opacity-70")}>{active ? <Check className="absolute end-2 top-2 size-4" /> : null}<span>{label}</span>{!isConnected ? <span className="text-[9px]">{disconnectedLabel}</span> : null}</button>; })}</div><Button type="button" className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#d92d7c] to-[#f06b45] font-black" loading={publishing} disabled={selected.length === 0} onClick={onPublish}><Send className="size-4" />{publishLabel}</Button></div>;
}
