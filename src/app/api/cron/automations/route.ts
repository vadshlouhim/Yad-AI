import { NextResponse } from "next/server";
import { runAutomationEngine } from "@/lib/automation/engine";
import { runDailyEmailAiClassification } from "@/lib/email/daily-ai";
import { processScheduledPublications } from "@/lib/publishing/scheduled";
import { runTargetedCommunication } from "@/lib/targeted-communication/runner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const startTime = Date.now();
    await runAutomationEngine();
    const targeted = await runTargetedCommunication();
    const scheduled = await processScheduledPublications();
    await runDailyEmailAiClassification();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Traite en ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      scheduled,
      targeted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Erreur:", error);
    return NextResponse.json({ error: "Erreur cron" }, { status: 500 });
  }
}
