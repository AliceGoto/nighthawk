import { OpenAIProvider } from './openai.js';

// NightHawk uses OpenAI-compatible API format
export class NighthawkProvider extends OpenAIProvider {
  override readonly name = 'nighthawk' as const;
  override readonly displayName = 'NightHawk';
  override readonly supportedModels = ['nighthawk-v1-auto','nighthawk-v1-8k','nighthawk-v1-32k','nighthawk-v1-128k','nighthawk-k3-free'];

  constructor(apiKey: string, baseUrl?: string, model?: string) {
    super(apiKey, baseUrl || 'https://api.moonshot.cn', model || 'nighthawk-v1-auto');
  }
}
