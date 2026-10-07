"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, DatabaseZap, Loader2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = { connected?: boolean; lastSyncAt?: string | null; lastSyncError?: string | null };

export function UnisoftIntegrationCard() {
  const [status, setStatus] = useState<Status>({});
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/integrations/unisoft", { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }
  useEffect(() => { void load(); }, []);

  async function connect() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/integrations/unisoft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Connexion impossible.");
      setApiKey(""); setMessage(`${payload.contactCount ?? 0} contacts accessibles. Connexion enregistrée.`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connexion impossible."); }
    finally { setBusy(false); }
  }

  async function sync() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/integrations/unisoft/sync", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Synchronisation impossible.");
      const warning = Array.isArray(payload.warnings) && typeof payload.warnings[0] === "string" ? ` ${payload.warnings[0]}` : "";
      setMessage(`${payload.contactsCreated ?? 0} contacts ajoutés, ${payload.contactsUpdated ?? 0} actualisés, ${payload.yahrzeitsCreated ?? 0} Yahrzeit ajoutés.${warning}`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Synchronisation impossible."); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    if (!window.confirm("Déconnecter Unisoft et supprimer la clé enregistrée ?")) return;
    setBusy(true);
    await fetch("/api/integrations/unisoft", { method: "DELETE" });
    setStatus({}); setMessage("Unisoft déconnecté."); setBusy(false);
  }

  return <section className="rounded-[1.8rem] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
    <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-700 text-white"><DatabaseZap className="size-5" /></span><div><h2 className="font-black text-slate-950">Synchronisation Unisoft</h2><p className="mt-1 text-sm leading-6 text-slate-600">Import à sens unique vers EasyCom : contacts, anniversaires et Yahrzeit. La clé API est chiffrée.</p></div></div>
    {status.connected ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-sm font-black text-emerald-800"><CheckCircle2 className="size-4" />Unisoft connecté</p><p className="mt-1 text-xs text-slate-600">Dernière synchronisation : {status.lastSyncAt ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.lastSyncAt)) : "jamais"}</p>{status.lastSyncError && <p className="mt-2 text-xs font-bold text-red-700">{status.lastSyncError}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void sync()} disabled={busy} className="rounded-xl bg-cyan-700 hover:bg-cyan-800">{busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Synchroniser maintenant</Button><Button variant="outline" onClick={() => void disconnect()} disabled={busy} className="rounded-xl"><Unplug className="size-4" />Déconnecter</Button></div></div> : <div className="mt-5 flex flex-col gap-2 sm:flex-row"><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Clé API Unisoft (scope contacts:read)" autoComplete="new-password" className="h-11 min-w-0 flex-1 rounded-xl border border-cyan-200 bg-white px-3 text-sm outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100" /><Button onClick={() => void connect()} disabled={busy || !apiKey.trim()} className="rounded-xl bg-cyan-700 hover:bg-cyan-800">{busy && <Loader2 className="size-4 animate-spin" />}Tester et connecter</Button></div>}
    {message && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">{message}</p>}<p className="mt-3 text-xs text-slate-500">Créez la clé dans Unisoft avec le droit minimal <code>contacts:read</code>. EasyCom ne modifie aucune donnée Unisoft.</p>
  </section>;
}
