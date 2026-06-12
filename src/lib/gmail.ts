import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

export function getGmailRedirectUri(requestUrl?: URL): string {
  if (process.env.GMAIL_REDIRECT_URI) {
    return process.env.GMAIL_REDIRECT_URI.replace(/\/$/, '');
  }

  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const base = appUrl?.replace(/\/$/, '') ?? requestUrl?.origin ?? 'http://localhost:3000';
  return `${base}/api/auth/callback/google`;
}

export function createGmailOAuth2Client(redirectUri = getGmailRedirectUri()) {
  return new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    redirectUri
  );
}

export function getGmailOAuthEnvError(): string | null {
  if (!CLIENT_ID || !CLIENT_SECRET) return 'gmail_missing_env';
  return null;
}

export const oauth2Client = createGmailOAuth2Client();

export const getGmailClient = (refreshToken: string) => {
  const client = createGmailOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: client });
};

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  // Nécessaire pour récupérer l'adresse email du compte à la connexion (handle du canal).
  'https://www.googleapis.com/auth/userinfo.email',
  'openid'
];
