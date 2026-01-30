import { useState, useEffect, useRef } from 'react';
import type { ChatMessage, PendingAction } from '../../types';
import { chatService } from '../../services/chatService';
import { conversationService } from '../../services/conversationService';
import { ApprovalModal } from '../Approval/ApprovalModal';
import { ConversationSidebar } from './ConversationSidebar';

const INITIAL_MESSAGE: ChatMessage = {
  id: 'initial',
  role: 'assistant',
  content: 'Hello! I\'m your calendar assistant. I can help you manage your calendar events. Try asking me to schedule a meeting, check your upcoming events, or modify existing ones.',
  timestamp: new Date().toISOString(),
};

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  useEffect(() => {
    chatService.connect();
    return () => {
      chatService.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectConversation = async (selectedId: string) => {
    if (selectedId === conversationId) return;

    setIsLoadingMessages(true);
    try {
      const backendMessages = await conversationService.getMessages(selectedId);
      const chatMessages = conversationService.mapToChatMessages(backendMessages);
      setMessages(chatMessages.length > 0 ? chatMessages : [INITIAL_MESSAGE]);
      setConversationId(selectedId);
      setPendingActions([]);
      setSelectedAction(null);
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewConversation = () => {
    setConversationId(undefined);
    setMessages([INITIAL_MESSAGE]);
    setPendingActions([]);
    setSelectedAction(null);
    chatService.clearHistory();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await chatService.sendMessage(userInput, conversationId);
      if (result.conversationId && !conversationId) {
        setConversationId(result.conversationId);
      }
      setMessages(prev => [...prev, result.message]);

      if (result.pendingAction) {
        setPendingActions([...chatService.getPendingActions()]);
        setSelectedAction(result.pendingAction);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      await chatService.approveAction(actionId);
      setPendingActions(chatService.getPendingActions());
      setSelectedAction(null);

      const confirmationMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Action approved and executed successfully!',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, confirmationMessage]);
    } catch (error) {
      console.error('Error approving action:', error);
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      await chatService.rejectAction(actionId);
      setPendingActions(chatService.getPendingActions());
      setSelectedAction(null);

      const confirmationMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Action rejected. How else can I help you?',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, confirmationMessage]);
    } catch (error) {
      console.error('Error rejecting action:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex h-full">
      <ConversationSidebar
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Calendar Assistant</h2>
          <p className="text-sm text-gray-600 mt-1">
            Ask me to help manage your calendar
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 relative">
          {isLoadingMessages && (
            <div className="absolute inset-0 bg-gray-50 bg-opacity-80 flex items-center justify-center z-10">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <span
                  className={`text-xs mt-2 block ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 shadow-sm border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {pendingActions.length > 0 && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{pendingActions.length} action{pendingActions.length !== 1 ? 's' : ''} awaiting approval</span>
            </div>
          </div>
        )}

        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Send</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {selectedAction && (
        <ApprovalModal
          action={selectedAction}
          onApprove={handleApproveAction}
          onReject={handleRejectAction}
          onClose={() => setSelectedAction(null)}
        />
      )}
    </div>
  );
}
