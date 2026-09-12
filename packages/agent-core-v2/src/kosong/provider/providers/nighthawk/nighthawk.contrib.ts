import type { ContentPart } from '#/kosong/contract/message';
import type { Tool } from '#/kosong/contract/tool';
import type {
  ProtocolEndpoint,
  ProtocolTrait,
  TraitContext,
} from '#/kosong/protocol/protocolTrait';

import { DEFAULT_NIGHTHAWK_BASE_URL } from '@nighthawk/nighthawk-oauth';

import { type OpenAIToolParam, toolToOpenAI } from '../../bases/openai/openai-common';
import { registerProviderDefinition } from '../../providerDefinition';
import { classifyNighthawkQuotaError } from './nighthawk-errors';
import { NighthawkFiles } from './nighthawk-files';
import { normalizeNighthawkToolSchema } from './nighthawk-schema';

export const NIGHTHAWK_API_KEY_ENV = 'NIGHTHAWK_API_KEY';
export const NIGHTHAWK_BASE_URL_ENV = 'NIGHTHAWK_BASE_URL';
export { DEFAULT_NIGHTHAWK_BASE_URL as NIGHTHAWK_DEFAULT_BASE_URL };

const INTERLEAVED_THINKING_BETA = 'interleaved-thinking-2025-05-14';

export interface GenerationKwargs {
  max_tokens?: number | undefined;
  max_completion_tokens?: number | undefined;
  temperature?: number | undefined;
  top_p?: number | undefined;
  n?: number | undefined;
  presence_penalty?: number | undefined;
  frequency_penalty?: number | undefined;
  stop?: string | string[] | undefined;
  prompt_cache_key?: string | undefined;
  extra_body?: ExtraBody;
}

export interface NighthawkThinkingConfig {
  type?: 'enabled' | 'disabled';
  effort?: string;
  keep?: unknown;
  [key: string]: unknown;
}

export interface ExtraBody {
  thinking?: NighthawkThinkingConfig;
  [key: string]: unknown;
}

export function convertNighthawkTool(tool: Tool): OpenAIToolParam {
  if (tool.name.startsWith('$')) {
    return {
      type: 'builtin_function',
      function: { name: tool.name },
    };
  }
  const converted = toolToOpenAI(tool);
  return {
    ...converted,
    function: {
      ...converted.function,
      parameters: normalizeNighthawkToolSchema(tool.parameters),
    },
  };
}

function isEffectivelyEmptyContent(parts: ContentPart[]): boolean {
  for (const part of parts) {
    if (part.type !== 'text') return false;
    if (part.text.trim() !== '') return false;
  }
  return true;
}

const filesByContext = new WeakMap<TraitContext, NighthawkFiles>();

function firstEnv(...names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value.length > 0) return value;
  }
  return undefined;
}

function resolveFiles(ctx: TraitContext): NighthawkFiles {
  let files = filesByContext.get(ctx);
  if (files === undefined) {
    files = new NighthawkFiles({
      apiKey: ctx.config.apiKey ?? firstEnv(NIGHTHAWK_API_KEY_ENV),
      baseUrl: ctx.config.baseUrl ?? firstEnv(NIGHTHAWK_BASE_URL_ENV) ?? DEFAULT_NIGHTHAWK_BASE_URL,
      defaultHeaders:
        ctx.config.defaultHeaders === undefined ? undefined : { ...ctx.config.defaultHeaders },
    });
    filesByContext.set(ctx, files);
  }
  return files;
}

