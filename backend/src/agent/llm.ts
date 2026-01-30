import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';
import { config } from '../config/env';

/**
 * Creates the appropriate LLM instance based on the LLM_PROVIDER env variable.
 * Defaults to Gemini if no provider is specified.
 */
export function createLLM(): BaseChatModel {
  const provider = config.llm.provider;

  if (provider === 'claude') {
    if (!config.anthropic.apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required when LLM_PROVIDER is set to "claude"'
      );
    }
    return new ChatAnthropic({
      model: config.anthropic.model,
      apiKey: config.anthropic.apiKey,
    });
  }

  return new ChatGoogleGenerativeAI({
    model: 'gemini-3-flash-preview',
    apiKey: config.google.geminiApiKey,
  });
}
