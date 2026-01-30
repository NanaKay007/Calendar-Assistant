import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { MessageRepository } from '../database/repositories/messageRepository';

export class MongoChatMessageHistory extends BaseListChatMessageHistory {
  lc_namespace = ['langchain', 'stores', 'message', 'mongodb'];

  private conversationId: string;
  private messageRepo: MessageRepository;

  constructor(conversationId: string, messageRepo: MessageRepository) {
    super();
    this.conversationId = conversationId;
    this.messageRepo = messageRepo;
  }

  async getMessages(): Promise<BaseMessage[]> {
    const rows = await this.messageRepo.findByConversationId(this.conversationId);
    return rows
      .filter((row) => row.role !== 'tool')
      .map((row) => {
        if (row.role === 'user') {
          return new HumanMessage(row.content);
        } else {
          return new AIMessage(row.content);
        }
      });
  }

  async addMessage(message: BaseMessage): Promise<void> {
    const role = message._getType() === 'human' ? 'user' : 'assistant';
    await this.messageRepo.create({
      conversation_id: this.conversationId,
      role,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
    });
  }

  async addMessages(messages: BaseMessage[]): Promise<void> {
    for (const message of messages) {
      await this.addMessage(message);
    }
  }

  async clear(): Promise<void> {
    // No-op: we don't support clearing conversation history from MongoDB
  }
}
