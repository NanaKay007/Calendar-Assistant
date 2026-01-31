import { ChatResponse, ActionType } from '../types';
import { conversationService } from './conversation.service';
import { actionService } from './action.service';
import { createCalendarAgent } from '../agent';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { MongoChatMessageHistory } from '../agent/mongoChatHistory';
import { MessageRepository } from '../database/repositories/messageRepository';
import { getDatabase } from '../database/db';

// Mutating tool calls that require HITL approval
const MUTATING_ACTIONS: Record<string, ActionType> = {
  create_event: 'create_event',
  update_event: 'update_event',
  delete_event: 'delete_event',
};

/**
 * Call the LangChain ReAct agent with conversation history.
 */
async function callAgent(
  langchainMessages: BaseMessage[],
  accessToken: string
): Promise<{
  reply: string;
  toolCalls: { name: string; params: Record<string, any>; description: string }[];
}> {
  const agent = await createCalendarAgent(accessToken);

  const result = await agent.invoke({ messages: langchainMessages });

  // Extract final AI reply
  const lastMessage = result.messages[result.messages.length - 1];
  const reply = typeof lastMessage.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);

  // Scan tool messages for all pendingActions (chained mutating calls)
  const toolCalls: { name: string; params: Record<string, any>; description: string }[] = [];

  for (const msg of result.messages) {
    if (typeof (msg as any)._getType === 'function' && (msg as any)._getType() === 'tool') {
      try {
        const parsed = JSON.parse(typeof msg.content === 'string' ? msg.content : '');
        if (parsed.pendingAction === true) {
          toolCalls.push({
            name: parsed.actionType,
            params: parsed.payload,
            description: `${parsed.actionType}: ${JSON.stringify(parsed.payload)}`,
          });
        }
      } catch {
        // Not JSON or no pendingAction — skip
      }
    }
  }

  return { reply, toolCalls };
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
      const conv = await conversationService.createConversation(userId, title);
      convId = conv.id;
    } else {
      const existing = await conversationService.getConversation(convId);
      if (!existing) {
        throw new Error('Conversation not found');
      }
      if (existing.userId !== userId) {
        throw new Error('Conversation does not belong to user');
      }
    }

    // Save user message (manual persistence — agent has no checkpointer/memory,
    // so it does NOT auto-persist messages; this is the sole write path)
    await conversationService.addMessage(convId, 'user', message);

    // Build message history for agent using MongoChatMessageHistory
    // (includes the user message just saved above)
    const db = await getDatabase();
    const messageRepo = new MessageRepository(db);
    const chatHistory = new MongoChatMessageHistory(convId, messageRepo);
    const langchainMessages = await chatHistory.getMessages();

    // Call agent
    const agentResult = await callAgent(langchainMessages, accessToken);

    // Save assistant reply (manual persistence — no duplication since agent
    // has no checkpointer and does not auto-persist)
    try {
      await conversationService.addMessage(convId, 'assistant', agentResult.reply);
    } catch (err) {
      console.error('Failed to persist assistant reply:', err);
    }

    // Check for mutating tool calls → create PendingActions for all chained mutations
    const response: ChatResponse = {
      reply: agentResult.reply,
      conversationId: convId,
    };

    const pendingActions: import('../types').PendingAction[] = [];
    for (const tc of agentResult.toolCalls) {
      const actionType = MUTATING_ACTIONS[tc.name];
      if (actionType) {
        const action = actionService.createAction(
          userId,
          convId,
          actionType,
          tc.params as any,
          tc.description
        );
        pendingActions.push(action);
      }
    }

    if (pendingActions.length > 0) {
      // Backwards compat: keep singular field for single actions
      response.pendingAction = pendingActions[0];
      response.pendingActions = pendingActions;
    }

    return response;
  }
}

export const chatService = new ChatService();
