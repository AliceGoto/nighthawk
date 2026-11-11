import type { Message, ToolDescription as LLMTool } from '#human/llm/message';
declare const IS_GENERATE_INPUT_SNAPSHOT: unique symbol;
declare const IS_GENERATE_INPUTS_SNAPSHOT: unique symbol;
export declare const DEFAULT_TEST_SYSTEM_PROMPT = "You are a deterministic test agent.";
export interface RpcSnapshotEntry {
    readonly type: '[rpc]';
    readonly event: string;
    readonly args: unknown;
}
export interface WireSnapshotEntry {
    readonly type: '[wire]';
    readonly event: string;
    readonly args: unknown;
}
export type EventSnapshotEntry = WireSnapshotEntry | RpcSnapshotEntry;
export interface GenerateCall {
    readonly systemPrompt: string;
    readonly tools: Array<Pick<LLMTool, 'name' | 'description' | 'parameters'>>;
    readonly history: Message[];
}
export type EventSnapshot = ReturnType<typeof eventSnapshot>;
export interface GenerateInputSnapshot {
    readonly [IS_GENERATE_INPUT_SNAPSHOT]: true;
    readonly input: GenerateCall;
    readonly previous: GenerateCall | undefined;
}
export interface GenerateInputsSnapshot {
    readonly [IS_GENERATE_INPUTS_SNAPSHOT]: true;
    readonly inputs: readonly GenerateCall[];
    readonly previous: GenerateCall | undefined;
}
export declare function eventSnapshot(events: readonly EventSnapshotEntry[], labels: SnapshotLabels): unknown[];
interface SnapshotLabels {
    readonly uuidLabels: Map<string, string>;
    readonly msgLabels: Map<string, string>;
    readonly interactionLabels: Map<string, string>;
}
export declare function createEventSnapshotter(): (events: readonly EventSnapshotEntry[]) => EventSnapshot;
export declare function generateInputSnapshot(input: GenerateCall, previous: GenerateCall | undefined): GenerateInputSnapshot;
export declare function generateInputsSnapshot(inputs: readonly GenerateCall[], previous: GenerateCall | undefined): GenerateInputsSnapshot;
export declare function normalizeGenerateInput(input: GenerateCall): GenerateCall;
export type GenerateCallPrefixBreak = {
    readonly at: 'systemPrompt';
    readonly previous: string;
    readonly next: string;
} | {
    readonly at: 'tools' | 'history';
    readonly index: number;
    readonly previous: unknown;
    readonly next: unknown;
};
export declare function findGenerateCallPrefixBreak(previous: GenerateCall, next: GenerateCall): GenerateCallPrefixBreak | undefined;
export {};
