describe('LLM Factory - Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should return ChatAnthropic when provider is claude', async () => {
    process.env.LLM_PROVIDER = 'claude';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const { createLLM } = await import('../agent/llm');
    const { ChatAnthropic } = await import('@langchain/anthropic');
    const llm = createLLM();
    expect(llm).toBeInstanceOf(ChatAnthropic);
  });

  it('should throw when provider is claude but no API key is set', async () => {
    process.env.LLM_PROVIDER = 'claude';
    process.env.ANTHROPIC_API_KEY = '';
    const { createLLM } = await import('../agent/llm');
    expect(() => createLLM()).toThrow('ANTHROPIC_API_KEY is required');
  });

  it('should return ChatGoogleGenerativeAI when provider is gemini', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    const { createLLM } = await import('../agent/llm');
    const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
    const llm = createLLM();
    expect(llm).toBeInstanceOf(ChatGoogleGenerativeAI);
  });
});
