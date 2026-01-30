import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/auth/login
 * @desc    Get Google OAuth URL
 * @access  Public
 */
router.get('/login', authController.initiateAuth);

/**
 * @route   GET /api/auth/callback
 * @desc    Handle OAuth callback from Google
 * @access  Public
 */
router.get('/callback', authController.handleCallback);

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', authController.checkAuth);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me', requireAuth, authController.getCurrentUser);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', requireAuth, authController.logout);

export default router;
