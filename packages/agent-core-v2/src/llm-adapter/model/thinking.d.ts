import type { ThinkingEffort } from '#human/llm-requester/thinking';
import type { IProtocolAdapterRegistry, Protocol } from '../protocol/protocol';
import type { ModelThinkingMetadata, ThinkingDefaults } from './model.types';
export interface ThinkingConfig {
    enabled?: boolean;
    effort?: string;
    forcedEffort?: string;
    keep?: string;
}
export { resolveThinkingKeep } from '#human/llm-requester/thinking';
export declare function drivesThinkingThroughTraits(providerType: string | undefined): boolean;
export declare function usesTraitDrivenThinking(registry: IProtocolAdapterRegistry, protocol: Protocol, providerType?: string): boolean;
export declare function requiresStrictThinkingValidation(registry: IProtocolAdapterRegistry, protocol: Protocol, providerType?: string): boolean;
export declare function wireHasProtocolThinkingDisable(protocol: string | undefined): boolean;
export declare function normalizeRequestedThinkingEffort(requested: string | undefined): ThinkingEffort | undefined;
export declare function resolveForcedThinkingEffort(forced: string | undefined, effective: ThinkingEffort, traitDriven: boolean): ThinkingEffort | undefined;
export declare function modelSupportsThinking(model: ModelThinkingMetadata | undefined): boolean;
export declare function defaultThinkingEffortForModel(model: ModelThinkingMetadata | undefined): ThinkingEffort;
export declare function declaredDefaultEffortForModel(model: ModelThinkingMetadata | undefined): ThinkingEffort | undefined;
export declare function modelSupportsThinkingEffort(effort: ThinkingEffort, model: ModelThinkingMetadata | undefined, strictValidation: boolean): boolean;
export declare function resolveThinkingEffortForModel(requested: string | undefined, defaults: ThinkingDefaults | undefined, model: ModelThinkingMetadata | undefined, strictValidation?: boolean): ThinkingEffort;
