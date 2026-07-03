import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGmailMessages } from "@/lib/email/gmail-fetch";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  if (!profile?.communityId) {
    return NextResponse.json({ error: "Aucune communaute associee" }, { status: 400 });
  }

  const { data: channel } = await admin
    .from("Channel")
    .select("refreshToken, isConnected")
    .eq("communityId", profile.communityId)
    .eq("type", "EMAIL")
    .maybeSingle();

  if (!channel?.refreshToken || !channel.isConnected) {
    return NextResponse.json({ error: "Gmail non connecte" }, { status: 400 });
  }

  try {
    const messages = await fetchGmailMessages(channel.refreshToken, 15);
    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.error("Gmail List Error:", error);
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
