import { ChatResponse, ActionType } from '../types';
import { conversationService } from './conversation.service';
import { actionService } from './action.service';

// Mutating tool calls that require HITL approval
const MUTATING_ACTIONS: Record<string, ActionType> = {
  create_event: 'create_event',
  update_event: 'update_event',
  delete_event: 'delete_event',
};

/**
 * Stub for the agent call. Will be replaced by LangChain/Gemini integration.
 * Returns a simulated agent response, optionally with a detected tool call.
 */
function callAgent(
  _messages: Array<{ role: string; content: string }>,
  _accessToken: string
): {
  reply: string;
  toolCall?: { name: string; params: Record<string, any>; description: string };
} {
  // TODO: Replace with real LangChain agent invocation
  return {
    reply: 'I understand your request. This is a placeholder response — the AI agent is not yet connected.',
  };
}

export class ChatService {
  async sendMessage(
    userId: string,
    conversationId: string | null,
    message: string,
    accessToken: string
  ): Promise<ChatResponse> {
    // Load or create conversation
    let convId = conversationId;
    if (!convId) {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      const conv = conversationService.createConversation(userId, title);
      convId = conv.id;
    } else {
      const existing = conversationService.getConversation(convId);
      if (!existing) {
        throw new Error('Conversation not found');
      }
      if (existing.userId !== userId) {
        throw new Error('Conversation does not belong to user');
      }
    }

    // Save user message
    conversationService.addMessage(convId, 'user', message);

    // Build message history for agent
    const history = conversationService.getMessages(convId).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call agent (stubbed)
    const agentResult = callAgent(history, accessToken);

    // Save assistant reply
    conversationService.addMessage(convId, 'assistant', agentResult.reply);

    // Check for mutating tool calls → create PendingAction if needed
    const response: ChatResponse = {
      reply: agentResult.reply,
      conversationId: convId,
    };

    if (agentResult.toolCall) {
      const actionType = MUTATING_ACTIONS[agentResult.toolCall.name];
      if (actionType) {
        const pendingAction = actionService.createAction(
          userId,
          convId,
          actionType,
          agentResult.toolCall.params as any,
          agentResult.toolCall.description
        );
        response.pendingAction = pendingAction;
      }
    }

    return response;
  }
}

export const chatService = new ChatService();
