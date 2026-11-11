// Light entry for `nighthawk exec-server`: never import the SDK root (`#/index`) here,
// or the executor would load the full engine registration at startup.
export { runExecServer } from '@nighthawk/agent-core-v2/remote/server';
