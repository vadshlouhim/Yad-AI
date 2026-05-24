import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGmbOAuth2Client, getGmbRedirectUri } from '@/lib/gmb';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const reviewsUrl = new URL('/dashboard/google-reviews', url.origin);
  const oauthDoneUrl = new URL('/dashboard/google-reviews/oauth-done', url.origin);

  // Décoder le state
  let communityId: string | null = null;
  let returnTo = 'gmb_popup';
  if (stateRaw) {
    try {
      const payload = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp > Date.now()) {
        communityId = payload.communityId ?? null;
        returnTo = payload.returnTo ?? 'gmb_popup';
      }
    } catch { /* state invalide */ }
  }

  const returnUrl = returnTo === 'gmb_popup' ? oauthDoneUrl : reviewsUrl;

  if (errorParam === 'access_denied') {
    returnUrl.searchParams.set('oauth', 'gmb_cancelled');
    return NextResponse.redirect(returnUrl);
  }
  if (!code) {
    returnUrl.searchParams.set('oauth', 'gmb_missing_code');
    return NextResponse.redirect(returnUrl);
  }

  // Vérifier l'auth Supabase
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', url.origin));

  const admin = createAdminClient();

  // Résoudre communityId depuis le profil si absent du state
  if (!communityId) {
    const { data: profile } = await admin.from('profiles').select('communityId').eq('id', user.id).single();
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

    oauth2Client.setCredentials(tokens);

    // 1. Récupérer les comptes GMB
    const accountMgmt = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client });
    const accountsRes = await accountMgmt.accounts.list();
    const accounts = accountsRes.data.accounts ?? [];

    if (accounts.length === 0) {
      returnUrl.searchParams.set('oauth', 'gmb_no_account');
      return NextResponse.redirect(returnUrl);
    }

    // Prendre le premier compte
    const account = accounts[0];
    const accountName = account.name!; // ex: "accounts/123456789"

    // 2. Récupérer les établissements (locations)
    const bizInfo = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client });
    let locationName: string | null = null;
    let locationDisplayName: string | null = null;

    try {
      const locRes = await bizInfo.accounts.locations.list({
        parent: accountName,
        readMask: 'name,title,storefrontAddress',
      });
      const locations = locRes.data.locations ?? [];
      if (locations.length > 0) {
        locationName = locations[0].name ?? null;
        locationDisplayName = locations[0].title ?? null;
      }
    } catch {
      // Certains comptes n'ont pas encore de fiche — on continue
    }

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    // 3. Stocker le token dans Channel (type: GOOGLE_BUSINESS)
    await admin.from('Channel').upsert(
      {
        id: crypto.randomUUID(),
        communityId,
        type: 'GOOGLE_BUSINESS',
        name: 'Google My Business',
        handle: locationDisplayName ?? accountName,
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        pageId: locationName ?? accountName,
        isConnected: true,
        isActive: true,
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          provider: 'google_business',
          accountName,
          locationName: locationName ?? null,
          locationDisplayName: locationDisplayName ?? null,
        },
      },
      { onConflict: 'communityId,type' }
    );

    returnUrl.searchParams.set('oauth', 'gmb_success');
    if (locationDisplayName) returnUrl.searchParams.set('location', locationDisplayName);
    return NextResponse.redirect(returnUrl);
  } catch (error) {
    console.error('[GMB Callback Error]', error);
    returnUrl.searchParams.set('oauth', 'gmb_error');
    return NextResponse.redirect(returnUrl);
  }
}
