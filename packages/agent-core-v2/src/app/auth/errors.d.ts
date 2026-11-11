export declare const AuthErrors: {
    readonly codes: {
        readonly AUTH_LOGIN_REQUIRED: 'auth.login_required';
        readonly AUTH_PROVISIONING_REQUIRED: 'auth.provisioning_required';
        readonly AUTH_TOKEN_MISSING: 'auth.token_missing';
        readonly AUTH_TOKEN_UNAUTHORIZED: 'auth.token_unauthorized';
        readonly AUTH_MODEL_NOT_RESOLVED: 'auth.model_not_resolved';
    };
    readonly info: {
        readonly 'auth.login_required': {
            readonly title: 'Login required';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Run /login to authenticate with the OAuth provider.';
        };
        readonly 'auth.provisioning_required': {
            readonly title: 'Provider provisioning required';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Configure a provider via /login or the providers endpoint.';
        };
        readonly 'auth.token_missing': {
            readonly title: 'Provider credential missing';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Configure an API key or complete OAuth login for the provider.';
        };
        readonly 'auth.token_unauthorized': {
            readonly title: 'Provider credential unauthorized';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Re-authenticate with the OAuth provider.';
        };
        readonly 'auth.model_not_resolved': {
            readonly title: 'Model not resolved';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Set a default model or configure the requested model alias.';
        };
    };
};
