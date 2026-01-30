import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest, ApiResponse, UserInfo } from '../types';
import { getDatabase, UserRepository } from '../database';
import { config } from '../config/env';

/**
 * Initiate Google OAuth flow
 */
export const initiateAuth = (req: Request, res: Response): void => {
  try {
    const authUrl = authService.getAuthUrl();
    res.json({
      success: true,
      data: { authUrl },
      message: 'Authorization URL generated',
    } as ApiResponse<{ authUrl: string }>);
  } catch (error) {
    console.error('Error initiating auth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate authentication',
    } as ApiResponse);
  }
};

/**
 * Handle OAuth callback from Google
 */
export const handleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code',
      } as ApiResponse);
      return;
    }

    // Exchange code for tokens
    const tokens = await authService.getTokensFromCode(code);

    // Get user info
    const userInfo = await authService.getUserInfo(tokens.access_token!);

    // Persist user and tokens to MongoDB
    try {
      const db = await getDatabase();
      const userRepo = new UserRepository(db, config.tokenEncryptionKey);
      await userRepo.upsert({
        id: userInfo.id,
        email: userInfo.email,
        display_name: userInfo.name || userInfo.email,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token ?? undefined,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
      });
    } catch (dbError) {
      console.error('Failed to persist user to MongoDB:', dbError);
      // Don't break the auth flow if DB write fails
    }

    // Store tokens and user info in session
    req.session.tokens = {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    };
    req.session.user = userInfo;

    // Save session and redirect to frontend
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to save session',
        } as ApiResponse);
        return;
      }

      // Redirect to frontend with success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/success`);
    });
  } catch (error) {
    console.error('Error handling callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error`);
  }
};

/**
 * Get current user information
 */
export const getCurrentUser = (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: req.user,
    } as ApiResponse<UserInfo>);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information',
    } as ApiResponse);
  }
};

/**
 * Check authentication status
 */
export const checkAuth = (req: Request, res: Response): void => {
  const isAuthenticated = !!req.session?.tokens;
  res.json({
    success: true,
    data: {
      isAuthenticated,
      user: req.session?.user || null,
    },
  } as ApiResponse<{ isAuthenticated: boolean; user: UserInfo | null }>);
};

/**
 * Logout user
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Revoke token if available
    if (req.session?.tokens?.access_token) {
      try {
        await authService.revokeToken(req.session.tokens.access_token);
      } catch (error) {
        console.error('Error revoking token:', error);
        // Continue with logout even if revoke fails
      }
    }

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to logout',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      } as ApiResponse);
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
    } as ApiResponse);
  }
};
