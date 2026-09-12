import type { SlashCommandHost } from './dispatch';

/**
 * `/swarm-status` opens the interactive swarm browser — the full-screen
 * cluster/member browser with member detail, stop and talk actions. The old
 * text-only summary is superseded by the browser's frames.
 */
export function handleSwarmStatusCommand(host: SlashCommandHost): Promise<void> {
  return host.swarmBrowserController.show();
}