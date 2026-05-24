import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGmailClient } from '@/lib/gmail';

export async function GET() {
  // 1. Vérifier l'authentification
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // 2. Récupérer le communityId de l'utilisateur
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('communityId')
    .eq('id', user.id)
    .single();

  if (!profile?.communityId) {
    return NextResponse.json({ error: 'Aucune communauté associée' }, { status: 400 });
  }

  // 3. Récupérer le refreshToken Gmail de CETTE communauté
  const { data: channel } = await admin
    .from('Channel')
    .select('refreshToken, isConnected')
    .eq('communityId', profile.communityId)
    .eq('type', 'EMAIL')
    .maybeSingle();

  const refreshToken = channel?.refreshToken ?? process.env.GMAIL_REFRESH_TOKEN;

  if (!refreshToken || !channel?.isConnected) {
    return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 });
  }

  // 4. Lister les emails avec le token de la communauté
  try {
    const gmail = getGmailClient(refreshToken);
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
    });

    const messages = await Promise.all(
      (res.data.messages || []).map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        });

        const headers = detail.data.payload?.headers;
        const subject = headers?.find((h) => h.name === 'Subject')?.value || 'Sans sujet';
        const from = headers?.find((h) => h.name === 'From')?.value || 'Inconnu';
        const date = headers?.find((h) => h.name === 'Date')?.value || '';

        const body = detail.data.snippet || '';

        return {
          id: msg.id,
          sender: from.split('<')[0].trim() || from,
          senderEmail: from.match(/<([^>]+)>/)?.[1] || from,
          subject,
          body,
          date: new Date(date).toLocaleDateString('fr-FR'),
          timestamp: new Date(date).getTime(),
          read: !detail.data.labelIds?.includes('UNREAD'),
          priority: 'IMPORTANT',
          history: [{ role: 'user', body, date: new Date(date).toLocaleTimeString('fr-FR') }],
        };
      })
    );

    return NextResponse.json({ messages });
  } catch (error: unknown) {
    console.error('Gmail List Error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
