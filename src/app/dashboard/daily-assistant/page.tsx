import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { DailyAssistantClient } from "@/components/daily-assistant/daily-assistant-client";

export const metadata: Metadata = { title: "Assistant du quotidien - Yad.ia" };

export default async function DailyAssistantPage() {
  await requireAuth();
  return <DailyAssistantClient />;
}
