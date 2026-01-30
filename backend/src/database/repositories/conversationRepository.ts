import { Db } from 'mongodb';
import crypto from 'crypto';

export interface ConversationRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export class ConversationRepository {
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection('conversations');
  }

  private toRow(doc: any): ConversationRow | undefined {
    if (!doc) return undefined;
    return {
      id: doc.id,
      user_id: doc.user_id,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }

  async create(userId: string): Promise<ConversationRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.collection.insertOne({ id, user_id: userId, created_at: now, updated_at: now });
    return (await this.findById(id))!;
  }

  async findById(id: string): Promise<ConversationRow | undefined> {
    const doc = await this.collection.findOne({ id });
    return this.toRow(doc);
  }

  async findByUserId(userId: string): Promise<ConversationRow[]> {
    const docs = await this.collection.find({ user_id: userId }).sort({ updated_at: -1 }).toArray();
    return docs.map(d => this.toRow(d)!);
  }

  async updateTimestamp(id: string): Promise<void> {
    await this.collection.updateOne({ id }, { $set: { updated_at: new Date().toISOString() } });
  }
}
