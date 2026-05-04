import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const preset = body.preset ?? "WEEKLY_SHABBAT";

    if (preset !== "WEEKLY_SHABBAT") {
      return NextResponse.json({ error: "Preset non supporté" }, { status: 400 });
    }

    const { data: automation, error } = await admin
      .from("Automation")
      .insert({
        id: crypto.randomUUID(),
        communityId: profile.communityId,
        name: "Horaires de Chabbat — hebdomadaire",
        description: "Génère automatiquement les horaires de Chabbat chaque semaine.",
        trigger: "WEEKLY_SHABBAT",
        triggerConfig: { daysBefore: 1, time: "10:00" },
        actions: [
          { type: "GENERATE_CONTENT", contentType: "SHABBAT_TIMES", channels: ["INSTAGRAM", "FACEBOOK", "WHATSAPP"] },
          { type: "CREATE_PUBLICATION", requiresValidation: true },
        ],
        isActive: true,
        status: "ACTIVE",
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !automation) {
      console.error("[Automations POST]", error);
      return NextResponse.json({ error: "Création échouée" }, { status: 500 });
    }

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    console.error("[Automations POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
