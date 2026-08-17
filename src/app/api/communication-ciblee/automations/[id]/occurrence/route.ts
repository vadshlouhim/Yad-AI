import { NextResponse } from "next/server";
import { requireTargetedCommunity } from "@/lib/targeted-communication/auth";
import { sendTargetedOccurrence } from "@/lib/targeted-communication/runner";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const { data: automation } = await context.db.from("TargetedAutomation").select("*").eq("id", id).eq("communityId", context.communityId).maybeSingle();
  if (!automation) return NextResponse.json({ error: "Automatisation introuvable." }, { status: 404 });
  const row = automation as unknown as Record<string, unknown>;
  const scheduledFor = body.occurrenceId
    ? null
    : typeof row.nextRunAt === "string" ? row.nextRunAt : row.nextRunAt instanceof Date ? row.nextRunAt.toISOString() : null;

  let occurrence: Record<string, unknown> | null = null;
  if (body.occurrenceId) {
    const { data } = await context.db.from("TargetedOccurrence").select("*").eq("id", String(body.occurrenceId)).eq("automationId", id).maybeSingle();
    occurrence = data as unknown as Record<string, unknown> | null;
  } else if (scheduledFor) {
    const { data } = await context.db.from("TargetedOccurrence").upsert({
      id: crypto.randomUUID(),
      automationId: id,
      scheduledFor,
      status: "PENDING",
      updatedAt: new Date().toISOString(),
    }, { onConflict: "automationId,scheduledFor", ignoreDuplicates: true }).select().maybeSingle();
    if (data) occurrence = data as unknown as Record<string, unknown>;
    if (!occurrence) {
      const { data: existing } = await context.db.from("TargetedOccurrence").select("*").eq("automationId", id).eq("scheduledFor", scheduledFor).maybeSingle();
      occurrence = existing as unknown as Record<string, unknown> | null;
    }
  }
  if (!occurrence) return NextResponse.json({ error: "Occurrence introuvable." }, { status: 404 });

  if (action === "cancel") {
    const { error } = await context.db.from("TargetedOccurrence").update({ status: "CANCELED", processedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).eq("id", String(occurrence.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "CANCELED" });
  }
  if (action === "edit") {
    const messageOverride = String(body.messageOverride ?? "").trim();
    const eventTimeOverride = String(body.eventTimeOverride ?? "").trim();
    const { error } = await context.db.from("TargetedOccurrence").update({
      messageOverride: messageOverride || null,
      eventTimeOverride: /^([01]\d|2[0-3]):[0-5]\d$/.test(eventTimeOverride) ? eventTimeOverride : null,
      updatedAt: new Date().toISOString(),
    }).eq("id", String(occurrence.id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  if (action === "approve") {
    const result = await sendTargetedOccurrence({ automationId: id, occurrenceId: String(occurrence.id), forceApproved: true });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }
  return NextResponse.json({ error: "Action invalide." }, { status: 400 });
}

