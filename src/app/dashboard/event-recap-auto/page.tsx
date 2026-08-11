import { redirect } from "next/navigation";

export default async function LegacyEventRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;
  const query = new URLSearchParams({ scope: "event" });
  if (eventId) query.set("eventId", eventId);
  redirect(`/dashboard/recap-auto?${query.toString()}`);
}

