import type { ChatMessage, PendingAction } from '../types';

// Mock chat service that simulates agent responses
class ChatService {
  private messages: ChatMessage[] = [];
  private pendingActions: PendingAction[] = [];

  async sendMessage(content: string): Promise<{ message: ChatMessage; pendingAction?: PendingAction }> {
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    this.messages.push(userMessage);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock agent response
    const { response, action } = this.generateMockResponse(content);

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    };

    this.messages.push(assistantMessage);

    if (action) {
      this.pendingActions.push(action);
    }

    return { message: assistantMessage, pendingAction: action };
  }

  private generateMockResponse(userInput: string): { response: string; action?: PendingAction } {
    const input = userInput.toLowerCase();

    // Mock responses based on keywords
    if (input.includes('schedule') || input.includes('create') || input.includes('meeting')) {
      const action: PendingAction = {
        id: `action_${Date.now()}`,
        type: 'create_event',
        description: 'Create a new meeting event',
        details: {
          title: 'New Meeting',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          calendarId: 'cal_1',
        },
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      return {
        response: 'I can help you schedule that meeting. I\'ve prepared the event details. Please review and approve the action.',
        action,
      };
    }

    if (input.includes('delete') || input.includes('cancel')) {
      const action: PendingAction = {
        id: `action_${Date.now()}`,
        type: 'delete_event',
        description: 'Delete an event',
        details: {
          eventId: 'event_1',
          calendarId: 'cal_1',
        },
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      return {
        response: 'I can help you cancel that event. Please approve this action to proceed.',
        action,
      };
    }

    if (input.includes('update') || input.includes('change') || input.includes('reschedule')) {
      const action: PendingAction = {
        id: `action_${Date.now()}`,
        type: 'update_event',
        description: 'Update event details',
        details: {
          eventId: 'event_1',
          calendarId: 'cal_1',
          updates: {
            startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      return {
        response: 'I can help you reschedule that event. Please review the proposed changes and approve.',
        action,
      };
    }

    if (input.includes('what') || input.includes('when') || input.includes('show')) {
      return {
        response: 'Based on your calendars, you have several upcoming events. Your next meeting is the Team Standup tomorrow. Would you like me to provide more details or help you manage any events?',
      };
    }

    return {
      response: 'I\'m your calendar assistant. I can help you view, create, update, or delete calendar events. What would you like to do?',
    };
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getPendingActions(): PendingAction[] {
    return this.pendingActions.filter(a => a.status === 'pending');
  }

  async approveAction(actionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800));

    const action = this.pendingActions.find(a => a.id === actionId);
    if (action) {
      action.status = 'approved';
      // In a real app, this would trigger the actual calendar operation
    }
  }

  async rejectAction(actionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));

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
