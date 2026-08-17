import { NextResponse } from "next/server";
import { requireTargetedCommunity } from "@/lib/targeted-communication/auth";
import { computeNextTargetedRun, TARGETED_VARIABLES } from "@/lib/targeted-communication/core";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { data: current } = await context.db.from("TargetedAutomation").select("*").eq("id", id).eq("communityId", context.communityId).maybeSingle();
  if (!current) return NextResponse.json({ error: "Automatisation introuvable." }, { status: 404 });
  const row = current as unknown as Record<string, unknown>;

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) update.name = String(body.name).trim().slice(0, 100);
  if (body.categoryId !== undefined) {
    const categoryId = String(body.categoryId);
    const { data: category } = await context.db.from("TargetedCategory").select("id").eq("id", categoryId).eq("communityId", context.communityId).maybeSingle();
    if (!category) return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
    update.categoryId = categoryId;
  }
  if (body.weekday !== undefined) {
    const weekday = Number(body.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return NextResponse.json({ error: "Jour invalide." }, { status: 400 });
    update.weekday = weekday;
  }
  if (body.sendTime !== undefined) {
    const sendTime = String(body.sendTime);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime)) return NextResponse.json({ error: "Heure invalide." }, { status: 400 });
    update.sendTime = sendTime;
  }
  if (body.message !== undefined) {
    const message = String(body.message).trim();
    const unknownVariable = Array.from(message.matchAll(/\{[^}]+\}/g)).map((match) => match[0]).find((variable) => !TARGETED_VARIABLES.includes(variable as typeof TARGETED_VARIABLES[number]));
    if (message.length < 2 || message.length > 3000 || unknownVariable) return NextResponse.json({ error: "Message ou variable invalide." }, { status: 400 });
    update.message = message;
  }
  for (const field of ["eventName", "address", "link"] as const) if (body[field] !== undefined) update[field] = String(body[field]).trim() || null;
  if (body.eventTime !== undefined) update.eventTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.eventTime)) ? String(body.eventTime) : null;
  if (body.mode !== undefined) update.mode = body.mode === "CONFIRM" ? "CONFIRM" : "AUTO";
  for (const field of ["skipYomTov", "skipHolHamoed", "skipSchoolHolidays", "isActive"] as const) if (body[field] !== undefined) update[field] = Boolean(body[field]);
  if (body.schoolZone !== undefined && ["A", "B", "C"].includes(String(body.schoolZone))) update.schoolZone = String(body.schoolZone);

  const scheduleChanged = body.weekday !== undefined || body.sendTime !== undefined || body.isActive !== undefined;
  if (scheduleChanged) {
    const { data: community } = await context.db.from("Community").select("timezone").eq("id", context.communityId).single();
    const isActive = update.isActive === undefined ? Boolean(row.isActive) : Boolean(update.isActive);
    update.nextRunAt = isActive ? computeNextTargetedRun({
      weekday: Number(update.weekday ?? row.weekday),
      sendTime: String(update.sendTime ?? row.sendTime),
      timezone: String((community as { timezone?: string } | null)?.timezone ?? "Europe/Paris"),
    }).toISOString() : null;
  }
  const { data, error } = await context.db.from("TargetedAutomation").update(update).eq("id", id).eq("communityId", context.communityId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Context) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const { error } = await context.db.from("TargetedAutomation").delete().eq("id", id).eq("communityId", context.communityId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

