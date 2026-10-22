import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/engine";
import { appendSocialMessageGuidelines } from "@/lib/ai/social-message-guidelines";

const schema = z.object({
  prompt: z.string().trim().min(2).max(4_000),
  tone: z.enum(["warm", "festive", "simple"]),
  locale: z.enum(["fr", "he", "en"]),
});

const toneInstructions = {
  fr: { warm: "chaleureux et accueillant", festive: "festif et enthousiaste", simple: "sobre, clair et factuel" },
  he: { warm: "חם, טבעי ומזמין", festive: "חגיגי, שמח ונלהב", simple: "ענייני, ברור ותמציתי" },
  en: { warm: "warm and welcoming", festive: "festive and enthusiastic", simple: "simple, clear and factual" },
} as const;

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "COMMUNITY_NOT_FOUND" }, { status: 403 });

    const { prompt, tone, locale } = parsed.data;
    const naturalLanguage = locale === "he"
      ? "כתוב ישירות בעברית ישראלית טבעית. אין לתרגם מצרפתית או מאנגלית באופן מילולי."
      : locale === "fr"
        ? "Rédige directement en français naturel."
        : "Write directly in natural English.";
    const shared = `${appendSocialMessageGuidelines(prompt)}\nTon: ${toneInstructions[locale][tone]}.\n${naturalLanguage}`;

    const [facebook, instagram] = await Promise.all([
      generateContent({
        communityId: profile.communityId,
        contentType: "GENERAL",
        channelType: "FACEBOOK",
        outputLocale: locale,
        customInstructions: `${shared}\nFacebook: texte chaleureux et développé, avec toutes les informations pratiques.`,
      }),
      generateContent({
        communityId: profile.communityId,
        contentType: "GENERAL",
        channelType: "INSTAGRAM",
        outputLocale: locale,
        customInstructions: `${shared}\nInstagram: texte court, rythmé, avec des emojis et quelques hashtags pertinents.`,
      }),
    ]);

    return NextResponse.json({
      versions: {
        FACEBOOK: facebook.body.trim(),
        INSTAGRAM: [instagram.body.trim(), ...(instagram.hashtags ?? [])].filter(Boolean).join("\n\n"),
      },
    });
  } catch (error) {
    console.error("[Social Generate]", error);
    return NextResponse.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }
}
