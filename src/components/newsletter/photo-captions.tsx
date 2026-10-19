"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { UploadedPhoto } from "./newsletter-paper-client";
import { CAPTION_LIMIT } from "@/lib/newsletter/revision";
import { useTranslations } from "next-intl";

export function PhotoCaptions({ photos, onChange }: { photos: UploadedPhoto[]; onChange: (photos: UploadedPhoto[]) => void }) {
  const t = useTranslations("newsletter.photos");
  const [selected, setSelected] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const selectedPhotos = photos.filter(photo => selected.includes(photo.id));
  function group() {
    const indexes = photos.flatMap((photo, i) => selected.includes(photo.id) ? [i] : []);
    if (indexes.length < 2 || !caption.trim()) { setError(t("errors.minimum")); return; }
    if (indexes.at(-1)! - indexes[0] + 1 !== indexes.length) { setError(t("errors.consecutive")); return; }
    const touchedGroups = new Set(selectedPhotos.map(photo => photo.captionGroup).filter(Boolean));
    if (photos.some(photo => photo.captionGroup && touchedGroups.has(photo.captionGroup) && !selected.includes(photo.id))) { setError(t("errors.wholeGroup")); return; }
    const id = crypto.randomUUID();
    onChange(photos.map(photo => selected.includes(photo.id) ? { ...photo, captionGroup: id, groupCaption: caption } : photo));
    setError(""); setSelected([]); setCaption("");
  }
  function ungroup() {
    const groups = new Set(selectedPhotos.map(photo => photo.captionGroup).filter(Boolean));
    onChange(photos.map(photo => photo.captionGroup && groups.has(photo.captionGroup) ? { ...photo, captionGroup: undefined, groupCaption: undefined } : photo));
    setSelected([]); setError("");
  }
  return <div className="mt-4 space-y-3">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{photos.map((photo, index) => <div key={photo.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-2">
      <img src={photo.url} alt={photo.name} className="aspect-square w-full object-contain" />
      <label className="mt-2 block text-xs font-semibold text-slate-700">{t("caption", { number: index + 1 })}<textarea maxLength={CAPTION_LIMIT} rows={2} value={photo.caption ?? ""} onChange={event => onChange(photos.map(item => item.id === photo.id ? { ...item, caption: event.target.value } : item))} placeholder={t("captionPlaceholder")} className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2 text-sm font-normal" /></label>
      {photo.groupCaption && <p className="mt-1 break-words text-xs text-teal-700">{t("groupCaption", { caption: photo.groupCaption })}</p>}
      <label className="mt-2 flex items-center gap-1 text-xs"><input type="checkbox" checked={selected.includes(photo.id)} onChange={event => setSelected(event.target.checked ? [...selected, photo.id] : selected.filter(id => id !== photo.id))} />{t("group")}</label>
      <button type="button" onClick={() => { onChange(photos.filter(item => item.id !== photo.id)); setSelected(selected.filter(id => id !== photo.id)); }} className="mt-2 text-xs text-red-700 underline">{t("removePhoto", { number: index + 1 })}</button>
    </div>)}</div>
    {selectedPhotos.length > 0 && <div className="space-y-2 rounded-xl bg-sky-50 p-3">
      <label className="block text-sm font-semibold">{t("groupLabel", { count: selectedPhotos.length })}<input maxLength={CAPTION_LIMIT} value={caption} onChange={event => setCaption(event.target.value)} placeholder={t("groupPlaceholder")} className="mt-1 w-full rounded-lg border bg-white p-2 font-normal" /></label>
      <div className="flex flex-wrap gap-3 text-xs"><button type="button" onClick={group} className="rounded-lg bg-[#005572] px-3 py-2 font-semibold text-white">{t("apply")}</button><button type="button" onClick={ungroup}>{t("remove")}</button></div>
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </div>;
}
