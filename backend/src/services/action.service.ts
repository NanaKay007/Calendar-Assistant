import { randomUUID } from 'crypto';
import { Auth } from 'googleapis';
import { PendingAction, ActionType, ActionStatus, CreateEventParams, UpdateEventParams } from '../types';
import { calendarService } from './calendar.service';

// In-memory storage (will be replaced by DB repositories)
const actions = new Map<string, PendingAction>();

export class ActionService {
  getPendingActions(userId: string): PendingAction[] {
    return Array.from(actions.values())
      .filter((a) => a.userId === userId && a.status === 'pending')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getAction(actionId: string): PendingAction | undefined {
    return actions.get(actionId);
  }

  createAction(
    userId: string,
    conversationId: string,
    actionType: ActionType,
    params: PendingAction['params'],
    description: string
  ): PendingAction {
    const action: PendingAction = {
      id: randomUUID(),
      userId,
      conversationId,
      actionType,
      params,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    actions.set(action.id, action);
    return action;
  }

  async approveAction(actionId: string, auth: Auth.OAuth2Client, userId: string): Promise<PendingAction> {
    const action = actions.get(actionId);
    if (!action) {
      throw new Error('Action not found');
    }
    if (action.userId !== userId) {
      throw new Error('Unauthorized');
    }
    if (action.status !== 'pending') {
      throw new Error(`Action already ${action.status}`);
    }

    try {
      switch (action.actionType) {
        case 'create_event':
          await calendarService.createEvent(auth, action.params as CreateEventParams);
          break;
        case 'update_event':
          await calendarService.updateEvent(auth, action.params as UpdateEventParams);
          break;
        case 'delete_event': {
          const p = action.params as { calendarId: string; eventId: string };
          await calendarService.deleteEvent(auth, p.calendarId, p.eventId);
          break;
        }
      }
      action.status = 'executed';
    } catch (error) {
      action.status = 'failed';
      throw error;
    }

    action.resolvedAt = new Date().toISOString();
    return action;
  }

  rejectAction(actionId: string, userId: string): PendingAction {
    const action = actions.get(actionId);
    if (!action) {
      throw new Error('Action not found');
    }
    if (action.userId !== userId) {
      throw new Error('Unauthorized');
    }
    if (action.status !== 'pending') {
      throw new Error(`Action already ${action.status}`);
    }
    action.status = 'rejected';
    action.resolvedAt = new Date().toISOString();
    return action;
  }

  /** For testing: clear all data */
  _clear(): void {
    actions.clear();
  }
}

export const actionService = new ActionService();
