import { NextResponse } from "next/server";
import { runAutomationEngine } from "@/lib/automation/engine";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database.types";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const startTime = Date.now();
    await runAutomationEngine();
    await processScheduledPublications();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Automatisations traitées en ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Erreur:", error);
    return NextResponse.json({ error: "Erreur cron" }, { status: 500 });
  }
}

async function processScheduledPublications() {
  const now = new Date();
  const admin = createAdminClient();

  const { data: scheduledPubs } = await admin
    .from("Publication")
    .select("*, channel:Channel(*)")
    .eq("status", "SCHEDULED")
    .lte("scheduledAt", now.toISOString())
    .limit(50);

  console.log(`[Cron] ${scheduledPubs?.length ?? 0} publications à envoyer`);

  const { publishToChannel } = await import("@/lib/publishing/publisher");

  for (const pub of scheduledPubs ?? []) {
    try {
      await publishToChannel(pub as Publication & { channel: Channel });
      await new Promise((r) => setTimeout(r, 300));
    } catch (error) {
      console.error(`[Cron] Erreur publication ${pub.id}:`, error);
    }
  }
}
