import { DemoFeaturePage } from "@/components/demo/demo-feature-page";

const CALENDAR_ITEMS = [
  { day: "Vendredi", item: "Allumage des bougies - 17:42" },
  { day: "Samedi", item: "Havdala - 18:58" },
  { day: "Mardi", item: "Roch Hodech Kislev (demo)" },
];

export default function DemoHebrewCalendarPage() {
  return (
    <DemoFeaturePage
      title="Calendrier hébraïque"
      subtitle="Repères calendaires et horaires halakhiques en mode démonstration."
      highlights={[
        "Horaires Chabbat",
        "Fêtes à venir",
        "Déclencheurs automatisations",
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {CALENDAR_ITEMS.map((entry) => (
          <article key={entry.item} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.day}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{entry.item}</p>
          </article>
        ))}
      </div>
    </DemoFeaturePage>
  );
}

