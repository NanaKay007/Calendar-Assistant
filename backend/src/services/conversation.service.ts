import { Conversation, Message } from '../types';
import { getDatabase } from '../database/db';
import { ConversationRepository, ConversationRow } from '../database/repositories/conversationRepository';
import { MessageRepository, MessageRow } from '../database/repositories/messageRepository';

let repos: { convRepo: ConversationRepository; msgRepo: MessageRepository } | null = null;

async function getRepos() {
  if (!repos) {
    const db = await getDatabase();
    repos = { convRepo: new ConversationRepository(db), msgRepo: new MessageRepository(db) };
  }
  return repos;
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    createdAt: row.created_at,
  };
}

export class ConversationService {
  async getConversations(userId: string, limit = 50, offset = 0): Promise<Conversation[]> {
    const { convRepo } = await getRepos();
    const rows = await convRepo.findByUserId(userId, { limit, offset });
    return rows.map(toConversation);
  }

  async getMessages(conversationId: string, limit = 100, offset = 0): Promise<Message[]> {
    const { msgRepo } = await getRepos();
    const rows = await msgRepo.findByConversationId(conversationId, { limit, offset });
    return rows.map(toMessage);
  }

  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    const { convRepo } = await getRepos();
    const row = await convRepo.findById(conversationId);
    return row ? toConversation(row) : undefined;
  }

  async createConversation(userId: string, title: string): Promise<Conversation> {
    const { convRepo } = await getRepos();
    const row = await convRepo.create(userId, title);
    return toConversation(row);
  }

  async addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<Message> {
    const { convRepo, msgRepo } = await getRepos();
    const row = await msgRepo.create({ conversation_id: conversationId, role, content });
    await convRepo.updateTimestamp(conversationId);
    return toMessage(row);
  }

  /** For testing: clear all data */
  _clear(): void {
    repos = null;
  }
}

export const conversationService = new ConversationService();
