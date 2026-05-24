import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGmbOAuth2Client, GMB_SCOPES, getGmbRedirectUri } from '@/lib/gmb';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', request.url));

  const requestUrl = new URL(request.url);
  const communityId = requestUrl.searchParams.get('communityId') ?? '';
  const returnTo = requestUrl.searchParams.get('returnTo') ?? 'gmb_popup';

  const redirectUri = getGmbRedirectUri(requestUrl);
  const oauth2Client = createGmbOAuth2Client(redirectUri);

  // Encoder communityId + returnTo dans le state
  const state = Buffer.from(JSON.stringify({
    communityId,
    userId: user.id,
    returnTo,
    exp: Date.now() + 10 * 60 * 1000,
  })).toString('base64url');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMB_SCOPES,
    prompt: 'consent',
    state,
  });

  return NextResponse.redirect(authUrl);
}
