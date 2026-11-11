export declare const ModelsDevImportErrors: {
    readonly codes: {
        readonly CATALOG_UNAVAILABLE: 'modelsDev.catalog_unavailable';
        readonly CATALOG_ENTRY_NOT_FOUND: 'modelsDev.catalog_entry_not_found';
        readonly CATALOG_IMPORT_INVALID: 'modelsDev.import_invalid';
        readonly REGISTRY_IMPORT_INVALID: 'modelsDev.registry_import_invalid';
        readonly PROVIDER_OAUTH_MANAGED: 'provider.oauth_managed';
    };
    readonly info: {
        readonly 'modelsDev.catalog_unavailable': {
            readonly title: 'models.dev directory unavailable';
            readonly retryable: true;
            readonly public: true;
            readonly action: 'Check the network connection to models.dev and try again.';
        };
        readonly 'modelsDev.catalog_entry_not_found': {
            readonly title: 'Directory entry not found';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check the catalog id against the models.dev directory listing.';
        };
        readonly 'modelsDev.import_invalid': {
            readonly title: 'Directory entry not importable';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Pick another entry or supply the required base_url.';
        };
        readonly 'modelsDev.registry_import_invalid': {
            readonly title: 'Custom registry not importable';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Check the registry URL and credentials.';
        };
        readonly 'provider.oauth_managed': {
            readonly title: 'Provider managed by OAuth login';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Log out via the OAuth flow instead of editing the provider.';
        };
    };
};
