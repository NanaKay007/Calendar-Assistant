import Database from 'better-sqlite3';
import crypto from 'crypto';

export interface PendingActionRow {
  id: string;
  conversation_id: string;
  action_type: string;
  action_payload: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}

export class PendingActionRepository {
  constructor(private db: Database.Database) {}

  create(action: { conversation_id: string; action_type: string; action_payload: object }): PendingActionRow {
    const id = crypto.randomUUID();
    this.db.prepare('INSERT INTO pending_actions (id, conversation_id, action_type, action_payload) VALUES (?, ?, ?, ?)').run(id, action.conversation_id, action.action_type, JSON.stringify(action.action_payload));
    return this.db.prepare('SELECT * FROM pending_actions WHERE id = ?').get(id) as PendingActionRow;
  }

  findById(id: string): PendingActionRow | undefined {
    return this.db.prepare('SELECT * FROM pending_actions WHERE id = ?').get(id) as PendingActionRow | undefined;
  }

  findPendingByConversationId(conversationId: string): PendingActionRow[] {
    return this.db.prepare("SELECT * FROM pending_actions WHERE conversation_id = ? AND status = 'pending' ORDER BY created_at ASC").all(conversationId) as PendingActionRow[];
  }

  updateStatus(id: string, status: 'approved' | 'rejected'): PendingActionRow | undefined {
    this.db.prepare("UPDATE pending_actions SET status = ?, resolved_at = datetime('now') WHERE id = ?").run(status, id);
    return this.findById(id);
  }
}
