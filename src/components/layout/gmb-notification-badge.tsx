"use client";

/**
 * Composant invisible qui poll /api/gmb/unread-count toutes les 5 minutes.
 * Met à jour le badge "Avis Google" dans le DOM via data-attribute.
 * Rendu une seule fois dans le DashboardLayout.
 */
import { useEffect } from "react";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BADGE_SELECTOR = "[data-gmb-badge]";

export function GmbNotificationBadge() {
  async function fetchAndUpdate() {
    try {
      const res = await fetch("/api/gmb/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const count: number = data.count ?? 0;
      const connected: boolean = data.connected ?? false;

      // Met à jour tous les éléments marqués data-gmb-badge
      document.querySelectorAll(BADGE_SELECTOR).forEach((el) => {
        if (count > 0 && connected) {
          el.textContent = String(count);
          (el as HTMLElement).style.display = "";
        } else {
          (el as HTMLElement).style.display = "none";
        }
      });

      // Mettre à jour le title de la page si on est sur les avis
      if (window.location.pathname.includes("google-reviews") && count > 0) {
        document.title = `(${count}) Avis Google — EasyCom IA`;
      }
    } catch {
      // Non bloquant
    }
  }

  useEffect(() => {
    fetchAndUpdate();
    const id = setInterval(fetchAndUpdate, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
