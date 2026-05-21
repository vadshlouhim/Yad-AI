import { NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/gmail';

export async function GET() {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!refreshToken) {
    return NextResponse.json({ error: 'Gmail non connecté' }, { status: 400 });
  }

  try {
    const gmail = getGmailClient(refreshToken);
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10
    });

    const messages = await Promise.all(
      (res.data.messages || []).map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full'
        });

        const headers = detail.data.payload?.headers;
        const subject = headers?.find(h => h.name === 'Subject')?.value || 'Sans sujet';
        const from = headers?.find(h => h.name === 'From')?.value || 'Inconnu';
        const date = headers?.find(h => h.name === 'Date')?.value || '';
        
        // Extraction simplifiée du corps
        let body = '';
        if (detail.data.snippet) {
          body = detail.data.snippet;
        }

        return {
          id: msg.id,
          sender: from.split('<')[0].trim() || from,
          senderEmail: from.match(/<([^>]+)>/)?.[1] || from,
          subject,
          body,
          date: new Date(date).toLocaleDateString('fr-FR'),
          timestamp: new Date(date).getTime(),
          read: !detail.data.labelIds?.includes('UNREAD'),
          priority: 'IMPORTANT', // Par défaut
          history: [{
            role: 'user',
            body: body,
            date: new Date(date).toLocaleTimeString('fr-FR')
          }]
        };
      })
    );

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Gmail List Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
