import { setTelemetryContext, track, withTelemetryContext } from '@nighthawk/nighthawk-telemetry';
import { createNightHawkHarness, type TelemetryClient } from '@nighthawk/nighthawk-sdk';
import { ProcessTerminal, TuiMainScreen } from '@nighthawk/pi-tui';
import type { Command } from 'commander';

import { createCliTelemetryBootstrap } from '#/cli/telemetry';
import { createNightHawkHostIdentity } from '#/cli/host-identity';

import { importBudget, importSessions, scanImportableSessions, sourceHomes } from './run-import';
import { ImportSessionsScreenComponent } from './screen';

export function registerImportSessionsCommand(
  parent: Command,
  run: () => Promise<number> = runImportSessionsCommand,
): void {
  parent
    .command('import-sessions')
    .description('Import recent Claude Code and Codex sessions into NightHawk.')
    .action(async () => {
      process.exitCode = await run();
    });
}

/** `nighthawk import-sessions`: show only the import page in a bare terminal UI, then exit. */
export async function runImportSessionsCommand(): Promise<number> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write('nighthawk import-sessions needs an interactive terminal.\n');
    return 1;
  }
  const telemetry: TelemetryClient = { track, withContext: withTelemetryContext, setContext: setTelemetryContext };
  const harness = createNightHawkHarness({
    homeDir: createCliTelemetryBootstrap().homeDir,
    identity: createNightHawkHostIdentity(),
    telemetry,
  });
  try {
    const nighthawkHome = harness.homeDir;
    const budget = importBudget(await harness.getConfig().catch(() => ({})));
    const now = Date.now();
    const homes = sourceHomes();
    const ui = new TuiMainScreen(new ProcessTerminal());
    await new Promise<void>((resolve) => {
      const screen = new ImportSessionsScreenComponent({
        now,
        scan: () => scanImportableSessions({ nighthawkHome, ...homes, now }),
        run: (candidates, hooks) => importSessions(candidates, { nighthawkHome, ...budget, now, ...hooks }),
        requestRender: () => {
          ui.requestRender();
        },
        onClose: () => {
          resolve();
        },
      });
      ui.addChild(screen);
      ui.setFocus(screen);
      ui.start();
    });
    ui.stop();
    return 0;
  } finally {
    await harness.close();
  }
}
