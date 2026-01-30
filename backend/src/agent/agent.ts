import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import {
  createListCalendarsTool,
  createListEventsTool,
  createCreateEventTool,
  createUpdateEventTool,
  createDeleteEventTool,
} from './tools';

const SYSTEM_PROMPT = `You are a helpful Google Calendar assistant. You help users manage their calendar events.

When the user asks to view calendars or events, use the appropriate list tools.
When the user asks to create, update, or delete events, use the corresponding tools. These mutating operations will require user approval before being executed.

Always confirm what you're about to do before taking action. Be concise and helpful.`;

export async function createCalendarAgent(accessToken: string) {
  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-1.5-flash',
  });

  const tools = [
    createListCalendarsTool(accessToken),
    createListEventsTool(accessToken),
    createCreateEventTool(),
    createUpdateEventTool(),
    createDeleteEventTool(),
  ];

  const agent = createReactAgent({
    llm,
    tools,
    prompt: SYSTEM_PROMPT,
  });

  return agent;
}
