import { Error2, type Error2Options } from '#/_base/errors/errors';
export declare const EventErrors: {
    readonly codes: {
        readonly EVENT_DUPLICATE_EVENT: 'event.duplicate_event';
        readonly EVENT_SCHEMA_MISSING: 'event.schema_missing';
    };
    readonly info: {
        readonly 'event.duplicate_event': {
            readonly title: 'Duplicate event type';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Two event classes registered the same type; rename one. This is a build-time bug.';
        };
        readonly 'event.schema_missing': {
            readonly title: 'Durable event without schema';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'A durable event class must declare a zod payload schema for replay.';
        };
    };
};
export type EventErrorCode = (typeof EventErrors.codes)[keyof typeof EventErrors.codes];
export declare class EventError extends Error2 {
    constructor(code: EventErrorCode, message: string, options?: Error2Options);
}
