import { type Protocol } from '../protocol/protocol';
import type { ProviderConfig } from '../provider/provider';
import type { ModelRecord } from './model';
import type { ResolvedModelAuthMaterial } from './model.types';
export declare function resolveModelAuthMaterial(args: {
    readonly modelId: string;
    readonly model: ModelRecord;
    readonly provider: ProviderConfig | undefined;
    readonly providerName: string;
}): ResolvedModelAuthMaterial;
export declare function effectiveModelConfig(model: ModelRecord, providerType?: string): ModelRecord;
export declare function withAnthropicProfile(model: ModelRecord, providerType?: string): ModelRecord;
export declare function deriveProviderId(baseUrl: string): string;
export declare function providerNameFromFlatModel(model: ModelRecord): string | undefined;
export declare function resolveModelProtocol(model: ModelRecord, provider: ProviderConfig | undefined): Protocol | undefined;
export declare function resolveEndpointBaseUrl(model: ModelRecord, provider: ProviderConfig): string | undefined;
export type ModelReadyFailureReason = 'no-default' | 'dangling-alias' | 'provider-missing' | 'unresolvable';
export type ModelReadyResolution = {
    readonly resolved: true;
} | {
    readonly resolved: false;
    readonly reason: ModelReadyFailureReason;
};
export declare function resolveModelForReady(modelId: string | undefined, models: Readonly<Record<string, ModelRecord>>, providers: Readonly<Record<string, ProviderConfig>>, defaultProvider?: string): ModelReadyResolution;
export declare function nonEmpty(value: string | undefined): string | undefined;
