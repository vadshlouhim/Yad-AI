import { getLocale } from "next-intl/server";

// Shown instantly while a dashboard page loads, so a click never looks frozen.
export default async function DashboardLoading() {
  const he = (await getLocale()) === "he";
  return (
    <div className="mx-auto w-full max-w-5xl animate-pulse space-y-5 px-3 py-4 sm:px-6 md:py-6" role="status" aria-busy="true">
      <span className="sr-only">{he ? "טוען…" : "Chargement…"}</span>
      <div className="h-28 rounded-[2rem] bg-[#421388]/15" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-24 rounded-[1.5rem] bg-slate-200/70" />
        <div className="h-24 rounded-[1.5rem] bg-slate-200/70" />
        <div className="h-24 rounded-[1.5rem] bg-slate-200/70" />
      </div>
      <div className="h-64 rounded-[1.7rem] bg-slate-200/60" />
    </div>
  );
}