export const nighthawkOpenAITrait: ProtocolTrait = {
  strictThinkingValidation: true,

  endpoint: () => ({
    apiKeyEnv: NIGHTHAWK_API_KEY_ENV,
    baseUrlEnv: NIGHTHAWK_BASE_URL_ENV,
    defaultBaseUrl: DEFAULT_NIGHTHAWK_BASE_URL,
  }),

  convertError: (error) => classifyNighthawkQuotaError(error),

  cacheKey: (key) => ({ prompt_cache_key: key }),

  withThinking: (effort, options, generationKwargs) => {
    const thinking: NighthawkThinkingConfig =
      effort === 'off'
        ? { type: 'disabled' }
        : { type: 'enabled' };
    if (effort !== 'off' && effort !== 'on' && effort.length > 0) {
      thinking.effort = effort;
    }
    if (options.keep !== undefined) {
      thinking.keep = options.keep;
    }
    const extraBody = generationKwargs['extra_body'] as ExtraBody | undefined;
    return { extra_body: { ...extraBody, thinking } };
  },

  preserveThinking: (generationKwargs) => {
    const extraBody = generationKwargs['extra_body'] as ExtraBody | undefined;
    const thinking = extraBody?.thinking;
    if (thinking?.keep === 'all' && thinking.type !== 'disabled') {
      return true;
    }
    return undefined;
  },

  withMaxCompletionTokens: (maxCompletionTokens) => ({
    max_completion_tokens: Math.min(maxCompletionTokens, 131072),
  }),

  buildParams: (params) => {
    const {
      extra_body: extraBody,
      max_tokens: maxTokens,
      max_completion_tokens: maxCompletionTokens,
      ...rest
    } = params;
    const out: Record<string, unknown> = { ...rest };
    delete out['prompt_cache_key'];
    const resolvedMaxCompletionTokens = maxCompletionTokens ?? maxTokens;
    if (resolvedMaxCompletionTokens !== undefined) {
      out['max_completion_tokens'] = resolvedMaxCompletionTokens;
    }
    if (extraBody !== undefined && extraBody !== null) {
      const typedExtraBody = extraBody as ExtraBody;
      const { thinking, ...restExtra } = typedExtraBody;
      Object.assign(out, restExtra);
      if (thinking !== undefined && thinking !== null) {
        const { effort, keep, ...restThinking } = thinking as NighthawkThinkingConfig;
        if (effort !== undefined) {
          out['reasoning_effort'] = effort;
        }
        if (keep !== undefined) {
          out['thinking'] = { ...restThinking, keep };
        }
      }
    }
    return out;
  },

  convertTool: (tool) => convertNighthawkTool(tool),

  convertMessage: (message, converted) => {
    if (message.role === 'assistant' && message.toolCalls.length > 0) {
      const nonThinkParts = message.content.filter((part) => part.type !== 'think');
      if (isEffectivelyEmptyContent(nonThinkParts)) {
        delete converted['content'];
      }
    }

    const convertedToolCalls = converted['tool_calls'];
    if (Array.isArray(convertedToolCalls)) {
      message.toolCalls.forEach((toolCall, index) => {
        if (toolCall.extras === undefined) return;
        const out = convertedToolCalls[index] as Record<string, unknown> | undefined;
        if (out !== undefined) {
          out['extras'] = toolCall.extras;
        }
      });
    }

    if (message.tools !== undefined && message.tools.length > 0) {
      converted['tools'] = message.tools.map((tool) => convertNighthawkTool(tool));
    }

    return converted;
  },

  extractUsage: (chunk) => {
    const topLevel = chunk['usage'];
    if (topLevel !== null && topLevel !== undefined && typeof topLevel === 'object') {
      return topLevel as Record<string, unknown>;
    }
    const choices = chunk['choices'];
    if (!Array.isArray(choices) || choices.length === 0) {
      return undefined;
    }
    const firstChoice = choices[0] as Record<string, unknown> | undefined;
    const choiceUsage = firstChoice?.['usage'];
    if (choiceUsage !== null && choiceUsage !== undefined && typeof choiceUsage === 'object') {
      return choiceUsage as Record<string, unknown>;
    }
    return undefined;
  },

  uploadVideo: (input, options, ctx) => resolveFiles(ctx).uploadVideo(input, options),
};

export const nighthawkAnthropicTrait: ProtocolTrait = {
  convertError: (error) => classifyNighthawkQuotaError(error),

  withThinking: (effort, _options, generationKwargs) => {
    const seeded = generationKwargs['betaFeatures'];
    const betaFeatures = (Array.isArray(seeded) ? (seeded as string[]) : []).filter(
      (beta) => beta !== INTERLEAVED_THINKING_BETA,
    );
    if (effort === 'off') {
      return {
        thinking: { type: 'disabled' },
        output_config: undefined,
        betaFeatures,
      };
    }
    return {
      thinking: { type: 'enabled' },
      output_config: effort === 'on' ? undefined : { effort },
      betaFeatures,
    };
  },
};

const nighthawkEndpoint: ProtocolEndpoint = {
  apiKeyEnv: NIGHTHAWK_API_KEY_ENV,
  baseUrlEnv: NIGHTHAWK_BASE_URL_ENV,
  defaultBaseUrl: DEFAULT_NIGHTHAWK_BASE_URL,
};

registerProviderDefinition({
  id: 'nighthawk',
  baseProtocol: 'openai',
  traits: [nighthawkOpenAITrait],
  endpoint: nighthawkEndpoint,
  hostHeaders: 'full',
  modelSource: 'oauth-catalog',
});

registerProviderDefinition({
  id: 'nighthawk',
  baseProtocol: 'anthropic',
  traits: [nighthawkAnthropicTrait],
  endpoint: nighthawkEndpoint,
  hostHeaders: 'full',
  modelSource: 'oauth-catalog',
});
