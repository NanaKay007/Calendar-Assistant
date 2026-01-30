import Database from 'better-sqlite3';
import crypto from 'crypto';

export interface ConversationRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export class ConversationRepository {
  constructor(private db: Database.Database) {}

  create(userId: string): ConversationRow {
    const id = crypto.randomUUID();
    this.db.prepare('INSERT INTO conversations (id, user_id) VALUES (?, ?)').run(id, userId);
    return this.findById(id)!;
  }

  findById(id: string): ConversationRow | undefined {
    return this.db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as ConversationRow | undefined;
  }

  findByUserId(userId: string): ConversationRow[] {
    return this.db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as ConversationRow[];
  }

  updateTimestamp(id: string): void {
    this.db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(id);
  }
}
