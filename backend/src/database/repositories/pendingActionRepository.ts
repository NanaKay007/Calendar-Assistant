import { Db, WithId, Document } from 'mongodb';
import crypto from 'crypto';

interface PendingActionDocument extends Document {
  id: string;
  conversation_id: string;
  action_type: string;
  action_payload: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at: string | null;
}

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
  constructor(private db: Db) {}

  private get collection() {
    return this.db.collection<PendingActionDocument>('pending_actions');
  }

  private toRow(doc: WithId<PendingActionDocument> | PendingActionDocument | null): PendingActionRow | undefined {
    if (!doc) return undefined;
    return {
      id: doc.id,
      conversation_id: doc.conversation_id,
      action_type: doc.action_type,
      action_payload: doc.action_payload,
      status: doc.status,
      created_at: doc.created_at,
      resolved_at: doc.resolved_at ?? null,
    };
  }

  async create(action: { conversation_id: string; action_type: string; action_payload: object }): Promise<PendingActionRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.collection.insertOne({
      id,
      conversation_id: action.conversation_id,
      action_type: action.action_type,
      action_payload: JSON.stringify(action.action_payload),
      status: 'pending',
      created_at: now,
      resolved_at: null,
    });
    const doc = await this.collection.findOne({ id });
    return this.toRow(doc)!;
  }

  async findById(id: string): Promise<PendingActionRow | undefined> {
    const doc = await this.collection.findOne({ id });
    return this.toRow(doc);
  }

  async findPendingByConversationId(conversationId: string): Promise<PendingActionRow[]> {
    const docs = await this.collection.find({ conversation_id: conversationId, status: 'pending' }).sort({ created_at: 1 }).toArray();
    return docs.map(d => this.toRow(d)!);
  }

  async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<PendingActionRow | undefined> {
    const doc = await this.collection.findOneAndUpdate(
      { id },
      { $set: { status, resolved_at: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    return this.toRow(doc);
  }
}
