import type { LlmEndpoint } from '#/llm/request';
export interface ResolvedEndpoint {
    readonly baseUrl?: string;
    readonly apiKey?: string;
    readonly headers?: Record<string, string>;
    readonly fetch?: typeof fetch;
}
export declare function headerValue(headers: Readonly<Record<string, string>>, name: string): string | undefined;
export declare function mergeHeaders(...sources: readonly (Record<string, string> | undefined)[]): Record<string, string> | undefined;
export declare function resolveEndpoint(endpoint: LlmEndpoint | undefined): Promise<ResolvedEndpoint>;
