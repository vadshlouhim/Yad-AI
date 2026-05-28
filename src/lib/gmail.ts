import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
const REDIRECT_URI =
  process.env.GMAIL_REDIRECT_URI ||
  `${(APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/api/auth/callback/google`;

export const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

export const getGmailClient = (refreshToken: string) => {
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
};

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
];
