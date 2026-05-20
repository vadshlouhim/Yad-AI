import { CalendarDays, MapPin, Users } from "lucide-react";
import { DemoFeaturePage } from "@/components/demo/demo-feature-page";
import { DEMO_EVENTS } from "@/lib/demo/data";

export default function DemoEventsPage() {
  return (
    <DemoFeaturePage
      title="Agenda et quotidien"
      subtitle="Visualisez et pilotez les événements communautaires avec rappels et contenus associés."
      highlights={[
        "Vue événements à venir",
        "Catégories communautaires",
        "Rappels et publications liés",
      ]}
      primaryCta={{ label: "Créer un événement demo" }}
    >
      <div className="grid gap-3">
        {DEMO_EVENTS.map((eventItem) => (
          <article key={eventItem.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-900">{eventItem.title}</p>
                <p className="mt-1 text-sm text-slate-600">{eventItem.description}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{eventItem.category}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {new Date(eventItem.startDate).toLocaleDateString("fr-FR")}</span>
              {eventItem.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {eventItem.location}</span>}
              {eventItem.audience && <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {eventItem.audience}</span>}
            </div>
          </article>
        ))}
      </div>
    </DemoFeaturePage>
  );
}

