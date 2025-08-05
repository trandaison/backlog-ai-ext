/**
 * AI Model related type definitions
 */

export type ModelProvider = 'openai' | 'gemini';

export type ModelInfo = {
  id: string;
  name: string;
  description: string;
  provider: ModelProvider;
};
