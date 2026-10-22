import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai/engine";
import { appendSocialMessageGuidelines } from "@/lib/ai/social-message-guidelines";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const VISUAL_REQUEST_PATTERN =
  /\b(affiche|flyer|poster|visuel|visuelle|carousel|carrousel|design|mockup|image instagram|story)\b/i;

function buildInstagramTitle(caption: string, locale: "fr" | "he") {
  const firstLine = caption
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? firstLine.slice(0, 120) : locale === "he" ? "פרסום באינסטגרם" : "Publication Instagram";
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
    const locale: "fr" | "he" = body.locale === "he" ? "he" : "fr";

    if (!userPrompt) {
      return NextResponse.json({ error: "Le prompt Instagram est requis." }, { status: 400 });
    }

    if (VISUAL_REQUEST_PATTERN.test(userPrompt)) {
      return NextResponse.json({
        redirectToPosters: true,
        redirectMessage: "Cette demande concerne un visuel. Passez par la page Affiches pour creer le design.",
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
      channelType: "INSTAGRAM",
      customInstructions: locale === "he"
        ? `${appendSocialMessageGuidelines(userPrompt)}\n\nכתוב את הפוסט ישירות בעברית מודרנית, טבעית, חמה וקהילתית. אין לתרגם מצרפתית באופן מילולי. שמור על מגבלות האורך של הרשת החברתית והוסף האשטגים בעברית רק אם הם מועילים.`
        : `${appendSocialMessageGuidelines(userPrompt)}\n\nImportant: reponds uniquement en francais et n'ajoute pas d'hebreu.`,
    });

    const caption = generated.body?.trim() ?? "";

    return NextResponse.json({
      title: buildInstagramTitle(caption, locale),
      body: caption,
      hashtags: generated.hashtags ?? [],
    });
  } catch (error) {
    console.error("[Instagram Generate]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
