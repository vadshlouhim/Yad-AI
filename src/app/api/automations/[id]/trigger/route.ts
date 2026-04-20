import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { executeAutomationActions } from "@/lib/automation/engine";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { id } = await params;
  const automation = await prisma.automation.findFirst({
    where: { id, communityId: profile.communityId },
    include: {
      community: { include: { channels: true, aiMemory: true } },
    },
  });

  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const run = await prisma.automationRun.create({
    data: {
      automationId: automation.id,
      status: "RUNNING",
    },
  });

  executeAutomationActions(
    automation as Parameters<typeof executeAutomationActions>[0],
    run.id
  ).catch(console.error);

  return NextResponse.json({ runId: run.id, message: "Automatisation déclenchée" });
}
