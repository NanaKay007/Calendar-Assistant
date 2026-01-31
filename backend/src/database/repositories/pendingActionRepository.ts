import { Db, WithId, Document } from 'mongodb';
import crypto from 'crypto';

interface PendingActionDocument extends Document {
  id: string;
  user_id: string;
  conversation_id: string;
  action_type: string;
  action_payload: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  created_at: string;
  resolved_at: string | null;
}

export interface PendingActionRow {
  id: string;
  user_id: string;
  conversation_id: string;
  action_type: string;
  action_payload: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
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
      user_id: doc.user_id,
      conversation_id: doc.conversation_id,
      action_type: doc.action_type,
      action_payload: doc.action_payload,
      description: doc.description,
      status: doc.status,
      created_at: doc.created_at,
      resolved_at: doc.resolved_at ?? null,
    };
  }

  async create(action: {
    user_id: string;
    conversation_id: string;
    action_type: string;
    action_payload: object;
    description: string;
  }): Promise<PendingActionRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const payload = JSON.stringify(action.action_payload);
    const doc: PendingActionDocument = {
      id,
      user_id: action.user_id,
      conversation_id: action.conversation_id,
      action_type: action.action_type,
      action_payload: payload,
      description: action.description,
      status: 'pending',
      created_at: now,
      resolved_at: null,
    };
    await this.collection.insertOne(doc);
    return this.toRow(doc)!;
  }

  async findById(id: string): Promise<PendingActionRow | undefined> {
    const doc = await this.collection.findOne({ id });
    return this.toRow(doc);
  }

  async findPendingByUserId(userId: string): Promise<PendingActionRow[]> {
    const docs = await this.collection.find({ user_id: userId, status: 'pending' }).sort({ created_at: -1 }).toArray();
    return docs.map(d => this.toRow(d)!);
  }

  async findPendingByConversationId(conversationId: string): Promise<PendingActionRow[]> {
    const docs = await this.collection.find({ conversation_id: conversationId, status: 'pending' }).sort({ created_at: 1 }).toArray();
    return docs.map(d => this.toRow(d)!);
  }

  async updateStatus(id: string, status: 'approved' | 'rejected' | 'executed' | 'failed'): Promise<PendingActionRow | undefined> {
    const doc = await this.collection.findOneAndUpdate(
      { id },
      { $set: { status, resolved_at: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    return this.toRow(doc);
  }
}
