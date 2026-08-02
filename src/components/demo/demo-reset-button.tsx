"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useDemoState } from "./demo-state";

export function DemoResetButton() {
  const { reset } = useDemoState();
  const [confirmed, setConfirmed] = useState(false);

  function handleReset() {
    reset();
    setConfirmed(true);
    window.setTimeout(() => setConfirmed(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 md:inline-flex"
      title="Restaurer les données fictives initiales"
    >
      <RotateCcw className="size-3.5" />
      {confirmed ? "Démo réinitialisée" : "Réinitialiser"}
    </button>
  );
}
