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
  pendingActions?: BackendPendingAction[];
}

interface WsReplyMessage {
  type: 'reply';
  requestId: number;
  data: BackendChatResponse;
}

interface WsErrorMessage {
  type: 'error';
  requestId?: number;
  error: string;
}

type WsIncoming = WsReplyMessage | WsErrorMessage;

interface SendResult {
  message: ChatMessage;
  pendingActions?: PendingAction[];
}

function mapPendingAction(backend: BackendPendingAction): PendingAction {
  // The WebSocket backend may send either the raw backend shape (actionType/params/createdAt)
  // or the already-transformed frontend shape (type/details/timestamp) via toFrontendAction().
  // Handle both to avoid undefined fields causing crashes in ApprovalModal.
  const raw = backend as any;
  return {
    id: backend.id,
    type: raw.type || backend.actionType,
    description: backend.description,
    details: raw.details || backend.params || {},
    timestamp: raw.timestamp || backend.createdAt,
    status: backend.status === 'executed' || backend.status === 'failed' ? 'approved' : backend.status as 'pending' | 'approved' | 'rejected',
  };
}

class ChatService {
  private ws: WebSocket | null = null;
  private messages: ChatMessage[] = [];
  private pendingActions: PendingAction[] = [];
  private pendingRequests: Map<number, { resolve: (v: SendResult) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }> = new Map();
  private timedOutRequestIds: Set<number> = new Set();
  private requestCounter = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private wsEndpoint: string | null = null;

  /** Configure a fixed WebSocket endpoint instead of deriving from window.location */
  setEndpoint(url: string): void {
    this.wsEndpoint = url;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.createConnection();
  }

  private createConnection(): void {
    // Close existing WebSocket before creating a new one to prevent resource leaks
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }

    const wsUrl = this.wsEndpoint || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      // WebSocket constructor can throw synchronously (e.g. invalid URL)
      console.error('Failed to create WebSocket:', err);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
      return;
    }

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

      // Use correlation requestId to match responses to pending requests
      const requestId = data.requestId;

      // Ignore late responses for already-timed-out requests
      if (requestId !== undefined && this.timedOutRequestIds.has(requestId)) {
        this.timedOutRequestIds.delete(requestId);
        return;
      }

      let pending: { resolve: (v: SendResult) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> } | undefined;

      if (requestId !== undefined && this.pendingRequests.has(requestId)) {
        pending = this.pendingRequests.get(requestId)!;
        this.pendingRequests.delete(requestId);
      } else {
        // Fallback to FIFO for backwards compatibility with servers that don't echo requestId
        const firstKey = this.pendingRequests.keys().next().value;
        if (firstKey === undefined) return;
        pending = this.pendingRequests.get(firstKey)!;
        this.pendingRequests.delete(firstKey);
      }

      if (pending.timer) clearTimeout(pending.timer);

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

      // Collect all pending actions (chained mutations)
      const mappedActions: PendingAction[] = [];

      const backendActions = response.pendingActions ?? (response.pendingAction ? [response.pendingAction] : []);
      for (const ba of backendActions) {
        const mapped = mapPendingAction(ba);
        mappedActions.push(mapped);
        this.pendingActions.push(mapped);
      }

      pending.resolve({
        message: assistantMessage,
        pendingActions: mappedActions.length > 0 ? mappedActions : undefined,
        conversationId: response.conversationId,
      } as SendResult & { conversationId: string });
    };

    this.ws.onclose = (event) => {
      if (event.code === 1008) {
        this.shouldReconnect = false;
      }
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
    // Clear any existing reconnect timer to prevent multiple concurrent attempts
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
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
    // Reject any pending requests and clear their timers
    this.timedOutRequestIds.clear();
    for (const [, pending] of this.pendingRequests) {
      if (pending.timer) clearTimeout(pending.timer);
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

      const requestId = this.requestCounter++;
      const timer = setTimeout(() => {
        const req = this.pendingRequests.get(requestId);
        if (req) {
          this.pendingRequests.delete(requestId);
          this.timedOutRequestIds.add(requestId);
          // Cap the set size to prevent unbounded growth if late responses never arrive
          if (this.timedOutRequestIds.size > 100) {
            const oldest = this.timedOutRequestIds.values().next().value;
            if (oldest !== undefined) this.timedOutRequestIds.delete(oldest);
          }
          req.reject(new Error('Request timed out'));
        }
      }, 30000);
      this.pendingRequests.set(requestId, { resolve: resolve as any, reject, timer });

      const payload: any = { type: 'send_message', message: content, requestId };
      if (conversationId) {
        // Defense-in-depth: validate conversationId format on the client side too
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(conversationId)) {
          clearTimeout(timer);
          this.pendingRequests.delete(requestId);
          reject(new Error('Invalid conversationId format'));
          return;
        }
        payload.conversationId = conversationId;
      }
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        reject(err instanceof Error ? err : new Error('Failed to send message'));
      }
    });
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getPendingActions(): PendingAction[] {
    return this.pendingActions.filter(a => a.status === 'pending');
  }

  async approveAction(actionId: string): Promise<string> {
    const response = await fetch(`/api/actions/${actionId}/approve`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Failed to approve action: ${response.statusText}`);
    }
    const action = this.pendingActions.find(a => a.id === actionId);
    if (action) {
      action.status = 'approved';
    }
    return body.message || 'Action approved and executed successfully!';
  }

  async rejectAction(actionId: string): Promise<string> {
    const response = await fetch(`/api/actions/${actionId}/reject`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Failed to reject action: ${response.statusText}`);
    }
    const action = this.pendingActions.find(a => a.id === actionId);
    if (action) {
      action.status = 'rejected';
    }
    return body.message || 'Action rejected.';
  }

  async fetchPendingActions(conversationId: string): Promise<PendingAction[]> {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(conversationId)) {
      return [];
    }
    const response = await fetch(`/api/actions/pending?conversationId=${encodeURIComponent(conversationId)}`, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.ok) {
      console.error('Failed to fetch pending actions:', response.statusText);
      return [];
    }
    const body = await response.json();
    if (!body.success || !Array.isArray(body.data)) {
      return [];
    }
    const actions: PendingAction[] = body.data.map((a: any) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      details: a.details,
      timestamp: a.timestamp,
      status: a.status,
    }));
    // Merge into internal state so approve/reject can find them
    for (const action of actions) {
      if (!this.pendingActions.find(p => p.id === action.id)) {
        this.pendingActions.push(action);
      }
    }
    return actions.filter(a => a.status === 'pending');
  }

  clearHistory(): void {
    this.messages = [];
    this.pendingActions = [];
  }
}

export const chatService = new ChatService();
