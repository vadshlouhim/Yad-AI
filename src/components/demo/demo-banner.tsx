"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white flex-shrink-0">
      <div className="px-4 py-2 flex items-center gap-3">
        <Sparkles className="size-3.5 flex-shrink-0" />
        <p className="text-xs font-medium flex-1 text-center">
          <strong>Mode démo</strong> — Données fictives de &ldquo;Beth Habad du Marais&rdquo;. Aucune action réelle.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 hover:bg-white/20 rounded-md p-1 transition-colors"
          aria-label="Fermer la bannière"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
