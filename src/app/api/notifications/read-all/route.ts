import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin.from("Notification").update({ isRead: true, readAt: now }).eq("userId", user.id).eq("isRead", false);
  return NextResponse.json({ success: true });
}
