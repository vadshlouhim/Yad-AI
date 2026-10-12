"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportItem {
  id: string;
  listingId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  listing: { id: string; title: string; status: string } | null;
  reporter: { name: string | null; email: string } | null;
}

export function MarketplaceReportsClient() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/community-marketplace/reports", { cache: "no-store" });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) return setError(payload.error ?? "Chargement impossible");
    setReports(payload.data ?? []);
  }, []);
  useEffect(() => {
    fetch("/api/admin/community-marketplace/reports", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok) setError(payload.error ?? "Chargement impossible");
        else setReports(payload.data ?? []);
      })
      .catch(() => setError("Chargement impossible"))
      .finally(() => setLoading(false));
  }, []);

  async function moderate(reportId: string, action: "dismiss" | "hide") {
    const response = await fetch("/api/admin/community-marketplace/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId, action }) });
    if (response.ok) await load();
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="size-4" /> Retour à l’administration</Link><div className="mt-5 rounded-3xl bg-slate-950 p-7 text-white"><AlertTriangle className="size-8 text-amber-400" /><h1 className="mt-4 text-3xl font-black">Signalements de la boutique</h1><p className="mt-2 text-sm text-slate-400">Examinez les annonces signalées, masquez-les ou classez le signalement.</p></div>{error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{loading ? <p className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Chargement…</p> : <div className="mt-6 space-y-4">{reports.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Aucun signalement.</p>}{reports.map((report) => <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><span className={`rounded-full px-2 py-1 text-xs font-bold ${report.status === "open" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{report.status}</span><h2 className="mt-3 text-lg font-black">{report.listing?.title ?? "Annonce supprimée"}</h2><p className="mt-1 text-sm text-slate-500">Motif : {report.reason} · par {report.reporter?.email ?? "utilisateur inconnu"}</p>{report.details && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{report.details}</p>}</div>{report.status === "open" && <div className="flex shrink-0 gap-2"><Button variant="outline" onClick={() => moderate(report.id, "dismiss")}><CheckCircle2 /> Classer</Button><Button variant="destructive" onClick={() => moderate(report.id, "hide")}><EyeOff /> Masquer</Button></div>}</div></article>)}</div>}</div></main>;
}
