import { Router, Request, Response, NextFunction } from 'express';
import * as chatController from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Simple in-memory rate limiter for POST /chat
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 20; // max requests per window
const rateCounts = new Map<string, { count: number; resetAt: number }>();

function chatRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = (req as any).user?.id || req.ip || 'anonymous';
  const now = Date.now();
  let entry = rateCounts.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateCounts.set(key, entry);
  }

  entry.count++;
  if (entry.count > RATE_MAX) {
    res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    return;
  }

  next();
}

// Periodically clean up stale rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateCounts) {
    if (now > entry.resetAt) rateCounts.delete(key);
  }
}, 5 * 60_000).unref();

// All chat routes require authentication
router.use(requireAuth);

router.post('/chat', chatRateLimiter, chatController.sendMessage);
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id/messages', chatController.getMessages);
router.get('/actions/pending', chatController.getPendingActions);
router.post('/actions/:id/approve', chatController.approveAction);
router.post('/actions/:id/reject', chatController.rejectAction);

export default router;
