import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { editPosterFromRequest } from "@/lib/templates/render";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

    const body = await request.json();
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const userRequest = typeof body.userRequest === "string" ? body.userRequest.trim() : "";

    if (!templateId) return NextResponse.json({ error: "Affiche non spécifiée." }, { status: 400 });
    if (!userRequest) {
      return NextResponse.json({ error: "Décrivez la modification souhaitée pour l'affiche." }, { status: 400 });
    }

    const [{ data: template }, { data: community }] = await Promise.all([
      admin
        .from("Template")
        .select("*")
        .eq("id", templateId)
        .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
        .single(),
      admin.from("Community").select("name, city").eq("id", profile.communityId).single(),
    ]);

    if (!template) return NextResponse.json({ error: "Affiche introuvable." }, { status: 404 });

    const result = await editPosterFromRequest({
      admin,
      template,
      communityId: profile.communityId,
      userRequest,
      community,
    });

    return NextResponse.json({ imageUrl: result.imageUrl });
  } catch (error) {
    console.error("[Templates Generate Image]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de génération de l'affiche." },
      { status: 500 }
    );
  }
}
