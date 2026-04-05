export type Platform = 'OpenClaw' | 'Claude' | 'Antigravity' | 'Generic' | 'Custom';

export interface Skill {
  id: string;
  name: string;
  description: string;
  source: 'clawhub' | 'skills.sh' | 'github' | 'google' | 'user-url';
  sourceUrl: string;
  platform: Platform | 'unknown';
  tags: string[];
  inputs?: string;
  outputs?: string;
  tools?: string[];
  installationInstructions?: string;
  popularity?: number; // downloads, stars, etc.
  rawContent?: string;
  relevanceScore?: number;
  selected?: boolean;
}

export type AIProvider = 'Google' | 'OpenAI' | 'Anthropic' | 'OpenRouter' | 'Ollama' | 'HuggingFace' | 'Custom';

export interface AppSettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string; // For Ollama or Custom providers
  discoveryModel: string;
  synthesisModel: string;
  useGoogleSearch: boolean;
  useUrlContext: boolean;
  skillLimit: number;
  firecrawlToken?: string;
}

export interface GeneratedSkill {
  definition: string;
  instructions: string;
  setupInstructions: string;
  summary: string;
  sources: Skill[];
}
