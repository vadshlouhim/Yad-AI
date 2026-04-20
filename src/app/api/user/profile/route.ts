import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name !== undefined ? body.name : undefined,
      avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : undefined,
    },
  });

  return NextResponse.json(updated);
}
