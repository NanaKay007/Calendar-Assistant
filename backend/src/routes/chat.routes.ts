import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All chat routes require authentication
router.use(requireAuth);

router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id/messages', chatController.getMessages);
router.get('/actions/pending', chatController.getPendingActions);
router.post('/actions/:id/approve', chatController.approveAction);
router.post('/actions/:id/reject', chatController.rejectAction);

export default router;
