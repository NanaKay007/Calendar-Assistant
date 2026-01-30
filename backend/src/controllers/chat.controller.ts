import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { chatService } from '../services/chat.service';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';

const param = (req: AuthenticatedRequest, name: string): string =>
  req.params[name] as string;

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client || !req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' } as ApiResponse);
      return;
    }

    const { message, conversationId } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'message is required' } as ApiResponse);
      return;
    }

    const accessToken = req.session.tokens?.access_token;
    if (!accessToken) {
      res.status(401).json({ success: false, error: 'No access token' } as ApiResponse);
      return;
    }

    const result = await chatService.sendMessage(
      req.user.id,
      conversationId || null,
      message,
      accessToken
    );

    res.json({ success: true, data: result } as ApiResponse);
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    const status = error.message === 'Conversation not found' ? 404 : 500;
    res.status(status).json({ success: false, error: error.message || 'Chat failed' } as ApiResponse);
  }
};

export const getConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' } as ApiResponse);
      return;
    }

    const conversations = conversationService.getConversations(req.user.id);
    res.json({ success: true, data: conversations } as ApiResponse);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' } as ApiResponse);
  }
};

export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' } as ApiResponse);
      return;
    }

    const conversationId = param(req, 'id');
    const conversation = conversationService.getConversation(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' } as ApiResponse);
      return;
    }
    if (conversation.userId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Forbidden' } as ApiResponse);
      return;
    }

    const messages = conversationService.getMessages(conversationId);
    res.json({ success: true, data: messages } as ApiResponse);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' } as ApiResponse);
  }
};

export const getPendingActions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' } as ApiResponse);
      return;
    }

    const actions = actionService.getPendingActions(req.user.id);
    res.json({ success: true, data: actions } as ApiResponse);
  } catch (error) {
    console.error('Error getting pending actions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending actions' } as ApiResponse);
  }
};

export const approveAction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.oauth2Client || !req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' } as ApiResponse);
      return;
    }

    const actionId = param(req, 'id');
    const action = actionService.getAction(actionId);
    if (!action) {
      res.status(404).json({ success: false, error: 'Action not found' } as ApiResponse);
      return;
    }
    if (action.userId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Forbidden' } as ApiResponse);
      return;
    }

    const result = await actionService.approveAction(actionId, req.oauth2Client);
    res.json({ success: true, data: result, message: 'Action executed successfully' } as ApiResponse);
  } catch (error: any) {
    console.error('Error approving action:', error);
    const status = error.message?.includes('already') ? 409 : 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to approve action' } as ApiResponse);
  }
};

export const rejectAction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' } as ApiResponse);
      return;
    }

    const actionId = param(req, 'id');
    const action = actionService.getAction(actionId);
    if (!action) {
      res.status(404).json({ success: false, error: 'Action not found' } as ApiResponse);
      return;
    }
    if (action.userId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Forbidden' } as ApiResponse);
      return;
    }

    const result = actionService.rejectAction(actionId);
    res.json({ success: true, data: result, message: 'Action rejected' } as ApiResponse);
  } catch (error: any) {
    console.error('Error rejecting action:', error);
    const status = error.message?.includes('already') ? 409 : 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to reject action' } as ApiResponse);
  }
};
