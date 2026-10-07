import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gregorianToHebrew } from "@/lib/contacts/hebrew-birthday";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { date?: string; afterSunset?: boolean };
  if (!body.date) return NextResponse.json({ error: "Date civile manquante" }, { status: 400 });
  const hebrew = gregorianToHebrew(body.date, Boolean(body.afterSunset));
  if (!hebrew) return NextResponse.json({ error: "Date civile invalide" }, { status: 400 });
  return NextResponse.json(hebrew);
}
