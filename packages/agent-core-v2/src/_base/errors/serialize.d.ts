import type { ErrorCode } from '#/errors';
import { Error2 } from './errors';
export interface ErrorPayload {
    readonly code: ErrorCode;
    readonly message: string;
    readonly name?: string;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly retryable: boolean;
    readonly cause?: ErrorPayload;
}
export type NightHawkErrorPayload = ErrorPayload;
export interface CodedErrorShape {
    readonly code: ErrorCode;
    readonly message: string;
    readonly name?: string;
    readonly details?: Readonly<Record<string, unknown>>;
    readonly retryable?: boolean;
}
export declare function isCodedError(error: unknown): error is CodedErrorShape;
export declare function makeErrorPayload(code: ErrorCode, message: string, options?: {
    readonly details?: Readonly<Record<string, unknown>>;
    readonly name?: string;
}): ErrorPayload;
export declare function toErrorPayload(error: unknown): ErrorPayload;
export declare const toNightHawkErrorPayload: typeof toErrorPayload;
export declare function fromErrorPayload(payload: ErrorPayload): Error2;
