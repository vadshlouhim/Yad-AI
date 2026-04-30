import { requireAuth } from "@/lib/auth";
import { EventForm } from "@/components/events/event-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nouvel événement" };

export default async function NewEventPage() {
  await requireAuth();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nouvel événement</h1>
        <p className="text-slate-500 text-sm mt-1">
          Renseignez les détails de votre événement. L&apos;IA préparera ensuite les contenus automatiquement.
        </p>
      </div>
      <EventForm />
    </div>
  );
}
