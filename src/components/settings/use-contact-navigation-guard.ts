"use client";
import { useEffect } from "react";

export function useContactNavigationGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const confirm = () => window.confirm("Des modifications ne sont pas enregistrées. Quitter cette page ?");
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (link && link.href !== window.location.href && !confirm()) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const navigate = (event: Event) => { if (!confirm()) event.preventDefault(); };
    // The Navigation API also covers browser Back/Forward without altering Next's history state.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const traverse = (event: Event) => {
      const navigationEvent = event as Event & { navigationType?: string };
      if (navigationEvent.navigationType === "traverse" && event.cancelable && !confirm()) event.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    window.addEventListener("contacts:before-navigate", navigate);
    navigation?.addEventListener("navigate", traverse);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); window.removeEventListener("contacts:before-navigate", navigate); navigation?.removeEventListener("navigate", traverse); };
  }, [dirty]);
}
