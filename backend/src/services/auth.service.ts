import { google, Auth } from 'googleapis';
import { config } from '../config/env';
import { UserInfo } from '../types';

export class AuthService {
  private oauth2Client: Auth.OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  /**
   * Generate the Google OAuth2 authorization URL
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens from code:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get user information from Google
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    try {
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2',
      });

      this.oauth2Client.setCredentials({ access_token: accessToken });

      const { data } = await oauth2.userinfo.get();

      return {
        id: data.id || '',
        email: data.email || '',
        name: data.name,
        picture: data.picture,
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Create an OAuth2Client with the given tokens
   */
  createAuthenticatedClient(tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  }): Auth.OAuth2Client {
    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );

    client.setCredentials(tokens);

    // Set up automatic token refresh
    client.on('tokens', (newTokens) => {
      if (newTokens.refresh_token) {
        console.log('New refresh token received');
      }
      console.log('New access token received');
    });

    return client;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke tokens (logout)
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      await this.oauth2Client.revokeToken(accessToken);
    } catch (error) {
      console.error('Error revoking token:', error);
      throw new Error('Failed to revoke token');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
