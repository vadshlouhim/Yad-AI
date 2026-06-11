import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/push/subscribe → enregistre un abonnement push pour l'utilisateur connecté.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await request.json()) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    userAgent?: string;
  };
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert sur l'endpoint (unique) — réabonnement = mise à jour.
  const { data: existing } = await admin
    .from("PushSubscription")
    .select("id")
    .eq("endpoint", sub.endpoint)
    .maybeSingle();

  if (existing) {
    await admin
      .from("PushSubscription")
      .update({ userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: body.userAgent ?? null })
      .eq("endpoint", sub.endpoint);
  } else {
    await admin.from("PushSubscription").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: body.userAgent ?? null,
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/push/subscribe → désabonne (suppression par endpoint).
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { endpoint } = (await request.json()) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "endpoint manquant" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("PushSubscription").delete().eq("endpoint", endpoint).eq("userId", user.id);
  return NextResponse.json({ success: true });
}
