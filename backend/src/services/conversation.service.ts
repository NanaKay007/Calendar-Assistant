import { Conversation, Message } from '../types';
import { randomUUID } from 'crypto';

// In-memory storage (will be replaced by DB repositories)
const conversations = new Map<string, Conversation>();
const messages = new Map<string, Message[]>(); // conversationId -> messages

export class ConversationService {
  getConversations(userId: string): Conversation[] {
    return Array.from(conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getMessages(conversationId: string): Message[] {
    return messages.get(conversationId) || [];
  }

  getConversation(conversationId: string): Conversation | undefined {
    return conversations.get(conversationId);
  }

  createConversation(userId: string, title: string): Conversation {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: randomUUID(),
      userId,
      title,
      createdAt: now,
      updatedAt: now,
    };
    conversations.set(conversation.id, conversation);
    messages.set(conversation.id, []);
    return conversation;
  }

  addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Message {
    const message: Message = {
      id: randomUUID(),
      conversationId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    const msgs = messages.get(conversationId);
    if (msgs) {
      msgs.push(message);
    } else {
      messages.set(conversationId, [message]);
    }
    // Update conversation timestamp
    const conv = conversations.get(conversationId);
    if (conv) {
      conv.updatedAt = message.createdAt;
    }
    return message;
  }

  /** For testing: clear all data */
  _clear(): void {
    conversations.clear();
    messages.clear();
  }
}

export const conversationService = new ConversationService();
