import { NextResponse } from 'next/server';
import { createGmailOAuth2Client, GMAIL_SCOPES, getGmailOAuthEnvError, getGmailRedirectUri } from '@/lib/gmail';
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
  const returnUrl =
    returnTo === 'onboarding'
      ? new URL('/onboarding', request.url)
      : returnTo === 'email_popup'
      ? new URL('/dashboard/email/oauth-done', request.url)
      : new URL('/dashboard/settings/channels', request.url);

  const envError = getGmailOAuthEnvError();
  if (envError) {
    returnUrl.searchParams.set('oauth', envError);
    return NextResponse.redirect(returnUrl);
  }

  // Encoder communityId + returnTo dans le state pour le callback
  const state = Buffer.from(JSON.stringify({
    communityId,
    userId: user.id,
    returnTo,
    exp: Date.now() + 10 * 60 * 1000, // 10 min
  })).toString('base64url');

  const requestUrl = new URL(request.url);
  const redirectUri = getGmailRedirectUri(requestUrl);
  const oauth2Client = createGmailOAuth2Client(redirectUri);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent',
    state,
  });

  return NextResponse.redirect(url);
}
