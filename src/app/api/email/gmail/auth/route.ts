import { NextResponse } from 'next/server';
import { oauth2Client, GMAIL_SCOPES } from '@/lib/gmail';

export async function GET() {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // IMPORTANT: pour obtenir le refresh_token
    scope: GMAIL_SCOPES,
    prompt: 'consent' // Force le consentement pour être sûr d'avoir le refresh_token
  });

  return NextResponse.json({ url });
}
