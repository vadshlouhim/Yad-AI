import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailAiState, withEmailAiState } from "@/lib/email/ai-settings";
import { buildNotificationRuleFromPrompt } from "@/lib/email/notification-rules";
import { assertTierFeature } from "@/lib/billing";

async function getContext(id: string) {
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

  const state = getEmailAiState(channel.settings);
  const rule = state.rules.find((item) => item.id === id && item.userId === user.id);
  if (!rule) {
    return { error: NextResponse.json({ error: "Regle introuvable" }, { status: 404 }) };
  }

  return { user, admin, channel, state, rule };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const current = await getContext(id);
  if ("error" in current) return current.error;

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    status?: "ACTIVE" | "DISABLED";
  };

  let nextRule = current.rule;
  if (body.prompt?.trim()) {
    nextRule = {
      ...buildNotificationRuleFromPrompt(current.user.id, body.prompt),
      id: current.rule.id,
      createdAt: current.rule.createdAt,
      status: body.status ?? current.rule.status,
      updatedAt: new Date().toISOString(),
    };
  } else if (body.status) {
    nextRule = {
      ...current.rule,
      status: body.status,
      updatedAt: new Date().toISOString(),
    };
  }

  const nextState = {
    ...current.state,
    rules: current.state.rules.map((rule) => (rule.id === id ? nextRule : rule)),
  };

  const { error } = await current.admin
    .from("Channel")
    .update({
      settings: withEmailAiState(current.channel.settings, nextState),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", current.channel.id);

  if (error) {
    return NextResponse.json({ error: "Impossible de modifier la regle." }, { status: 500 });
  }

  return NextResponse.json({ rule: nextRule });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const current = await getContext(id);
  if ("error" in current) return current.error;

  const nextState = {
    ...current.state,
    rules: current.state.rules.filter((rule) => rule.id !== id),
  };

  const { error } = await current.admin
    .from("Channel")
    .update({
      settings: withEmailAiState(current.channel.settings, nextState),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", current.channel.id);

  if (error) {
    return NextResponse.json({ error: "Impossible de supprimer la regle." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
