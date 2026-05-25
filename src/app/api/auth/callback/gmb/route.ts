import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGmbOAuth2Client, getGmbRedirectUri } from '@/lib/gmb';

type GmbLocationCandidate = {
  accountName: string;
  locationName: string;
  locationDisplayName: string | null;
  searchableText: string;
};

function normalizeForMatch(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreLocation(candidate: GmbLocationCandidate, community: { name?: string | null; city?: string | null } | null) {
  const haystack = normalizeForMatch(candidate.searchableText);
  const communityName = normalizeForMatch(community?.name);
  const communityCity = normalizeForMatch(community?.city);
  let score = 0;

  if (communityName && haystack.includes(communityName)) score += 10;
  if (communityCity && haystack.includes(communityCity)) score += 5;

  for (const word of communityName.split(" ").filter((item) => item.length > 2)) {
    if (haystack.includes(word)) score += 1;
  }

  return score;
}

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
    const { data: community } = await admin
      .from('Community')
      .select('name, city')
      .eq('id', communityId)
      .single();

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
    const accountsRes = await accountMgmt.accounts.list().catch((error) => {
      throw new Error(`gmb_accounts_api_failed:${error instanceof Error ? error.message : 'unknown'}`);
    });
    const accounts = accountsRes.data.accounts ?? [];

    if (accounts.length === 0) {
      returnUrl.searchParams.set('oauth', 'gmb_no_account');
      return NextResponse.redirect(returnUrl);
    }

    // 2. Récupérer les établissements (locations) du compte Google connecté.
    // On ne force jamais une fiche du projet : on choisit parmi les fiches
    // accessibles par l'utilisateur, en privilégiant celle qui correspond à sa communauté.
    const bizInfo = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client });
    const candidates: GmbLocationCandidate[] = [];

    for (const account of accounts) {
      const accountName = account.name;
      if (!accountName) continue;

      try {
        const locRes = await bizInfo.accounts.locations.list({
          parent: accountName,
          readMask: 'name,title,storefrontAddress',
        });
        const locations = locRes.data.locations ?? [];
        for (const location of locations) {
          const address = location.storefrontAddress;
          candidates.push({
            accountName,
            locationName: location.name ?? "",
            locationDisplayName: location.title ?? null,
            searchableText: [
              account.accountName,
              accountName,
              location.name,
              location.title,
              address?.locality,
              address?.administrativeArea,
              address?.postalCode,
              address?.addressLines?.join(" "),
            ].filter(Boolean).join(" "),
          });
        }
      } catch (error) {
        console.warn(`[GMB Callback] Impossible de lire les fiches de ${accountName}`, error);
      }
    }

    const selectedLocation = candidates
      .filter((candidate) => candidate.locationName)
      .sort((left, right) => scoreLocation(right, community) - scoreLocation(left, community))[0] ?? null;
    const accountName = selectedLocation?.accountName ?? accounts[0].name!;
    const locationName = selectedLocation?.locationName ?? null;
    const locationDisplayName = selectedLocation?.locationDisplayName ?? null;
    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

    // 3. Stocker le token dans Channel (type: GOOGLE_BUSINESS)
    const { error: upsertError } = await admin.from('Channel').upsert(
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
          availableLocations: candidates.map((candidate) => ({
            accountName: candidate.accountName,
            locationName: candidate.locationName,
            locationDisplayName: candidate.locationDisplayName,
            score: scoreLocation(candidate, community),
          })),
        },
      },
      { onConflict: 'communityId,type' }
    );
    if (upsertError) {
      console.error('[GMB Callback Upsert Error]', upsertError);
      return NextResponse.redirect(fail('gmb_database_error', upsertError));
    }

    returnUrl.searchParams.set('oauth', 'gmb_success');
    if (locationDisplayName) returnUrl.searchParams.set('location', locationDisplayName);
    return NextResponse.redirect(returnUrl);
  } catch (error) {
    console.error('[GMB Callback Error]', error);
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('gmb_accounts_api_failed:')) {
      return NextResponse.redirect(fail('gmb_accounts_error', error));
    }
    return NextResponse.redirect(fail('gmb_error', error));
  }
}
