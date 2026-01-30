import type { ChatMessage, PendingAction } from '../types';

interface BackendPendingAction {
  id: string;
  userId: string;
  conversationId: string;
  actionType: 'create_event' | 'update_event' | 'delete_event';
  params: any;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  createdAt: string;
  resolvedAt?: string;
}

interface BackendChatResponse {
  reply: string;
  conversationId: string;
  pendingAction?: BackendPendingAction;
}

interface WsReplyMessage {
  type: 'reply';
  data: BackendChatResponse;
}

interface WsErrorMessage {
  type: 'error';
  error: string;
}

type WsIncoming = WsReplyMessage | WsErrorMessage;

interface SendResult {
  message: ChatMessage;
  pendingAction?: PendingAction;
}

function mapPendingAction(backend: BackendPendingAction): PendingAction {
  return {
    id: backend.id,
    type: backend.actionType,
    description: backend.description,
    details: backend.params,
    timestamp: backend.createdAt,
    status: backend.status === 'executed' || backend.status === 'failed' ? 'approved' : backend.status as 'pending' | 'approved' | 'rejected',
  };
}

class ChatService {
  private ws: WebSocket | null = null;
  private messages: ChatMessage[] = [];
  private pendingActions: PendingAction[] = [];
  private pendingRequests: Map<number, { resolve: (v: SendResult) => void; reject: (e: Error) => void }> = new Map();
  private requestCounter = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  connect(): void {
    this.shouldReconnect = true;
    this.createConnection();
  }

  private createConnection(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      let data: WsIncoming;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      // Resolve the oldest pending request
      const firstKey = this.pendingRequests.keys().next().value;
      if (firstKey === undefined) return;

      const pending = this.pendingRequests.get(firstKey)!;
      this.pendingRequests.delete(firstKey);

      if (data.type === 'error') {
        pending.reject(new Error(data.error));
        return;
      }

      const response = data.data;
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };
      this.messages.push(assistantMessage);

      let pendingAction: PendingAction | undefined;
      if (response.pendingAction) {
        pendingAction = mapPendingAction(response.pendingAction);
        this.pendingActions.push(pendingAction);
      }

      pending.resolve({
        message: assistantMessage,
        pendingAction,
        conversationId: response.conversationId,
      } as SendResult & { conversationId: string });
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.createConnection(), delay);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // Reject any pending requests
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('Disconnected'));
    }
    this.pendingRequests.clear();
  }

  sendMessage(content: string, conversationId?: string): Promise<SendResult & { conversationId: string }> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      this.messages.push(userMessage);

      const requestId = this.requestCounter++;
      this.pendingRequests.set(requestId, { resolve: resolve as any, reject });

      const payload: any = { type: 'send_message', message: content };
      if (conversationId) {
        payload.conversationId = conversationId;
      }
      this.ws.send(JSON.stringify(payload));
    });
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getPendingActions(): PendingAction[] {
    return this.pendingActions.filter(a => a.status === 'pending');
  }

  async approveAction(actionId: string): Promise<void> {
    const response = await fetch(`/api/actions/${actionId}/approve`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to approve action: ${response.statusText}`);
    }
    const action = this.pendingActions.find(a => a.id === actionId);
    if (action) {
      action.status = 'approved';
    }
  }

  async rejectAction(actionId: string): Promise<void> {
    const response = await fetch(`/api/actions/${actionId}/reject`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to reject action: ${response.statusText}`);
    }
    const action = this.pendingActions.find(a => a.id === actionId);
    if (action) {
      action.status = 'rejected';
    }
  }

  clearHistory(): void {
    this.messages = [];
    this.pendingActions = [];
  }
}

export const chatService = new ChatService();
