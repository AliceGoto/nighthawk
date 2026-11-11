import type { LlmEndpoint } from '#/llm/request';
import { createRequester } from '#/llm/requester';

import { nighthawkAnthropicFiles, nighthawkFiles } from './files';
import {
  NIGHTHAWK_DEFAULT_BASE_URL,
  nighthawkAnthropicProtocol,
  nighthawkOpenAIProtocol,
  nighthawkResponsesProtocol,
} from './protocol';

export { classifyNightHawkQuotaError } from './errors';
export { NIGHTHAWK_DEFAULT_BASE_URL, nighthawkAnthropicProtocol, nighthawkOpenAIProtocol, nighthawkResponsesProtocol } from './protocol';

const nighthawkEndpoint: LlmEndpoint = {
  defaultBaseUrl: NIGHTHAWK_DEFAULT_BASE_URL,
  files: nighthawkFiles,
};

const nighthawkAnthropicEndpoint: LlmEndpoint = {
  defaultBaseUrl: NIGHTHAWK_DEFAULT_BASE_URL,
  files: nighthawkAnthropicFiles,
};

export const nighthawkRequester = createRequester().with({
  protocol: { base: nighthawkOpenAIProtocol },
  endpoint: nighthawkEndpoint,
});

export const nighthawkAnthropicRequester = createRequester().with({
  protocol: { base: nighthawkAnthropicProtocol, options: { betaApi: true } },
  endpoint: nighthawkAnthropicEndpoint,
});

export const nighthawkResponsesRequester = createRequester().with({
  protocol: { base: nighthawkResponsesProtocol },
  endpoint: nighthawkEndpoint,
});

export const nighthawkRequesters = {
  openai: nighthawkRequester,
  anthropic: nighthawkAnthropicRequester,
  openai_responses: nighthawkResponsesRequester,
} as const;
