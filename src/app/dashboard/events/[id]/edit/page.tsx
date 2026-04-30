import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventForm } from "@/components/events/event-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Modifier un événement" };

type PageProps = {
  params: Promise<{ id: string }>;
};

function toInputDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function toInputTime(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function EditEventPage({ params }: PageProps) {
  const { profile } = await requireAuth();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("Event")
    .select("*")
    .eq("id", id)
    .eq("communityId", profile.communityId!)
    .single();

  if (!event) notFound();

  const recurrenceRule = event.recurrenceRule as { freq?: string; byday?: number[] } | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Modifier l&apos;événement</h1>
        <p className="mt-1 text-sm text-slate-500">
          Les changements sont enregistrés dans l&apos;agenda de la communauté.
        </p>
      </div>
      <EventForm
        eventId={event.id}
        defaultValues={{
          title: event.title,
          description: event.description ?? "",
          startDate: toInputDate(event.startDate),
          startTime: toInputTime(event.startDate),
          endDate: toInputDate(event.endDate),
          endTime: toInputTime(event.endDate),
          location: event.location ?? "",
          address: event.address ?? "",
          category: event.category,
          audience: event.audience ?? "",
          status: event.status,
          isRecurring: event.isRecurring,
          recurrenceFreq: recurrenceRule?.freq ?? "WEEKLY",
          recurrenceDays: Array.isArray(recurrenceRule?.byday) ? recurrenceRule.byday : [],
          isPublic: event.isPublic,
          notes: event.notes ?? "",
        }}
      />
    </div>
  );
}
