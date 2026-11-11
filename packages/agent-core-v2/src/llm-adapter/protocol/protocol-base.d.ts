import type { Protocol as CoreProtocol } from '#human/llm/protocol/protocol';
import type { Protocol } from './protocol';
export type ProtocolBaseId = Protocol;
export interface ProtocolBaseDefinition {
    readonly id: ProtocolBaseId;
    readonly capability?: CoreProtocol['capability'];
}
export interface ResolvedAdapterIdentity {
    readonly baseId: ProtocolBaseId;
    readonly thinkingDriven?: boolean;
    readonly strictThinkingValidation?: boolean;
}
export declare function getProtocolBase(id: ProtocolBaseId): ProtocolBaseDefinition | undefined;
export declare function listProtocolBases(): readonly ProtocolBaseDefinition[];
