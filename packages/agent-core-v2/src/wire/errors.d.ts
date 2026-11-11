import { Error2, type Error2Options } from '#/_base/errors/errors';
export declare const WireErrors: {
    readonly codes: {
        readonly WIRE_UNKNOWN_RECORD: 'wire.unknown_record';
        readonly WIRE_MIGRATION_MISSING: 'wire.migration_missing';
        readonly RECORDS_WRITE_FAILED: 'records.write_failed';
    };
    readonly info: {
        readonly 'wire.unknown_record': {
            readonly title: 'Unknown wire record';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'The record was written by a newer version; upgrade or drop it.';
        };
        readonly 'wire.migration_missing': {
            readonly title: 'Wire migration missing';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'The wire file predates the supported migration chain; start a new session.';
        };
        readonly 'records.write_failed': {
            readonly title: 'Wire journal write failed';
            readonly retryable: false;
            readonly public: true;
        };
    };
};
export type WireErrorCode = (typeof WireErrors.codes)[keyof typeof WireErrors.codes];
export declare class WireError extends Error2 {
    constructor(code: WireErrorCode, message: string, options?: Error2Options);
}
