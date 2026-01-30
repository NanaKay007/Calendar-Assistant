import { Db, WithId, Document } from 'mongodb';
import crypto from 'crypto';

interface MessageDocument extends Document {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at: string;
}

export class MessageRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<MessageDocument>('messages');
  }

  private toRow(doc: WithId<MessageDocument> | MessageDocument | null): MessageRow | undefined {
    if (!doc) return undefined;
    return {
      id: doc.id,
      conversation_id: doc.conversation_id,
      role: doc.role,
      content: doc.content,
      created_at: doc.created_at,
    };
  }

  async create(message: { conversation_id: string; role: 'user' | 'assistant' | 'tool'; content: string }): Promise<MessageRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.collection.insertOne({ id, ...message, created_at: now });
    return { id, ...message, created_at: now };
  }

  async findByConversationId(conversationId: string, options?: { limit?: number; offset?: number }): Promise<MessageRow[]> {
    let cursor = this.collection.find({ conversation_id: conversationId }).sort({ created_at: 1 });
    if (options?.offset) {
      cursor = cursor.skip(options.offset);
    }
    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }
    const docs = await cursor.toArray();
    return docs.map(d => this.toRow(d)!);
  }
}
