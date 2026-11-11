import type { Message } from '#/llm-adapter/contract/message';
import type { ContextMessageTiming, PromptOrigin } from '#/agent/contextMemory/types';
import type { ToolInputDisplay } from '#/tool/toolInputDisplay';
import type { TokenUsage } from '#human/llm-requester/usage';
export type PersistentContextMessage = Message & {
    readonly id?: string;
    readonly providerMessageId?: string;
    readonly origin?: PromptOrigin | undefined;
    readonly isError?: boolean;
    readonly toolCallDisplays?: Record<string, ToolInputDisplay>;
    readonly note?: string;
    readonly usage?: TokenUsage;
    readonly llmTiming?: ContextMessageTiming;
    readonly durationMs?: number;
};
export declare const AGENT_WIRE_RECORD_KEY = "wire.jsonl";
export type PartsTransformer = (parts: readonly unknown[]) => Promise<readonly unknown[]>;
export type RecordDehydrator = (record: WireRecord, transform: PartsTransformer) => WireRecord | Promise<WireRecord>;
export interface WireLineRange {
    readonly start: number;
    readonly end: number;
}
export interface WireRecord {
    readonly type: string;
    readonly time?: number;
    readonly [key: string]: unknown;
}
export interface WireMetadataRecord extends WireRecord {
    readonly type: 'metadata';
    readonly protocol_version: string;
    readonly created_at: number;
}
export declare function isWireRecord(record: unknown): record is WireRecord;
export declare function createWireMetadataRecord(now?: number): WireMetadataRecord;
export declare function isWireMetadataRecord(record: WireRecord): record is WireMetadataRecord;
