import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailAiState, withEmailAiState } from "@/lib/email/ai-settings";
import { buildNotificationRuleFromPrompt } from "@/lib/email/notification-rules";
import { assertTierFeature } from "@/lib/billing";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorise" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();
  if (!profile?.communityId) {
    return { error: NextResponse.json({ error: "Communaute introuvable" }, { status: 400 }) };
  }

  const tierCheck = await assertTierFeature(
    admin,
    user.id,
    "BUSINESS",
    "email_management",
    "La gestion des emails est réservée à l'offre Business."
  );
  if (!tierCheck.ok) return { error: tierCheck.response };

  const { data: channel } = await admin
    .from("Channel")
    .select("id, settings")
    .eq("communityId", profile.communityId)
    .eq("type", "EMAIL")
    .maybeSingle();

  if (!channel?.id) {
    return { error: NextResponse.json({ error: "Canal email introuvable" }, { status: 400 }) };
  }

  return { user, admin, channel };
}

export async function GET() {
  const context = await getContext();
  if ("error" in context) return context.error;

  const state = getEmailAiState(context.channel.settings);
  return NextResponse.json({ rules: state.rules.filter((rule) => rule.userId === context.user.id) });
}

export async function POST(request: Request) {
  const context = await getContext();
  if ("error" in context) return context.error;

  const body = (await request.json().catch(() => ({}))) as { prompt?: string };
  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt de regle manquant." }, { status: 400 });
  }

  const state = getEmailAiState(context.channel.settings);
  const created = buildNotificationRuleFromPrompt(context.user.id, body.prompt);
  const nextState = { ...state, rules: [created, ...state.rules] };

  const { error } = await context.admin
    .from("Channel")
    .update({
      settings: withEmailAiState(context.channel.settings, nextState),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", context.channel.id);

  if (error) {
    return NextResponse.json({ error: "Impossible d'enregistrer la regle." }, { status: 500 });
  }

  return NextResponse.json({ rule: created }, { status: 201 });
}
