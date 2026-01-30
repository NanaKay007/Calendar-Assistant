import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { authService } from '../services/auth.service';

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if session has tokens
    if (!req.session?.tokens) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Please authenticate first',
      });
      return;
    }

    // Create authenticated OAuth2 client
    req.oauth2Client = authService.createAuthenticatedClient(req.session.tokens);
    req.user = req.session.user;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid or expired authentication',
    });
  }
};
