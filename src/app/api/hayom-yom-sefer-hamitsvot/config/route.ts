import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getHayomYomAccess,
  getHayomYomSettings,
  HAYOM_YOM_AUTOMATION_NAME,
  HAYOM_YOM_TIME,
  nextHayomYomRunAt,
  normalizeHayomYomDays,
  type HayomYomSettings,
} from "@/lib/automation/hayom-yom";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles")
      .select("communityId, email, role")
      .eq("id", user.id)
      .single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

    const access = await getHayomYomAccess({ admin, communityId: profile.communityId, profile });
    if (!access.allowed) {
      return NextResponse.json({ error: "Cette automatisation est réservée à l’offre Pro à 29,99 € et à l’offre Business." }, { status: 402 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const mode = body.mode === "pause" ? "pause" : "activate";
    const [{ data: community }, { data: rows }] = await Promise.all([
      admin.from("Community").select("timezone").eq("id", profile.communityId).single(),
      admin.from("Automation").select("*")
        .eq("communityId", profile.communityId)
        .eq("name", HAYOM_YOM_AUTOMATION_NAME)
        .order("updatedAt", { ascending: false })
        .limit(1),
    ]);
    const existing = rows?.[0] ?? null;
    const current = getHayomYomSettings(existing?.triggerConfig);
    const days = mode === "pause" ? current?.days ?? [] : normalizeHayomYomDays(body.days);
    if (days.length === 0) return NextResponse.json({ error: "Sélectionnez au moins un jour." }, { status: 400 });

    if (mode === "activate") {
      const { data: facebook } = await admin.from("Channel")
        .select("id")
        .eq("communityId", profile.communityId)
        .eq("type", "FACEBOOK")
        .eq("isConnected", true)
        .eq("isActive", true)
        .maybeSingle();
      if (!facebook) {
        return NextResponse.json({ error: "Connectez une page Facebook avant d’activer cette automatisation." }, { status: 400 });
      }
    }

    const settings: HayomYomSettings = {
      status: mode === "pause" ? "paused" : "active",
      days,
      time: HAYOM_YOM_TIME,
      timezone: community?.timezone || "Europe/Paris",
      channel: "FACEBOOK",
    };
    const baseConfig = isRecord(existing?.triggerConfig) ? existing.triggerConfig : {};
    const triggerConfig = { ...baseConfig, hayomYomSettings: settings } as Json;
    const nextRunAt = mode === "pause" ? null : nextHayomYomRunAt(settings)?.toISOString() ?? null;
    const payload = {
      name: HAYOM_YOM_AUTOMATION_NAME,
      description: "Publie automatiquement les textes intégraux du Hayom Yom et du Sefer Hamitsvot sur Facebook.",
      trigger: "CUSTOM_SCHEDULE" as const,
      triggerConfig,
      actions: [] as Json,
      isActive: mode !== "pause",
      status: mode === "pause" ? "PAUSED" as const : "ACTIVE" as const,
      nextRunAt,
      updatedAt: new Date().toISOString(),
    };

    const query = existing
      ? admin.from("Automation").update(payload).eq("id", existing.id).eq("communityId", profile.communityId)
      : admin.from("Automation").insert({ id: crypto.randomUUID(), communityId: profile.communityId, eventId: null, ...payload });
    const { data: automation, error } = await query.select().single();
    if (error) throw error;
    return NextResponse.json(automation);
  } catch (error) {
    console.error("[Hayom Yom Config]", error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}
