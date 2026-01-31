import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { createLLM } from './llm';
import {
  createListCalendarsTool,
  createListEventsTool,
  createCreateEventTool,
  createUpdateEventTool,
  createDeleteEventTool,
  createGetCurrentDateTimeTool,
  createSearchEventsTool,
  createGetFreeBusyTool,
} from './tools';

const SYSTEM_PROMPT = `You are a helpful Google Calendar assistant. You help users manage their calendar events.

You have access to the current date and time — always use the get_current_datetime tool first when the user refers to relative times like "today", "tomorrow", "this afternoon", "next week", etc.

You can search for events by keyword using the search_events tool, and check availability using the get_free_busy tool before suggesting meeting times.

When the user asks to view calendars or events, use the appropriate list tools.
When the user asks to create, update, or delete events, use the corresponding tools. These mutating operations will require user approval before being executed.

Always confirm what you're about to do before taking action. Be concise and helpful.`;

export async function createCalendarAgent(accessToken: string) {
  const llm = createLLM();

  const tools = [
    createGetCurrentDateTimeTool(),
    createListCalendarsTool(accessToken),
    createListEventsTool(accessToken),
    createSearchEventsTool(accessToken),
    createGetFreeBusyTool(accessToken),
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
