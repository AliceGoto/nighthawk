import { z } from 'zod';
import { type ServiceIdentifier } from '#/_base/di/instantiation';
import type { ModelCapability } from '../contract/capability';
import type { LlmCredentialProvider } from '#human/llm-requester/requester';
import type { Protocol, ProtocolProviderOptions } from '../protocol/protocol';
import type { ProviderConfig } from '../provider/provider';
import type { ModelRecord } from './model';
export interface Model {
    readonly id: string;
    readonly name: string;
    readonly aliases: readonly string[];
    readonly protocol: Protocol;
    readonly baseUrl?: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly capabilities: ModelCapability;
    readonly maxContextSize: number;
    readonly maxInputSize?: number;
    readonly maxOutputSize?: number;
    readonly displayName?: string;
    readonly reasoningKey?: string;
    readonly supportEfforts?: readonly string[];
    readonly defaultEffort?: string;
    readonly alwaysThinking: boolean;
    readonly adaptiveThinking?: boolean;
    readonly providerType?: string;
    readonly providerName: string;
    readonly credentialProvider?: LlmCredentialProvider;
    readonly providerOptions?: ProtocolProviderOptions;
}
export declare const modelCatalogItemSchema: z.ZodObject<{
    provider: z.ZodString;
    model: z.ZodString;
    display_name: z.ZodOptional<z.ZodString>;
    max_context_size: z.ZodNumber;
    capabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
    support_efforts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    default_effort: z.ZodOptional<z.ZodString>;
    upgrade: z.ZodOptional<z.ZodObject<{
        model: z.ZodString;
        migration_markdown: z.ZodString;
        retirement_at: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ModelCatalogItem = z.infer<typeof modelCatalogItemSchema>;
export declare const providerCatalogStatusSchema: z.ZodEnum<{
    connected: "connected";
    error: "error";
    unconfigured: "unconfigured";
}>;
export type ProviderCatalogStatus = z.infer<typeof providerCatalogStatusSchema>;
export declare const providerCatalogItemSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    base_url: z.ZodOptional<z.ZodString>;
    default_model: z.ZodOptional<z.ZodString>;
    api_key_env: z.ZodOptional<z.ZodString>;
    has_api_key: z.ZodBoolean;
    status: z.ZodEnum<{
        connected: "connected";
        error: "error";
        unconfigured: "unconfigured";
    }>;
    models: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type ProviderCatalogItem = z.infer<typeof providerCatalogItemSchema>;
export declare const setDefaultModelResponseSchema: z.ZodObject<{
    default_model: z.ZodString;
    model: z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodString;
        display_name: z.ZodOptional<z.ZodString>;
        max_context_size: z.ZodNumber;
        capabilities: z.ZodOptional<z.ZodArray<z.ZodString>>;
        support_efforts: z.ZodOptional<z.ZodArray<z.ZodString>>;
        default_effort: z.ZodOptional<z.ZodString>;
        upgrade: z.ZodOptional<z.ZodObject<{
            model: z.ZodString;
            migration_markdown: z.ZodString;
            retirement_at: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type SetDefaultModelResponse = z.infer<typeof setDefaultModelResponseSchema>;
export interface ProviderCredentialState {
    readonly hasApiKey: boolean;
    readonly hasOAuthToken: boolean;
    readonly hasCredentialConflict: boolean;
}
export declare function toProtocolModel(model: Model, record: ModelRecord, providerType?: string): ModelCatalogItem;
export declare function toProtocolModelFallback(modelId: string, record: ModelRecord, providerType?: string): ModelCatalogItem;
export declare function toProtocolProvider(providerId: string, provider: ProviderConfig, models: Readonly<Record<string, ModelRecord>>, globalDefaultModel: string | undefined, credential: ProviderCredentialState): ProviderCatalogItem;
export declare function modelIdsForProvider(models: Readonly<Record<string, ModelRecord>>, providerId: string): string[];
export declare function globalDefaultForProvider(models: Readonly<Record<string, ModelRecord>>, globalDefaultModel: string | undefined, providerId: string): string | undefined;
export interface IModelCatalog {
    readonly _serviceBrand: undefined;
    get(id: string): Model;
    findByName(name: string): readonly string[];
    listModels(): Promise<readonly ModelCatalogItem[]>;
    listProviders(): Promise<readonly ProviderCatalogItem[]>;
    getProvider(providerId: string): Promise<ProviderCatalogItem>;
    setDefaultModel(modelId: string): Promise<SetDefaultModelResponse>;
}
export declare const IModelCatalog: ServiceIdentifier<IModelCatalog>;
