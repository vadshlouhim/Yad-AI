import { NextResponse } from "next/server";
import { requireTargetedCommunity } from "@/lib/targeted-communication/auth";
import { computeNextTargetedRun, TARGETED_VARIABLES } from "@/lib/targeted-communication/core";

function parseAutomation(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const categoryId = String(body.categoryId ?? "");
  const weekday = Number(body.weekday);
  const sendTime = String(body.sendTime ?? "");
  const message = String(body.message ?? "").trim();
  const mode = body.mode === "CONFIRM" ? "CONFIRM" : "AUTO";
  const schoolZone = ["A", "B", "C"].includes(String(body.schoolZone)) ? String(body.schoolZone) : "C";
  if (name.length < 2 || name.length > 100 || !categoryId || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(sendTime) || message.length < 2 || message.length > 3000) return null;
  const unknownVariable = Array.from(message.matchAll(/\{[^}]+\}/g)).map((match) => match[0]).find((variable) => !TARGETED_VARIABLES.includes(variable as typeof TARGETED_VARIABLES[number]));
  if (unknownVariable) return null;
  return {
    name,
    categoryId,
    weekday,
    sendTime,
    eventTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.eventTime ?? "")) ? String(body.eventTime) : null,
    eventName: String(body.eventName ?? "").trim().slice(0, 150) || null,
    address: String(body.address ?? "").trim().slice(0, 300) || null,
    link: String(body.link ?? "").trim().slice(0, 1000) || null,
    message,
    mode,
    skipYomTov: body.skipYomTov !== false,
    skipHolHamoed: body.skipHolHamoed !== false,
    skipSchoolHolidays: body.skipSchoolHolidays !== false,
    schoolZone,
    isActive: body.isActive !== false,
  };
}

export async function POST(request: Request) {
  const context = await requireTargetedCommunity();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = parseAutomation(body);
  if (!input) return NextResponse.json({ error: "Vérifiez les champs et les variables du message." }, { status: 400 });
  const [{ data: category }, { data: community }] = await Promise.all([
    context.db.from("TargetedCategory").select("id,isActive").eq("id", input.categoryId).eq("communityId", context.communityId).maybeSingle(),
    context.db.from("Community").select("timezone").eq("id", context.communityId).single(),
  ]);
  if (!category) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 400 });
  const timezone = String((community as { timezone?: string } | null)?.timezone ?? "Europe/Paris");
  const nextRunAt = input.isActive ? computeNextTargetedRun({ weekday: input.weekday, sendTime: input.sendTime, timezone }).toISOString() : null;
  const { data, error } = await context.db.from("TargetedAutomation").insert({
    id: crypto.randomUUID(),
    communityId: context.communityId,
    ...input,
    nextRunAt,
    updatedAt: new Date().toISOString(),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

