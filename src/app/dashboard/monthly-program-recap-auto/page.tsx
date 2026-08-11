import { redirect } from "next/navigation";

export default async function LegacyMonthlyRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const query = new URLSearchParams({ scope: "monthly" });
  if (month) query.set("month", month);
  redirect(`/dashboard/recap-auto?${query.toString()}`);
}

