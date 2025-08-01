export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'gemini';
}

export const availableModels: ModelInfo[] = [
  // OpenAI Models (Latest 2025)
  {
    id: 'o3',
    name: 'o3',
    description: 'Our most powerful reasoning model',
    provider: 'openai',
  },
  {
    id: 'o3-pro',
    name: 'o3 Pro',
    description: 'Version of o3 with more compute for better responses',
    provider: 'openai',
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    description: 'A small model alternative to o3',
    provider: 'openai',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Flagship GPT model for complex tasks',
    provider: 'openai',
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    description: 'Balanced for intelligence, speed, and cost',
    provider: 'openai',
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    description: 'Fastest, most cost-effective GPT-4.1 model',
    provider: 'openai',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Fast, intelligent, flexible GPT model',
    provider: 'openai',
  },
  {
    id: 'chatgpt-4o',
    name: 'ChatGPT-4o',
    description: 'GPT-4o model used in ChatGPT',
    provider: 'openai',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Fast, affordable small model for focused tasks',
    provider: 'openai',
  },
  {
    id: 'o4-mini',
    name: 'o4 Mini',
    description: 'Faster, more affordable reasoning model',
    provider: 'openai',
  },

  // Google Gemini Models (Latest 2025)
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Most advanced Gemini model with enhanced reasoning',
    provider: 'gemini',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient multimodal model',
    provider: 'gemini',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Lightweight version optimized for speed and cost',
    provider: 'gemini',
  },
];

export const defaultModelId = 'gemini-2.5-flash';
