export interface ErrorInfo {
    readonly title: string;
    readonly retryable: boolean;
    readonly public: boolean;
    readonly action?: string;
}
export interface ErrorDomain {
    readonly codes: {
        readonly [name: string]: string;
    };
    readonly retryable?: ReadonlyArray<string>;
    readonly info?: {
        readonly [code: string]: ErrorInfo;
    };
}
export declare function registerErrorDomain(domain: ErrorDomain): void;
export declare function isErrorCode(code: unknown): code is string;
export declare function errorInfo(code: string): ErrorInfo;
export declare const CoreErrors: {
    readonly codes: {
        readonly INTERNAL: 'internal';
        readonly NOT_IMPLEMENTED: 'not_implemented';
        readonly VALIDATION_FAILED: 'validation.failed';
    };
    readonly info: {
        readonly internal: {
            readonly title: 'Internal error';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Inspect logs or report the issue with diagnostics.';
        };
        readonly not_implemented: {
            readonly title: 'Not implemented';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'This feature is not implemented yet.';
        };
    };
};
