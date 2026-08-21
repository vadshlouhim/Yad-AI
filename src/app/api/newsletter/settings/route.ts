import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const body = await request.json().catch(() => ({})) as { donationUrl?: unknown };
    const donationUrl = typeof body.donationUrl === "string" ? body.donationUrl.trim() : "";
    if (donationUrl) {
      try {
        const parsed = new URL(donationUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
      } catch {
        return NextResponse.json({ error: "Le lien de dons doit etre une URL valide." }, { status: 400 });
      }
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communaute introuvable" }, { status: 403 });

    const { data: community } = await admin.from("Community").select("vocabulary").eq("id", profile.communityId).single();
    const vocabulary = community?.vocabulary && typeof community.vocabulary === "object" && !Array.isArray(community.vocabulary)
      ? community.vocabulary as Record<string, unknown>
      : {};
    const { error } = await admin.from("Community").update({ vocabulary: { ...vocabulary, donationUrl: donationUrl || null }, updatedAt: new Date().toISOString() }).eq("id", profile.communityId);
    if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
    return NextResponse.json({ donationUrl: donationUrl || null });
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  }
}
