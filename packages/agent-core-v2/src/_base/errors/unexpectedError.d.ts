export type UnexpectedErrorHandler = (err: unknown) => void;
export declare function setUnexpectedErrorHandler(handler: UnexpectedErrorHandler): void;
export declare function resetUnexpectedErrorHandler(): void;
export declare function onUnexpectedError(err: unknown): void;
export declare function safelyCallListener(listener: () => void): void;
