import { NextResponse } from 'next/server';
import { oauth2Client } from '@/lib/gmail';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const settingsUrl = new URL('/dashboard/settings/channels', origin);

  // Accès refusé par l'utilisateur
  if (errorParam === 'access_denied') {
    settingsUrl.searchParams.set('oauth', 'gmail_cancelled');
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set('oauth', 'gmail_missing_code');
    return NextResponse.redirect(settingsUrl);
  }

  // Décoder le state
  let communityId: string | null = null;
  if (stateRaw) {
    try {
      const payload = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp > Date.now()) {
        communityId = payload.communityId ?? null;
      }
    } catch {
      // state invalide, on continue sans communityId
    }
  }

  // Vérifier l'authentification
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', origin));
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
    settingsUrl.searchParams.set('oauth', 'gmail_no_community');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    // Échanger le code contre des tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token && !tokens.access_token) {
      settingsUrl.searchParams.set('oauth', 'gmail_no_token');
      return NextResponse.redirect(settingsUrl);
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

    settingsUrl.searchParams.set('oauth', 'gmail_success');
    settingsUrl.searchParams.set('provider', 'gmail');
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error('[Gmail Callback Error]', error);
    settingsUrl.searchParams.set('oauth', 'gmail_error');
    return NextResponse.redirect(settingsUrl);
  }
}
