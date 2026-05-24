import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGmbOAuth2Client, getGmbRedirectUri } from '@/lib/gmb';

export async function POST(request: Request) {
  const url = new URL(request.url);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { reviewName, replyText } = body; // reviewName = "locations/xxx/reviews/yyy"

  if (!reviewName || !replyText?.trim()) {
    return NextResponse.json({ error: 'reviewName et replyText obligatoires' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('communityId').eq('id', user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: 'Pas de communauté' }, { status: 400 });

  const { data: channel } = await admin
    .from('Channel')
    .select('refreshToken')
    .eq('communityId', profile.communityId)
    .eq('type', 'GOOGLE_BUSINESS')
    .maybeSingle();

  if (!channel?.refreshToken) {
    return NextResponse.json({ error: 'GMB non connecté' }, { status: 400 });
  }

  try {
    const oauth2Client = createGmbOAuth2Client(getGmbRedirectUri(url));
    oauth2Client.setCredentials({ refresh_token: channel.refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error('Impossible de rafraîchir le token');

    // PUT /v4/{reviewName}/reply
    const apiUrl = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;
    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: replyText }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[GMB Reply Error]', data);
      throw new Error(data?.error?.message ?? 'Erreur lors de la publication');
    }

    // Mettre à jour lastSyncAt
    await admin.from('Channel')
      .update({ lastSyncAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq('communityId', profile.communityId)
      .eq('type', 'GOOGLE_BUSINESS');

    return NextResponse.json({ success: true, reply: data });
  } catch (error) {
    console.error('[GMB Reply Error]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
