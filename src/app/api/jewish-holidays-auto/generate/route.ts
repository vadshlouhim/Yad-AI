import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBillingGate, paywallResponse } from "@/lib/billing";
import { JEWISH_HOLIDAYS_AUTOMATION_NAME } from "@/lib/automation/jewish-holidays";
import { editTemplatePosterWithFal } from "@/lib/templates/fal-edit";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };

  const admin = createAdminClient();
  const gate = await getBillingGate(admin, user.id);
  if (!gate.isPaid) {
    return {
      error: paywallResponse("holiday_generation", "La génération d'affiches de fêtes est réservée au mode payant."),
    };
  }

  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return { error: NextResponse.json({ error: "Communauté introuvable" }, { status: 403 }) };

  const { data: community } = await admin.from("Community").select("id, name").eq("id", profile.communityId).single();
  if (!community) return { error: NextResponse.json({ error: "Structure introuvable" }, { status: 404 }) };
  return { admin, communityId: profile.communityId, community, userId: user.id };
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userText = typeof body.userText === "string" ? body.userText.trim() : "";
    if (!userText) return NextResponse.json({ error: "Décrivez votre affiche avant de générer." }, { status: 400 });

    const selectedTemplateId = typeof body.selectedTemplateId === "string" ? body.selectedTemplateId : "";
    if (!selectedTemplateId) {
      return NextResponse.json({ error: "Sélectionnez un template avant de générer l’affiche." }, { status: 400 });
    }
    const { data: template } = await auth.admin
      .from("Template")
      .select("*")
      .eq("id", selectedTemplateId)
      .eq("isActive", true)
      .or(`isGlobal.eq.true,communityId.eq.${auth.communityId}`)
      .maybeSingle();
    if (!template) return NextResponse.json({ error: "Template introuvable." }, { status: 404 });

    const edited = await editTemplatePosterWithFal({
      admin: auth.admin,
      template,
      communityId: auth.communityId,
      userId: auth.userId,
      changes: [{ label: "Textes de l’affiche de fête", currentText: "", newText: userText.slice(0, 500) }],
    });
    const imageUrl = edited.imageUrl;

    const { data: automation } = await auth.admin
      .from("Automation")
      .select("id, triggerConfig")
      .eq("communityId", auth.communityId)
      .eq("trigger", "JEWISH_HOLIDAY")
      .eq("name", JEWISH_HOLIDAYS_AUTOMATION_NAME)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (automation && isRecord(automation.triggerConfig)) {
      const holidayPoster = isRecord(automation.triggerConfig.holidayPoster) ? automation.triggerConfig.holidayPoster : {};
      await auth.admin
        .from("Automation")
        .update({
          triggerConfig: {
            ...automation.triggerConfig,
            holidayPoster: {
              ...holidayPoster,
              generatedImageUrl: imageUrl,
              generatedAt: new Date().toISOString(),
              generationSourceTemplateUrl: template.originalUrl ?? template.previewUrl,
            },
          },
          updatedAt: new Date().toISOString(),
        })
        .eq("id", automation.id);
    }

    return NextResponse.json({
      imageUrl,
      promptUsed: "Le template sélectionné a été modifié par fal.ai avec les textes confirmés.",
    });
  } catch (error) {
    console.error("[Jewish Holidays Auto Generate]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation impossible" }, { status: 500 });
  }
}
