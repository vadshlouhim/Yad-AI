import { requireAuth } from "@/lib/auth";
import { EventForm } from "@/components/events/event-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nouvel evenement" };

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ recurring?: string }>;
}) {
  await requireAuth();
  const params = await searchParams;
  const forceRecurring = params.recurring === "1";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nouvel evenement</h1>
        <p className="text-slate-500 text-sm mt-1">
          Renseignez les details de votre evenement. L&apos;IA preparera ensuite les contenus automatiquement.
        </p>
      </div>
      <EventForm defaultValues={forceRecurring ? { isRecurring: true } : undefined} />
    </div>
  );
}
