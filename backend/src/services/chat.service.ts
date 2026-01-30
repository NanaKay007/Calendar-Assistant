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
  toolCall?: { name: string; params: Record<string, any>; description: string };
}> {
  const agent = await createCalendarAgent(accessToken);

  const result = await agent.invoke({ messages: langchainMessages });

  // Extract final AI reply
  const lastMessage = result.messages[result.messages.length - 1];
  const reply = typeof lastMessage.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);

  // Scan tool messages for pendingAction
  let toolCall: { name: string; params: Record<string, any>; description: string } | undefined;

  for (const msg of result.messages) {
    if (typeof (msg as any)._getType === 'function' && (msg as any)._getType() === 'tool') {
      try {
        const parsed = JSON.parse(typeof msg.content === 'string' ? msg.content : '');
        if (parsed.pendingAction === true) {
          toolCall = {
            name: parsed.actionType,
            params: parsed.payload,
            description: `${parsed.actionType}: ${JSON.stringify(parsed.payload)}`,
          };
          break;
        }
      } catch {
        // Not JSON or no pendingAction — skip
      }
    }
  }

  return { reply, toolCall };
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
    await conversationService.addMessage(convId, 'assistant', agentResult.reply);

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
