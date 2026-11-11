import type { ErrorCode } from '#/errors';
export declare class ExpectedError extends Error {
    readonly isExpected = true;
}
export declare class ErrorNoTelemetry extends Error {
    constructor(message?: string);
    static fromError(error: Error): ErrorNoTelemetry;
    static isErrorNoTelemetry(error: unknown): error is ErrorNoTelemetry;
}
export declare class BugIndicatingError extends Error {
    constructor(message?: string);
}
export interface Error2Options {
    readonly details?: Readonly<Record<string, unknown>>;
    readonly cause?: unknown;
    readonly name?: string;
}
export declare class Error2 extends Error {
    readonly code: ErrorCode;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(code: ErrorCode, message: string, options?: Error2Options);
}
export declare function isError2(error: unknown): error is Error2;
export declare function unwrapErrorCause(error: unknown): unknown;
export declare class NotImplementedError extends Error2 {
    constructor(feature?: string);
}
