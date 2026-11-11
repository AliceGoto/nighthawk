export declare const ModelCatalogErrors: {
    readonly codes: {
        readonly PROVIDER_NOT_FOUND: 'provider.not_found';
        readonly MODEL_NOT_FOUND: 'model.not_found';
    };
    readonly info: {
        readonly 'provider.not_found': {
            readonly title: 'Provider not found';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check the provider id or configure the provider first.';
        };
        readonly 'model.not_found': {
            readonly title: 'Model not found';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check the model alias or configure the model first.';
        };
    };
};
