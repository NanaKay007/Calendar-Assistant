import { Router, Request, Response, NextFunction } from 'express';
import * as chatController from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All chat routes require authentication
router.use(requireAuth);

/**
 * CSRF protection: require X-Requested-With header on state-changing endpoints.
 * Browsers will not send custom headers in cross-origin simple requests,
 * providing defense-in-depth alongside SameSite=Lax cookies.
 */
function requireCsrfHeader(req: Request, res: Response, next: NextFunction): void {
  if (!req.headers['x-requested-with']) {
    res.status(403).json({ success: false, error: 'Missing CSRF header' });
    return;
  }
  next();
}

router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id/messages', chatController.getMessages);
router.get('/actions/pending', chatController.getPendingActions);
router.post('/actions/:id/approve', requireCsrfHeader, chatController.approveAction);
router.post('/actions/:id/reject', requireCsrfHeader, chatController.rejectAction);

export default router;
