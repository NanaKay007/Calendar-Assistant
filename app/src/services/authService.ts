import type { User } from '../types';

class AuthService {
  /**
   * Initiate Google OAuth sign-in by redirecting to the backend-provided OAuth URL.
   */
  async signInWithGoogle(): Promise<void> {
    const res = await fetch('/api/auth/login', { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to get OAuth URL');
    }
    const body = await res.json();
    const authUrl: string = body.data?.authUrl;
    if (!authUrl) {
      throw new Error('No auth URL returned from server');
    }
    // Redirect browser to Google consent screen
    window.location.href = authUrl;
  }

  /**
   * Sign out the current user by destroying the backend session.
   */
  async signOut(): Promise<void> {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get the current authenticated user from the backend session.
   * Returns null if not authenticated.
   */
  async getCurrentUser(): Promise<User | null> {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      return null;
    }
    const body = await res.json();
    return body.data ?? null;
  }

  /**
   * Check if the current session is authenticated.
   */
  async isAuthenticated(): Promise<boolean> {
    const res = await fetch('/api/auth/status', { credentials: 'include' });
    if (!res.ok) {
      return false;
    }
    const body = await res.json();
    return body.data?.isAuthenticated === true;
  }
}

export const authService = new AuthService();
