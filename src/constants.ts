import { Platform, AIProvider } from './types';

export const PLATFORMS: Platform[] = ['OpenClaw', 'Claude', 'Antigravity', 'Generic', 'Custom'];

export const PROVIDERS: AIProvider[] = ['Google', 'OpenAI', 'Anthropic', 'OpenRouter', 'Ollama', 'HuggingFace', 'Custom'];

export const DEFAULT_MODELS: Record<AIProvider, { discovery: string; synthesis: string }> = {
  Google: { discovery: 'gemini-3-flash-preview', synthesis: 'gemini-3-flash-preview' },
  OpenAI: { discovery: 'gpt-4o-mini', synthesis: 'gpt-4o' },
  Anthropic: { discovery: 'claude-3-haiku-20240307', synthesis: 'claude-3-5-sonnet-20240620' },
  OpenRouter: { discovery: 'deepseek/deepseek-v3.2', synthesis: 'deepseek/deepseek-v3.2' },
  Ollama: { discovery: 'llama3', synthesis: 'llama3' },
  HuggingFace: { discovery: 'mistralai/Mistral-7B-v0.1', synthesis: 'mistralai/Mistral-7B-v0.1' },
  Custom: { discovery: '', synthesis: '' }
};

export const API_ENDPOINTS = {
  OPENAI: "https://api.openai.com/v1/chat/completions",
  OPENROUTER: "https://openrouter.ai/api/v1/chat/completions",
  ANTHROPIC: "https://api.anthropic.com/v1/messages",
  OLLAMA_DEFAULT: "http://localhost:11434/api/chat",
  HUGGINGFACE_BASE: "https://api-inference.huggingface.co/models/"
};

export const APP_METADATA = {
  NAME: "SkillGod",
  DESCRIPTION: "The ultimate AI agent skill discovery and synthesis engine.",
  VERSION: "1.0.0",
  GITHUB_URL: "https://github.com/bhagesh-h",
  LINKEDIN_URL: "https://www.linkedin.com/in/bhagesh-hunakunti/"
};
