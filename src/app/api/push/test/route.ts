import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/notifications/push";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const admin = createAdminClient();
  const result = await sendPushToUser(admin, user.id, {
    title: "Push appareil active",
    body: "Les notifications navigateur EasyCom IA fonctionnent sur cet appareil.",
    url: "/dashboard/notifications",
    tag: "push-device-test",
  });

  if (result.sent === 0) {
    return NextResponse.json(
      { error: "Aucune notification push n'a pu etre envoyee a cet appareil.", result },
      { status: 503 },
    );
  }

  return NextResponse.json({ success: true, result });
}
