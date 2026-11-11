import type { LlmModel } from '#/llm-requester/model';
export interface ConnectionContext {
    readonly model: LlmModel;
}
export interface ProtocolEndpoint {
    readonly apiKeyEnv?: string;
    readonly baseUrlEnv?: string;
    readonly defaultBaseUrl?: string;
}
export type ProtocolEndpointResolver = (ctx?: ConnectionContext) => ProtocolEndpoint | undefined;
export type ProtocolEndpointSource = ProtocolEndpoint | ProtocolEndpointResolver;
export type DefaultHeadersResolver = (ctx: ConnectionContext) => Record<string, string> | undefined;
export declare function resolveModelConnection(model: LlmModel, endpoint: ProtocolEndpointSource | undefined): LlmModel;
