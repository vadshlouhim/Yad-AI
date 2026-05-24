import { NextResponse } from 'next/server';
import { oauth2Client, GMAIL_SCOPES } from '@/lib/gmail';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // Vérifier que l'utilisateur est connecté
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get('communityId') ?? '';
  // "onboarding" ou "settings" — détermine où rediriger après le callback
  const returnTo = searchParams.get('returnTo') ?? 'settings';

  // Encoder communityId + returnTo dans le state pour le callback
  const state = Buffer.from(JSON.stringify({
    communityId,
    userId: user.id,
    returnTo,
    exp: Date.now() + 10 * 60 * 1000, // 10 min
  })).toString('base64url');

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
    state,
  });

  return NextResponse.redirect(url);
}
