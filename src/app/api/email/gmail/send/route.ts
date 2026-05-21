import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGmailClient } from "@/lib/gmail";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { to, subject, bodyText } = body;

    if (!to || !subject || !bodyText) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    if (!refreshToken) {
      return NextResponse.json({ error: "Gmail non connecté" }, { status: 500 });
    }

    const gmail = getGmailClient(refreshToken);

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      bodyText.replace(/\n/g, "<br />"),
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return NextResponse.json({ success: true, id: res.data.id });
  } catch (error: any) {
    console.error("[Gmail Send Error]", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'envoi" },
      { status: 500 }
    );
  }
}
