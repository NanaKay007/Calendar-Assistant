import type { ApiResponse, ChatMessage } from '../types';

const API_BASE = '/api';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at: string;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new ApiError('Not authenticated', 401);
  }

  const body: ApiResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new ApiError(body.error ?? 'API request failed', res.status);
  }

  return body.data as T;
}

const CONVERSATION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

class ConversationService {
  async getConversations(limit = 50, offset = 0): Promise<Conversation[]> {
    return apiFetch<Conversation[]>(`/conversations?limit=${limit}&offset=${offset}`);
  }

  async getMessages(conversationId: string, limit = 100, offset = 0): Promise<ConversationMessage[]> {
    if (!CONVERSATION_ID_PATTERN.test(conversationId)) {
      throw new ApiError('Invalid conversationId format', 400);
    }
    return apiFetch<ConversationMessage[]>(
      `/conversations/${encodeURIComponent(conversationId)}/messages?limit=${limit}&offset=${offset}`
    );
  }

  /**
   * Convert backend conversation messages to the ChatMessage format used by the UI.
   */
  mapToChatMessages(messages: ConversationMessage[]): ChatMessage[] {
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.created_at,
      }));
  }
}

export const conversationService = new ConversationService();
