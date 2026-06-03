import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const { data: community, error: communityError } = await admin
    .from("Community")
    .select("vocabulary")
    .eq("id", profile.communityId)
    .single();

  if (communityError) return NextResponse.json({ error: communityError.message }, { status: 500 });

  const vocabulary = community?.vocabulary && typeof community.vocabulary === "object" && !Array.isArray(community.vocabulary)
    ? community.vocabulary as Record<string, unknown>
    : {};
  const hiddenAutomationPresetIds = Array.isArray(vocabulary.hiddenAutomationPresetIds)
    ? vocabulary.hiddenAutomationPresetIds.map(String)
    : [];
  const nextHiddenIds = Array.from(new Set([...hiddenAutomationPresetIds, id]));

  const { error } = await admin
    .from("Community")
    .update({
      vocabulary: { ...vocabulary, hiddenAutomationPresetIds: nextHiddenIds },
      updatedAt: new Date().toISOString(),
    })
    .eq("id", profile.communityId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, hiddenAutomationPresetIds: nextHiddenIds });
}
