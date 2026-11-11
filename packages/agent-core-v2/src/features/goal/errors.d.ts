export declare const GoalErrors: {
    readonly codes: {
        readonly GOAL_ALREADY_EXISTS: 'goal.already_exists';
        readonly GOAL_NOT_FOUND: 'goal.not_found';
        readonly GOAL_OBJECTIVE_EMPTY: 'goal.objective_empty';
        readonly GOAL_OBJECTIVE_TOO_LONG: 'goal.objective_too_long';
        readonly GOAL_STATUS_INVALID: 'goal.status_invalid';
        readonly GOAL_METADATA_RESERVED: 'goal.metadata_reserved';
        readonly GOAL_NOT_RESUMABLE: 'goal.not_resumable';
        readonly GOAL_UNSUPPORTED_AGENT: 'goal.unsupported_agent';
    };
    readonly info: {
        readonly 'goal.already_exists': {
            readonly title: 'A goal is already active';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Use `/goal replace <objective>` to replace the current goal.';
        };
        readonly 'goal.not_found': {
            readonly title: 'No goal found';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Start a goal with `/goal <objective>` first.';
        };
        readonly 'goal.objective_empty': {
            readonly title: 'Goal objective is empty';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Provide a non-empty objective.';
        };
        readonly 'goal.objective_too_long': {
            readonly title: 'Goal objective is too long';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Keep the objective under 4000 characters; reference long details by file path.';
        };
        readonly 'goal.status_invalid': {
            readonly title: 'Invalid goal status transition';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Only an active goal can be paused; resume a blocked goal with `/goal resume`.';
        };
        readonly 'goal.metadata_reserved': {
            readonly title: 'Goal metadata is reserved';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Do not write metadata.custom.goal directly; use the goal lifecycle methods.';
        };
        readonly 'goal.not_resumable': {
            readonly title: 'Goal is not resumable';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Only paused or blocked goals can be resumed.';
        };
        readonly 'goal.unsupported_agent': {
            readonly title: 'Goals are unavailable for subagents';
            readonly retryable: false;
            readonly public: true;
            readonly action: 'Run goal lifecycle commands on the main agent.';
        };
    };
};
