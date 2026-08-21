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
  normalizeHayomYomChannels,
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
      return NextResponse.json({ error: "Cette automatisation est disponible avec l’abonnement EasyCom IA." }, { status: 402 });
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
    const channels = mode === "pause" ? current?.channels ?? ["FACEBOOK"] : normalizeHayomYomChannels(body.channels);
    if (channels.length === 0) return NextResponse.json({ error: "SÃ©lectionnez au moins un rÃ©seau." }, { status: 400 });
    if (days.length === 0) return NextResponse.json({ error: "Sélectionnez au moins un jour." }, { status: 400 });

    if (mode === "activate") {
      const { data: connectedChannels } = await admin.from("Channel")
        .select("id")
        .eq("communityId", profile.communityId)
        .in("type", channels)
        .eq("isConnected", true)
        .eq("isActive", true);
      if (!connectedChannels?.length) {
        return NextResponse.json({ error: "Connectez au moins un réseau sélectionné avant d’activer cette automatisation." }, { status: 400 });
      }
    }

    const settings: HayomYomSettings = {
      status: mode === "pause" ? "paused" : "active",
      days,
      time: HAYOM_YOM_TIME,
      timezone: community?.timezone || "Europe/Paris",
      channels,
    };
    const baseConfig = isRecord(existing?.triggerConfig) ? existing.triggerConfig : {};
    const triggerConfig = { ...baseConfig, hayomYomSettings: settings } as Json;
    const nextRunAt = mode === "pause" ? null : nextHayomYomRunAt(settings)?.toISOString() ?? null;
    const payload = {
      name: HAYOM_YOM_AUTOMATION_NAME,
      description: "Publie automatiquement le Hayom Yom et le Sefer Hamitsvot avec un visuel, sur les réseaux sélectionnés.",
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
