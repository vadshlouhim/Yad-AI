import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeAutomationActions } from "@/lib/automation/engine";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { id } = await params;
  const { data: automation } = await admin
    .from("Automation")
    .select("*, community:Community(id, name, city, timezone, tone, hashtags)")
    .eq("id", id)
    .eq("communityId", profile.communityId)
    .single();

  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: run } = await admin
    .from("AutomationRun")
    .insert({
      id: crypto.randomUUID(),
      automationId: automation.id,
      status: "RUNNING",
    })
    .select()
    .single();

  if (!run) return NextResponse.json({ error: "Erreur création run" }, { status: 500 });

  executeAutomationActions(
    automation as Parameters<typeof executeAutomationActions>[0],
    run.id
  ).catch(console.error);

  return NextResponse.json({ runId: run.id, message: "Automatisation déclenchée" });
}
