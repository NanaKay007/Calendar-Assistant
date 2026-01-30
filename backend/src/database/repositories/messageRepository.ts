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

  async bulkCreate(messages: { conversation_id: string; role: 'user' | 'assistant' | 'tool'; content: string }[]): Promise<MessageRow[]> {
    if (messages.length === 0) return [];
    const now = new Date().toISOString();
    const docs = messages.map(m => ({ id: crypto.randomUUID(), ...m, created_at: now }));
    await this.collection.insertMany(docs);
    return docs.map(d => ({ id: d.id, conversation_id: d.conversation_id, role: d.role, content: d.content, created_at: d.created_at }));
  }

  async deleteAll(): Promise<void> {
    await this.collection.deleteMany({});
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
