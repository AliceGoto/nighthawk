import { Error2, type Error2Options } from '#/_base/errors/errors';
export declare const StateErrors: {
    readonly codes: {
        readonly STATE_DUPLICATE_FOLD: 'state.duplicate_fold';
        readonly STATE_DURABILITY_MISMATCH: 'state.durability_mismatch';
        readonly STATE_CYCLE: 'state.cycle';
    };
    readonly info: {
        readonly 'state.duplicate_fold': {
            readonly title: 'Duplicate state fold';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'A state registered two folds for the same event; merge them.';
        };
        readonly 'state.durability_mismatch': {
            readonly title: 'Transient state folds durable event';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'A non-durable state cannot fold a durable event; mark the state durable.';
        };
        readonly 'state.cycle': {
            readonly title: 'Event dispatch cycle';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'A subscriber re-dispatches endlessly; break the event cycle.';
        };
    };
};
export type StateErrorCode = (typeof StateErrors.codes)[keyof typeof StateErrors.codes];
export declare class StateError extends Error2 {
    constructor(code: StateErrorCode, message: string, options?: Error2Options);
}
