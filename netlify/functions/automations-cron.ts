import type { Handler } from "@netlify/functions";
import { runAutomationEngine } from "../../src/lib/automation/engine";
import { processScheduledPublications } from "../../src/lib/publishing/scheduled";

export const handler: Handler = async () => {
  const startedAt = Date.now();

  try {
    await runAutomationEngine();
    const scheduled = await processScheduledPublications();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        scheduled,
        duration: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("[Netlify Cron] Erreur automatisations:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
    };
  }
};
