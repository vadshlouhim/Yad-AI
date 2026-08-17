import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Vous devez être connecté pour envoyer un message." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const message = cleanText(body && typeof body === "object" ? (body as Record<string, unknown>).message : "", 5000);
  if (message.length < 10) {
    return NextResponse.json({ error: "Votre message doit contenir au moins 10 caractères." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, name, email, communityId")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Votre profil est introuvable." }, { status: 404 });
  }

  let communityName: string | null = null;
  if (profile.communityId) {
    const { data: community } = await admin.from("Community").select("name").eq("id", profile.communityId).maybeSingle();
    communityName = community?.name ?? null;
  }

  const now = new Date().toISOString();
  const pageUrl = cleanText(request.headers.get("referer"), 500);
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? null;
  const userAgent = cleanText(request.headers.get("user-agent"), 1000);
  const { error: insertError } = await admin.from("ContactLead").insert({
    id: `support_${crypto.randomUUID()}`,
    name: profile.name?.trim() || profile.email,
    email: profile.email,
    organization: communityName,
    subject: "Support et suggestions",
    message,
    source: "support_suggestion",
    pageUrl: pageUrl || null,
    ipAddress,
    userAgent: userAgent || null,
    status: "NEW",
    metadata: { userId: profile.id, communityId: profile.communityId, channel: "mobile_tools_menu" },
    createdAt: now,
    updatedAt: now,
  });

  if (insertError) {
    return NextResponse.json({ error: "Impossible d’envoyer votre message pour le moment." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
