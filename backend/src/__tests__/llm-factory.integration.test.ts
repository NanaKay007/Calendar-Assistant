import { HumanMessage } from '@langchain/core/messages';
import { createLLM } from '../agent/llm';

/**
 * Real integration tests for createLLM.
 * These make actual API calls to Gemini and Claude — requires valid API keys
 * in .env.dev.local (GOOGLE_GEMINI_API_KEY, ANTHROPIC_API_KEY).
 */

describe('LLM Factory - Integration', () => {
  it('should create a Gemini LLM that responds to a prompt', async () => {
    const llm = createLLM('gemini');
    const response = await llm.invoke([new HumanMessage('Say hello in one word.')]);
    expect(response.content).toBeTruthy();
    expect(typeof response.content).toBe('string');
  }, 30_000);

  it('should create a Claude LLM that responds to a prompt', async () => {
    const llm = createLLM('claude');
    const response = await llm.invoke([new HumanMessage('Say hello in one word.')]);
    expect(response.content).toBeTruthy();
    expect(typeof response.content).toBe('string');
  }, 30_000);

  it('should use default provider config when no override is given', async () => {
    const llm = createLLM();
    const response = await llm.invoke([new HumanMessage('Say hello in one word.')]);
    expect(response.content).toBeTruthy();
  }, 30_000);

  it('should respect providerOverride over env LLM_PROVIDER', async () => {
    const originalProvider = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = 'gemini';

    // providerOverride='claude' should take precedence over env
    const llm = createLLM('claude');
    const response = await llm.invoke([new HumanMessage('Say hello in one word.')]);
    expect(response.content).toBeTruthy();

    process.env.LLM_PROVIDER = originalProvider;
  }, 30_000);
});
