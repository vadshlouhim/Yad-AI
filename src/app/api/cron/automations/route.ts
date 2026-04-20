import { NextResponse } from "next/server";
import { runAutomationEngine } from "@/lib/automation/engine";
import { prisma } from "@/lib/prisma";

// Route cron — appelée par Vercel Cron ou un service externe toutes les 30 minutes
// Sécurisée par header Authorization: Bearer {CRON_SECRET}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    // Vérification du secret cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const startTime = Date.now();
    await runAutomationEngine();

    // Traiter les publications programmées en attente
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

  // Publications programmées dont l'heure est arrivée
  const scheduledPubs = await prisma.publication.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    include: { channel: true },
    take: 50,
  });

  console.log(`[Cron] ${scheduledPubs.length} publications à envoyer`);

  const { publishToChannel } = await import("@/lib/publishing/publisher");

  for (const pub of scheduledPubs) {
    try {
      await publishToChannel(pub);
      await new Promise((r) => setTimeout(r, 300));
    } catch (error) {
      console.error(`[Cron] Erreur publication ${pub.id}:`, error);
    }
  }
}
