import { useState, useEffect, useRef } from 'react';
import { conversationService, type Conversation } from '../../services/conversationService';

interface ConversationSidebarProps {
  currentConversationId: string | undefined;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  refreshTrigger?: number;
}

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  refreshTrigger,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);

  const fetchConversations = async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await conversationService.getConversations();
      if (!signal?.aborted) {
        setConversations(data);
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Failed to fetch conversations:', err);
        setError('Failed to load conversations');
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchConversations(controller.signal);
    return () => controller.abort();
  }, []);

  // Refresh the list only when explicitly triggered (e.g. new conversation created)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      const controller = new AbortController();
      fetchConversations(controller.signal);
      return () => controller.abort();
    }
  }, [refreshTrigger]);

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Handle future dates from clock skew — treat as "just now"
    if (diffMs < 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64 min-w-[16rem]">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewConversation}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            Loading conversations...
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-400 text-sm">
            {error}
            <button
              onClick={() => {
                activeControllerRef.current?.abort();
                const controller = new AbortController();
                activeControllerRef.current = controller;
                fetchConversations(controller.signal);
              }}
              className="block mx-auto mt-2 text-blue-400 hover:text-blue-300 text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <div className="p-4 text-center text-gray-400 text-sm">
            No conversations yet. Start a new one!
          </div>
        )}

        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800 transition-colors ${
              currentConversationId === conv.id ? 'bg-gray-700' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate flex-1 mr-2">
                {conv.title || 'Untitled'}
              </span>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDate(conv.updatedAt)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
