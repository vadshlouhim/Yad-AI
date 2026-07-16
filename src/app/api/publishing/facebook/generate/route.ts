import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/engine";
import { appendSocialMessageGuidelines } from "@/lib/ai/social-message-guidelines";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VISUAL_REQUEST_PATTERN =
  /\b(affiche|flyer|poster|visuel|visuelle|carousel|carrousel|design|image facebook|creation graphique)\b/i;

function buildFacebookTitle(caption: string) {
  const firstLine = caption
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? firstLine.slice(0, 120) : "Publication Facebook";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const body = await request.json();
    const userPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!userPrompt) {
      return NextResponse.json({ error: "Le prompt Facebook est requis." }, { status: 400 });
    }

    if (VISUAL_REQUEST_PATTERN.test(userPrompt)) {
      return NextResponse.json({
        redirectToPosters: true,
        redirectMessage:
          "Pour creer une affiche, je vous redirige vers la page Affiches. Vous pourrez ensuite l'ajouter a votre publication Facebook.",
      });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communaute introuvable" }, { status: 403 });
    }

    const generated = await generateContent({
      communityId: profile.communityId,
      contentType: "GENERAL",
      channelType: "FACEBOOK",
      customInstructions: `${appendSocialMessageGuidelines(userPrompt)}\n\nImportant: reponds uniquement dans la langue de la demande utilisateur. Si la demande est en francais, n'ajoute pas d'hebreu.`,
    });

    const caption = generated.body?.trim() ?? "";

    return NextResponse.json({
      title: buildFacebookTitle(caption),
      body: caption,
      hashtags: generated.hashtags ?? [],
    });
  } catch (error) {
    console.error("[Facebook Generate]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
