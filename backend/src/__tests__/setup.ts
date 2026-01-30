import { google } from 'googleapis';
import { config } from '../config/env';

/**
 * Bootstrap real Google OAuth tokens from a refresh token.
 * Returns an access_token that can be used in integration tests.
 */
export async function getTestTokens(): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const refreshToken = process.env.GOOGLE_TEST_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      'GOOGLE_TEST_REFRESH_TOKEN is not set. ' +
        'Complete the OAuth flow once to obtain a refresh token, then add it to your .env file.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to obtain access token from refresh token');
  }

  return {
    access_token: credentials.access_token,
    refresh_token: refreshToken,
    expiry_date: credentials.expiry_date || Date.now() + 3600_000,
  };
}
