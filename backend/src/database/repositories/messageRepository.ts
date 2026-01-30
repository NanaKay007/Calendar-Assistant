import Database from 'better-sqlite3';
import crypto from 'crypto';

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at: string;
}

export class MessageRepository {
  constructor(private db: Database.Database) {}

  create(message: { conversation_id: string; role: 'user' | 'assistant' | 'tool'; content: string }): MessageRow {
    const id = crypto.randomUUID();
    this.db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(id, message.conversation_id, message.role, message.content);
    return this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as MessageRow;
  }

  findByConversationId(conversationId: string): MessageRow[] {
    return this.db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conversationId) as MessageRow[];
  }
}
