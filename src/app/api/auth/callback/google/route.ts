import { NextResponse } from 'next/server';
import { oauth2Client } from '@/lib/gmail';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Code manquant' }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Le refresh_token est ce que vous devez sauvegarder dans votre .env
    return NextResponse.json({
      message: "Authentification réussie !",
      tokens: {
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expiry_date: tokens.expiry_date
      },
      instructions: "Copiez le refresh_token dans votre fichier .env sous GMAIL_REFRESH_TOKEN"
    });
  } catch (error) {
    console.error('Gmail Auth Error:', error);
    return NextResponse.json({ error: 'Échec de la récupération des tokens' }, { status: 500 });
  }
}
