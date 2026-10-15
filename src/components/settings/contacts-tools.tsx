"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
const Unisoft = dynamic(() => import("./unisoft-integration-card").then(module => module.UnisoftIntegrationCard), { loading: () => <p>Chargement…</p> });
const Yahrzeits = dynamic(() => import("./yahrzeit-manager").then(module => module.YahrzeitManager), { loading: () => <p>Chargement…</p> });
export function ContactsTools() {
  const [opened, setOpened] = useState({ unisoft: false, yahrzeit: false });
  return <div className="space-y-2">{(["unisoft", "yahrzeit"] as const).map(key => <details key={key} className="rounded-xl border bg-white p-3" onToggle={event => { if (event.currentTarget.open) setOpened(current => ({ ...current, [key]: true })); }}><summary className="cursor-pointer text-sm font-semibold">{key === "unisoft" ? "Unisoft" : "Yahrzeits"}</summary>{opened[key] && <div className="pt-3">{key === "unisoft" ? <Unisoft /> : <Yahrzeits />}</div>}</details>)}</div>;
}
