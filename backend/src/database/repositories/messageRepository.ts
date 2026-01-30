import { Db } from 'mongodb';
import crypto from 'crypto';

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
    return this.db.collection('messages');
  }

  private toRow(doc: any): MessageRow {
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
    const doc = await this.collection.findOne({ id });
    return this.toRow(doc);
  }

  async findByConversationId(conversationId: string): Promise<MessageRow[]> {
    const docs = await this.collection.find({ conversation_id: conversationId }).sort({ created_at: 1 }).toArray();
    return docs.map(d => this.toRow(d));
  }
}
