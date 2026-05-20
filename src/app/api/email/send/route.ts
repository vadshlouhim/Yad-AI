import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    }

    const { data: community } = await admin
      .from("Community")
      .select("name")
      .eq("id", profile.communityId)
      .single();

    const body = await request.json();
    const { to, subject, bodyText } = body;

    if (!to || !subject || !bodyText) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Configuration email manquante (RESEND_API_KEY)" }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const contentHtml = bodyText
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br />")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    const formattedContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${community?.name ?? "Easycom AI"}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0;">${community?.name ?? "Easycom AI"}</h1>
  </div>
  <div style="font-size: 15px; line-height: 1.7; color: #334155;"><p>${contentHtml}</p></div>
  <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
    Envoyé via <strong>Easycom AI</strong> · Communication communautaire assistée par IA
  </div>
</body>
</html>`;

    // Resend configuration with fallback
    const fromEmail = process.env.EMAIL_FROM ?? `onboarding@resend.dev`;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: formattedContent,
    });

    if (error) {
      console.error("[Email API Error]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error: any) {
    console.error("[Email API Catch Error]", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}
