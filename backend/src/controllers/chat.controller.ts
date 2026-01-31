import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, PendingAction, CreateEventParams } from '../types';
import { conversationService } from '../services/conversation.service';
import { actionService } from '../services/action.service';
import { toFrontendAction } from '../utils/action.utils';

function formatActionMessage(action: PendingAction, approved: boolean): string {
  const verb = approved ? 'approved' : 'rejected';
  const params = action.params as any;

  if (action.actionType === 'create_event') {
    const p = params as CreateEventParams;
    const date = p.startDateTime ? new Date(p.startDateTime).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }) : '';
    if (approved) {
      return `Action approved: Created event '${p.summary}'${date ? ` on ${date}` : ''}.`;
    }
    return `Action rejected: Create event '${p.summary}' was cancelled by user.`;
  }

  if (action.actionType === 'update_event') {
    const summary = params.summary || 'event';
    if (approved) {
      return `Action approved: Updated event '${summary}'.`;
    }
    return `Action rejected: Update event '${summary}' was cancelled by user.`;
  }

  if (action.actionType === 'delete_event') {
    const summary = params.summary || 'event';
    if (approved) {
      return `Action approved: Deleted event '${summary}'.`;
    }
    return `Action rejected: Delete event was cancelled by user.`;
  }

  return `Action ${verb}.`;
}

const param = (req: AuthenticatedRequest, name: string): string =>
  req.params[name] as string;

const parseIntParam = (value: unknown, defaultVal: number, min = 0, max = 100): number => {
  const n = Number(value);
  if (isNaN(n)) return defaultVal;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

export const getConversations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' } as ApiResponse);
      return;
    }

    const limit = parseIntParam(req.query.limit, 50, 1, 100);
    const offset = parseIntParam(req.query.offset, 0, 0, 10000);

    const conversations = await conversationService.getConversations(req.user.id, limit, offset);
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
    const conversation = await conversationService.getConversation(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' } as ApiResponse);
      return;
    }
    if (conversation.userId !== req.user.id) {
      res.status(404).json({ success: false, error: 'Conversation not found' } as ApiResponse);
      return;
    }

    const limit = parseIntParam(req.query.limit, 100, 1, 500);
    const offset = parseIntParam(req.query.offset, 0, 0, 100000);

    const messages = await conversationService.getMessages(conversationId, limit, offset);
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

    let actions = actionService.getPendingActions(req.user.id);

    // Support optional conversationId filter
    const conversationId = req.query.conversationId;
    if (typeof conversationId === 'string' && conversationId.length > 0) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(conversationId)) {
        res.status(400).json({ success: false, error: 'Invalid conversationId format' } as ApiResponse);
        return;
      }
      actions = actions.filter((a) => a.conversationId === conversationId);
    }

    res.json({ success: true, data: actions.map(toFrontendAction) } as ApiResponse);
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
    const result = await actionService.approveAction(actionId, req.oauth2Client, req.user.id);
    const approvalMessage = formatActionMessage(result, true);
    try {
      await conversationService.addMessage(result.conversationId, 'assistant', approvalMessage);
    } catch (e) {
      console.error('Failed to save approval message:', e);
    }
    res.json({ success: true, data: toFrontendAction(result), message: approvalMessage } as ApiResponse);
  } catch (error: any) {
    console.error('Error approving action:', error);
    // Return 404 for both 'not found' and 'unauthorized' to prevent user enumeration
    if (error.message === 'Action not found' || error.message === 'Unauthorized') {
      res.status(404).json({ success: false, error: 'Not found' } as ApiResponse);
      return;
    }
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
    const result = actionService.rejectAction(actionId, req.user.id);
    const rejectionMessage = formatActionMessage(result, false);
    try {
      await conversationService.addMessage(result.conversationId, 'assistant', rejectionMessage);
    } catch (e) {
      console.error('Failed to save rejection message:', e);
    }
    res.json({ success: true, data: toFrontendAction(result), message: rejectionMessage } as ApiResponse);
  } catch (error: any) {
    console.error('Error rejecting action:', error);
    // Return 404 for both 'not found' and 'unauthorized' to prevent user enumeration
    if (error.message === 'Action not found' || error.message === 'Unauthorized') {
      res.status(404).json({ success: false, error: 'Not found' } as ApiResponse);
      return;
    }
    const status = error.message?.includes('already') ? 409 : 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to reject action' } as ApiResponse);
  }
};
