import type { ModelCapability as HumanModelCapability } from '#human/llm-requester/capability';
import type { DefaultHeadersResolver, ProtocolEndpoint } from '#human/llm-requester/connection';
import type { LlmErrorClassifier } from '#human/llm-requester/requester';
import type { LlmRequester } from '#human/llm/requester';
import type { Protocol } from '../protocol/protocol';
import type { ModelSource } from './provider';
export interface ProviderDefinition<N extends Protocol = Protocol> {
    readonly id: string;
    readonly baseProtocol: N;
    readonly requester?: LlmRequester<'protocol'>;
    readonly thinkingDriven?: boolean;
    readonly strictThinkingValidation?: boolean;
    readonly classifyError?: LlmErrorClassifier;
    readonly capability?: (modelName: string) => HumanModelCapability | undefined;
    readonly endpoint?: ProtocolEndpoint;
    readonly endpoints?: readonly ProtocolEndpoint[];
    readonly defaultHeaders?: DefaultHeadersResolver;
    readonly hostHeaders?: 'full' | 'user-agent';
    readonly modelSource?: ModelSource;
}
export declare function registerProviderDefinition<N extends Protocol>(definition: ProviderDefinition<N>): void;
export declare function getProviderDefinition(id: string, protocol?: Protocol): ProviderDefinition | undefined;
export declare function getProviderDefinitions(id: string): readonly ProviderDefinition[];
export declare function hasProviderDefinition(id: string): boolean;
export declare function isOAuthCatalogVendor(id: string | undefined): boolean;
export declare function listProviderDefinitions(): readonly ProviderDefinition[];
export interface ResolvedProviderEndpoint {
    readonly apiKey?: string;
    readonly baseUrl?: string;
}
export interface ExplainedProviderEndpoint {
    readonly apiKey?: string;
    readonly apiKeyEnvName?: string;
    readonly baseUrl?: string;
    readonly baseUrlEnvName?: string;
    readonly baseUrlIsDefault?: boolean;
}
export declare function explainProviderEndpoint(providerType: string, env?: Readonly<Record<string, string | undefined>>): ExplainedProviderEndpoint;
export declare function resolveProviderEndpoint(providerType: string, env?: Readonly<Record<string, string | undefined>>): ResolvedProviderEndpoint;
