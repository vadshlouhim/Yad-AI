import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/gmail';

export async function GET() {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!refreshToken) {
    return NextResponse.json({ 
      error: 'GMAIL_REFRESH_TOKEN manquant dans le .env',
      help: 'Allez sur /api/email/gmail/auth pour générer un token'
    }, { status: 400 });
  }

  try {
    const gmail = getGmailClient(refreshToken);
    
    // Test : lister les 5 derniers messages
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5
    });

    return NextResponse.json({ 
      success: true, 
      message: "Connexion Gmail réussie !",
      messagesCount: res.data.messages?.length || 0,
      messages: res.data.messages
    });
  } catch (error: unknown) {
    console.error('Gmail Test Error:', error);
    return NextResponse.json({ 
      error: 'Erreur de connexion Gmail', 
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
}
