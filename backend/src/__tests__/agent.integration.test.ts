import { createCalendarAgent } from '../agent';
import { getTestTokens } from './setup';
import { HumanMessage } from '@langchain/core/messages';

describe('Agent - Integration', () => {
  let accessToken: string;

  beforeAll(async () => {
    const tokens = await getTestTokens();
    accessToken = tokens.access_token;
  });

  it('should create a valid agent', async () => {
    const agent = await createCalendarAgent(accessToken);
    expect(agent).toBeDefined();
  });

  it('should communicate with the LLM and return a response', async () => {
    const agent = await createCalendarAgent(accessToken);

    const result = await agent.invoke({
      messages: [new HumanMessage('What can you help me with?')],
    });

    const lastMessage = result.messages[result.messages.length - 1];
    expect(typeof lastMessage.content).toBe('string');
    expect((lastMessage.content as string).length).toBeGreaterThan(0);
  });

  it('should invoke the list_calendars tool when asked to list calendars', async () => {
    const agent = await createCalendarAgent(accessToken);

    const result = await agent.invoke({
      messages: [new HumanMessage('List my calendars')],
    });

    // The agent should have invoked the tool and returned calendar data
    const lastMessage = result.messages[result.messages.length - 1];
    const content = lastMessage.content as string;

    expect(content.length).toBeGreaterThan(0);

    // Verify a tool call happened by checking intermediate messages for tool usage
    const toolMessages = result.messages.filter(
      (m: any) => m._getType?.() === 'tool'
    );
    expect(toolMessages.length).toBeGreaterThan(0);
  });
});
