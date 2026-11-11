export declare const LoopErrors: {
    readonly codes: {
        readonly LOOP_MAX_STEPS_EXCEEDED: 'loop.max_steps_exceeded';
        readonly TURN_AGENT_BUSY: 'turn.agent_busy';
    };
    readonly retryable: readonly ["turn.agent_busy"];
    readonly info: {
        readonly 'loop.max_steps_exceeded': {
            readonly title: 'Loop max steps exceeded';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Raise loop_control.max_steps_per_turn in config.toml, or run "/update-config" then "/reload".';
        };
    };
};
