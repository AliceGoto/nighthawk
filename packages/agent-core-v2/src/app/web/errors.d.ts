export declare const WebErrors: {
    readonly codes: {
        readonly WEB_INVALID_URL: 'web.invalid_url';
        readonly WEB_PRIVATE_ADDRESS: 'web.private_address';
        readonly WEB_FETCH_FAILED: 'web.fetch_failed';
    };
    readonly retryable: readonly ["web.fetch_failed"];
};
