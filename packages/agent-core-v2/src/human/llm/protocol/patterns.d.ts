import type { Message } from '#/llm/message';
import type { Pattern } from './pattern';
export interface MergeUsersPolicy<T> {
    readonly isUser: (message: T) => boolean;
    readonly isToolResultOnly: (message: T) => boolean;
    readonly merge: (last: T, next: T) => T;
}
export declare function mergeConsecutiveUsers<T>(policy: MergeUsersPolicy<T>): Pattern<T>;
export declare const toolResultToPlainText: Pattern<Message>;
