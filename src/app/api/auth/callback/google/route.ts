import { NextResponse } from 'next/server';
import { createGmailOAuth2Client, getGmailRedirectUri } from '@/lib/gmail';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function getAppOrigin(fallbackOrigin: string) {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? fallbackOrigin).replace(/\/$/, "");
}

function classifyGmailOAuthError(error: unknown): string {
  const maybeError = error as {
    code?: number;
    response?: { data?: { error?: string; error_description?: string } };
  };
  const googleError = maybeError.response?.data?.error;
  if (googleError === 'invalid_client') return 'gmail_invalid_client';
  if (googleError === 'invalid_grant') return 'gmail_invalid_grant';
  if (googleError === 'redirect_uri_mismatch') return 'gmail_redirect_uri_mismatch';
  return 'gmail_error';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const appOrigin = getAppOrigin(origin);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const settingsUrl = new URL('/dashboard/settings/channels', appOrigin);

  // Décoder le state en premier pour récupérer returnTo même en cas d'erreur
  let communityId: string | null = null;
  let returnTo = 'settings';
  if (stateRaw) {
    try {
      const payload = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp > Date.now()) {
        communityId = payload.communityId ?? null;
        returnTo = payload.returnTo ?? 'settings';
      }
    } catch {
      // state invalide, on continue sans communityId
    }
  }

  // Construire l'URL de retour selon returnTo
  const returnUrl =
    returnTo === 'onboarding'
      ? new URL('/onboarding', appOrigin)
      : returnTo === 'email_popup'
      ? new URL('/dashboard/email/oauth-done', appOrigin)
      : returnTo === 'settings_gmail_popup'
      ? new URL('/dashboard/settings/channels/oauth-done', appOrigin)
      : settingsUrl;

  // Accès refusé par l'utilisateur
  if (errorParam === 'access_denied') {
    returnUrl.searchParams.set('oauth', 'gmail_cancelled');
    return NextResponse.redirect(returnUrl);
  }

  if (!code) {
    returnUrl.searchParams.set('oauth', 'gmail_missing_code');
    return NextResponse.redirect(returnUrl);
  }

  // Vérifier l'authentification
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', appOrigin));
  }

  // Récupérer communityId depuis le profil si pas dans le state
  if (!communityId) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('communityId')
      .eq('id', user.id)
      .single();
    communityId = profile?.communityId ?? null;
  }

  if (!communityId) {
    returnUrl.searchParams.set('oauth', 'gmail_no_community');
    return NextResponse.redirect(returnUrl);
  }

  try {
    // Échanger le code contre des tokens
    const redirectUri = getGmailRedirectUri(new URL(request.url));
    const oauth2Client = createGmailOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token && !tokens.access_token) {
      returnUrl.searchParams.set('oauth', 'gmail_no_token');
      return NextResponse.redirect(returnUrl);
    }

    // Obtenir l'email du compte Gmail connecté
    oauth2Client.setCredentials(tokens);
    let gmailEmail = '';
    try {
      const { google } = await import('googleapis');
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      gmailEmail = userInfo.data.email ?? '';
    } catch {
      // non bloquant
    }

    // Sauvegarder dans la table Channel
    const admin = createAdminClient();
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;

    await admin.from('Channel').upsert(
      {
        id: crypto.randomUUID(),
        communityId,
        type: 'EMAIL',
        name: 'Email / Newsletter',
        handle: gmailEmail,
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: expiresAt,
        pageId: gmailEmail, // on stocke l'email dans pageId pour référence
        isConnected: true,
        isActive: true,
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          provider: 'gmail',
          email: gmailEmail,
          scope: 'gmail.send gmail.readonly',
        },
      },
      { onConflict: 'communityId,type' }
    );

    returnUrl.searchParams.set('oauth', 'gmail_success');
    returnUrl.searchParams.set('provider', 'gmail');
    return NextResponse.redirect(returnUrl);
  } catch (error) {
    console.error('[Gmail Callback Error]', error);
    returnUrl.searchParams.set('oauth', classifyGmailOAuthError(error));
    return NextResponse.redirect(returnUrl);
  }
}
