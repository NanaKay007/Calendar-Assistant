import { Auth } from 'googleapis';
import { PendingAction, ActionType, CreateEventParams, UpdateEventParams } from '../types';
import { calendarService } from './calendar.service';
import { PendingActionRepository, PendingActionRow } from '../database/repositories/pendingActionRepository';
import { getDatabase } from '../database/db';
import type { Db } from 'mongodb';

function rowToAction(row: PendingActionRow): PendingAction {
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    actionType: row.action_type as ActionType,
    params: JSON.parse(row.action_payload),
    description: row.description,
    status: row.status as PendingAction['status'],
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

export class ActionService {
  private repo: PendingActionRepository | null = null;

  private async getRepo(): Promise<PendingActionRepository> {
    if (!this.repo) {
      const db: Db = await getDatabase();
      this.repo = new PendingActionRepository(db);
    }
    return this.repo;
  }

  /** Inject a repository directly (used for testing). */
  _setRepo(repo: PendingActionRepository): void {
    this.repo = repo;
  }

  async getPendingActions(userId: string): Promise<PendingAction[]> {
    const repo = await this.getRepo();
    const rows = await repo.findPendingByUserId(userId);
    return rows.map(rowToAction);
  }

  async getAction(actionId: string): Promise<PendingAction | undefined> {
    const repo = await this.getRepo();
    const row = await repo.findById(actionId);
    return row ? rowToAction(row) : undefined;
  }

  async createAction(
    userId: string,
    conversationId: string,
    actionType: ActionType,
    params: PendingAction['params'],
    description: string
  ): Promise<PendingAction> {
    const repo = await this.getRepo();
    const row = await repo.create({
      user_id: userId,
      conversation_id: conversationId,
      action_type: actionType,
      action_payload: params,
      description,
    });
    return rowToAction(row);
  }

  async approveAction(actionId: string, auth: Auth.OAuth2Client, userId: string): Promise<PendingAction> {
    const repo = await this.getRepo();
    const row = await repo.findById(actionId);
    if (!row) {
      throw new Error('Action not found');
    }
    if (row.user_id !== userId) {
      throw new Error('Unauthorized');
    }
    if (row.status !== 'pending') {
      throw new Error(`Action already ${row.status}`);
    }

    const action = rowToAction(row);

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
      const updated = await repo.updateStatus(actionId, 'executed');
      return updated ? rowToAction(updated) : { ...action, status: 'executed', resolvedAt: new Date().toISOString() };
    } catch (error) {
      await repo.updateStatus(actionId, 'failed');
      throw error;
    }
  }

  async rejectAction(actionId: string, userId: string): Promise<PendingAction> {
    const repo = await this.getRepo();
    const row = await repo.findById(actionId);
    if (!row) {
      throw new Error('Action not found');
    }
    if (row.user_id !== userId) {
      throw new Error('Unauthorized');
    }
    if (row.status !== 'pending') {
      throw new Error(`Action already ${row.status}`);
    }

    const updated = await repo.updateStatus(actionId, 'rejected');
    return updated ? rowToAction(updated) : rowToAction({ ...row, status: 'rejected', resolved_at: new Date().toISOString() });
  }

  /** For testing: clear all pending actions from DB */
  async _clear(): Promise<void> {
    const repo = await this.getRepo();
    // Access the collection directly via a known method — drop all docs
    const db = (repo as any).db as Db;
    await db.collection('pending_actions').deleteMany({});
  }
}

export const actionService = new ActionService();
