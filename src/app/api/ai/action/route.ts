import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePendingAction } from "@/lib/ai/assistant/pending";
import { executeAction } from "@/lib/ai/assistant/actions";

async function getCommunityId(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", userId)
    .single();
  return { admin, communityId: profile?.communityId as string | undefined };
}

// GET /api/ai/action?id=... → détail d'une action en attente (lien profond depuis email/push).
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Paramètre id manquant" }, { status: 400 });

  const { admin, communityId } = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });

  const { data: action } = await admin
    .from("PendingAction")
    .select("id, kind, summary, status, createdAt")
    .eq("id", id)
    .eq("communityId", communityId)
    .maybeSingle();

  if (!action) return NextResponse.json({ error: "Action introuvable" }, { status: 404 });
  return NextResponse.json({ action });
}

// POST /api/ai/action → { actionId, decision: "confirm" | "reject" }
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { actionId, decision, kind, payload } = (await request.json()) as {
    actionId?: string;
    decision?: "confirm" | "reject";
    kind?: string;
    payload?: Record<string, unknown>;
  };
  if (decision !== "confirm" && decision !== "reject") {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const { admin, communityId } = await getCommunityId(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });

  // 1. Voie BDD : action persistée (notifications, lien profond).
  if (actionId) {
    const result = await resolvePendingAction(admin, { actionId, communityId, userId: user.id, decision });
    // Si trouvée et traitée, on renvoie le résultat. Sinon (table absente / introuvable),
    // on tente la voie directe avec kind+payload embarqués dans la carte.
    if (result.ok || !kind) {
      if (!result.ok) return NextResponse.json(result, { status: 409 });
      return NextResponse.json(result);
    }
  }

  // 2. Voie directe : exécution depuis le payload embarqué (robuste sans la table).
  if (decision === "reject") {
    return NextResponse.json({ ok: true, status: "REJECTED", message: "Action refusée." });
  }
  if (!kind) {
    return NextResponse.json({ error: "Action introuvable" }, { status: 404 });
  }
  const execution = await executeAction({ admin, communityId, userId: user.id }, kind, payload ?? {});
  return NextResponse.json({
    ok: execution.success,
    status: execution.success ? "CONFIRMED" : "FAILED",
    message: execution.message,
    execution,
  });
}
