import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGmbOAuth2Client, getGmbRedirectUri } from '@/lib/gmb';

function getAppOrigin(fallbackOrigin: string) {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? fallbackOrigin).replace(/\/$/, "");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appOrigin = getAppOrigin(url.origin);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const reviewsUrl = new URL('/dashboard/google-reviews', appOrigin);
  const oauthDoneUrl = new URL('/dashboard/google-reviews/oauth-done', appOrigin);

  let communityId: string | null = null;
  let returnTo = 'gmb_popup';
  if (stateRaw) {
    try {
      const payload = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp > Date.now()) {
        communityId = payload.communityId ?? null;
        returnTo = payload.returnTo ?? 'gmb_popup';
      }
    } catch {
      // Invalid state, continue and resolve the community from the profile.
    }
  }

  const returnUrl = returnTo === 'gmb_popup' ? oauthDoneUrl : reviewsUrl;
  const fail = (code: string, detail?: unknown) => {
    if (detail) console.error(`[GMB Callback Error:${code}]`, detail);
    returnUrl.searchParams.set('oauth', code);
    return returnUrl;
  };

  if (errorParam === 'access_denied') {
    returnUrl.searchParams.set('oauth', 'gmb_cancelled');
    return NextResponse.redirect(returnUrl);
  }
  if (!code) {
    returnUrl.searchParams.set('oauth', 'gmb_missing_code');
    return NextResponse.redirect(returnUrl);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', appOrigin));

  const admin = createAdminClient();

  if (!communityId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('communityId')
      .eq('id', user.id)
      .single();
    communityId = profile?.communityId ?? null;
  }
  if (!communityId) {
    returnUrl.searchParams.set('oauth', 'gmb_no_community');
    return NextResponse.redirect(returnUrl);
  }

  try {
    const redirectUri = getGmbRedirectUri(url);
    const oauth2Client = createGmbOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token && !tokens.refresh_token) {
      returnUrl.searchParams.set('oauth', 'gmb_no_token');
      return NextResponse.redirect(returnUrl);
    }

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    // Keep OAuth lightweight: do not call Business Profile APIs in the callback.
    // Low per-minute quotas can otherwise make the connection fail after Google auth succeeds.
    const { error: upsertError } = await admin.from('Channel').upsert(
      {
        id: crypto.randomUUID(),
        communityId,
        type: 'GOOGLE_BUSINESS',
        name: 'Google My Business',
        handle: 'Google Business Profile',
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        pageId: null,
        isConnected: true,
        isActive: true,
        updatedAt: new Date().toISOString(),
        settings: {
          provider: 'google_business',
          locationName: null,
          locationDisplayName: null,
          needsLocationSync: true,
        },
      },
      { onConflict: 'communityId,type' }
    );

    if (upsertError) {
      console.error('[GMB Callback Upsert Error]', upsertError);
      return NextResponse.redirect(fail('gmb_database_error', upsertError));
    }

    returnUrl.searchParams.set('oauth', 'gmb_success');
    return NextResponse.redirect(returnUrl);
  } catch (error) {
    console.error('[GMB Callback Error]', error);
    return NextResponse.redirect(fail('gmb_error', error));
  }
}
