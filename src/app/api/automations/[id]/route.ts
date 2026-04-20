import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getAuthorizedAutomation(automationId: string, userId: string) {
  const profile = await prisma.user.findUnique({ where: { id: userId } });
  if (!profile?.communityId) return null;

  return prisma.automation.findFirst({
    where: { id: automationId, communityId: profile.communityId },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const automation = await getAuthorizedAutomation(id, user.id);
  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json();
  const updated = await prisma.automation.update({
    where: { id },
    data: {
      isActive: body.isActive !== undefined ? body.isActive : undefined,
      name: body.name !== undefined ? body.name : undefined,
      description: body.description !== undefined ? body.description : undefined,
      triggerConfig: body.triggerConfig !== undefined ? body.triggerConfig : undefined,
      actions: body.actions !== undefined ? body.actions : undefined,
      status: body.isActive === false ? "PAUSED" : body.isActive === true ? "ACTIVE" : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const automation = await getAuthorizedAutomation(id, user.id);
  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.automation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
