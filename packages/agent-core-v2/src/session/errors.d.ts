export declare const SessionErrors: {
    readonly codes: {
        readonly SESSION_NOT_FOUND: 'session.not_found';
        readonly SESSION_ALREADY_EXISTS: 'session.already_exists';
        readonly SESSION_ID_INVALID: 'session.id_invalid';
        readonly SESSION_CLOSED: 'session.closed';
        readonly SESSION_FORK_ACTIVE_TURN: 'session.fork_active_turn';
        readonly SESSION_UNDO_UNAVAILABLE: 'session.undo_unavailable';
        readonly SESSION_INIT_FAILED: 'session.init_failed';
        readonly SESSION_PLAN_MODE_INVALID: 'session.plan_mode_invalid';
        readonly SESSION_TOWER_MODE_INVALID: 'session.tower_mode_invalid';
        readonly SESSION_OCCUPIED: 'session.occupied';
        readonly SESSION_STALE: 'session.stale';
    };
    readonly retryable: readonly ["session.fork_active_turn", "session.occupied"];
};
