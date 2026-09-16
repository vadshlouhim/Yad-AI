"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CommunityLogoPicker({ value, onChange, onBusyChange, onError }: {
  value: string | null;
  onChange: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      onError("Choisissez une image de moins de 8 Mo.");
      return;
    }
    setBusy(true);
    onBusyChange(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads/community-logo", { method: "POST", body });
      const data = await response.json();
      if (!response.ok || !data.logoUrl) throw new Error(data.error ?? "Téléversement impossible.");
      onChange(data.logoUrl);
    } catch (error) { onError(error instanceof Error ? error.message : "Téléversement impossible."); }
    finally { setBusy(false); onBusyChange(false); if (input.current) input.current.value = ""; }
  }
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
      <div className="flex items-center gap-3">
        {value ? <img src={value} alt="Logo de la communauté" className="size-16 rounded-xl bg-white object-contain p-1" /> : null}
        <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()} className="rounded-xl">
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
          {value ? "Remplacer le logo" : "Ajouter le logo"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-600">Ce logo devient aussi le logo par défaut de votre communauté.</p>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" aria-label="Choisir un logo" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} />
    </div>
  );
}
