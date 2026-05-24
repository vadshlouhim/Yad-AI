import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

export const GMB_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
];

/**
 * Crée un client OAuth2 Google pour GMB.
 * On réutilise les mêmes credentials que Gmail (même projet Google Cloud).
 */
export function createGmbOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri);
}

/**
 * Retourne l'URL de redirect GMB selon l'environnement.
 */
export function getGmbRedirectUri(requestUrl?: URL): string {
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const base = appUrl?.replace(/\/$/, '') ?? requestUrl?.origin ?? 'http://localhost:3000';
  return `${base}/api/auth/callback/gmb`;
}

/**
 * Construit un client OAuth2 avec les credentials stockés et rafraîchit le token si besoin.
 */
export async function getAuthenticatedGmbClient(refreshToken: string, redirectUri: string) {
  const client = createGmbOAuth2Client(redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  // Force le rafraîchissement de l'access token
  await client.getAccessToken();
  return client;
}

/**
 * Appelle l'API GMB (mybusiness.googleapis.com/v4) avec le token d'accès.
 */
export async function gmbFetch<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://mybusiness.googleapis.com/v4${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `GMB API error ${res.status}`);
  }
  return data as T;
}
