import { describe, expect, it } from 'vitest';

import { Error2, isError2 } from '#/_base/errors/errors';
import type { ILogService, LogPayload } from '#/_base/log/log';
import { CapabilityErrors } from '#/app/capability/errors';
import { CapabilityService } from '#/app/capability/capabilityService';
import type {
  CapabilityDetectResult,
  CapabilityEntry,
  CapabilityInstallReporter,
} from '#/app/capability/types';

import { stubLog } from '../../_base/log/stubs';

function fakeEntry(overrides: {
  id: 'nighthawk-cu' | 'nighthawk-webbridge';
  pluginId?: string;
  supported?: boolean;
  detect?: CapabilityDetectResult;
  install?: (report: CapabilityInstallReporter) => Promise<string | undefined>;
}): CapabilityEntry {
  return {
    id: overrides.id,
    pluginId: overrides.pluginId,
    displayName: overrides.id,
    description: 'fake',
    supported: overrides.supported ?? true,
    detect: () =>
      Promise.resolve(
        overrides.detect ?? { steps: [{ id: 'plugin', state: 'ok' }] },
      ),
    install: overrides.install ?? (() => Promise.resolve(undefined)),
  };
}

function fakeService(
  entries: readonly CapabilityEntry[],
  log: ILogService = stubLog(),
): CapabilityService {
  return new CapabilityService(
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    log,
    undefined as never,
    entries,
  );
}

function expectErrorCode(error: unknown, code: string): void {
  expect(isError2(error)).toBe(true);
  expect((error as { code: string }).code).toBe(code);
}

describe('CapabilityService', () => {
  it('publishes confirmation without an install error and forwards explicit consent on retry', async () => {
    const entry = fakeEntry({ id: 'nighthawk-cu' });
    let installed = false;
    entry.install = async (_report, options) => {
      if (!options?.stopRunningProcesses) {
        throw new Error2(CapabilityErrors.codes.CAPABILITY_PROCESSES_RUNNING, 'processes running');
      }
      installed = true;
      return undefined;
    };
    const service = fakeService([entry]);
    await service.installCapability('nighthawk-cu');
    expect((await service.getCapability('nighthawk-cu')).install).toEqual({
      running: false, confirmationRequired: 'stop-processes',
    });
    expect(installed).toBe(false);
    await service.installCapability('nighthawk-cu', { stopRunningProcesses: true });
    expect(installed).toBe(true);
    expect((await service.getCapability('nighthawk-cu')).install.confirmationRequired).toBeUndefined();
  });

  it('lists entries with readiness computed from required steps', async () => {
    const service = fakeService([
      fakeEntry({
        id: 'nighthawk-cu',
        pluginId: 'nighthawk-cu-win',
        detect: { steps: [{ id: 'plugin', state: 'ok' }] },
      }),
      fakeEntry({
        id: 'nighthawk-webbridge',
        detect: {
          steps: [
            { id: 'daemon', state: 'ok' },
            { id: 'skill', state: 'missing' },
            { id: 'extension', state: 'missing', optional: true },
          ],
        },
      }),
    ]);
    const list = await service.listCapabilities();
    expect(list.map((c) => [c.id, c.state])).toEqual([
      ['nighthawk-cu', 'ready'],
      ['nighthawk-webbridge', 'partial'],
    ]);
    expect(list[0]?.pluginId).toBe('nighthawk-cu-win');
  });

  it('isolates a failing detector to its own entry', async () => {
    const broken: CapabilityEntry = {
      id: 'nighthawk-cu',
      displayName: 'nighthawk-cu',
      description: 'fake',
      supported: true,
      detect: () => Promise.reject(new Error('probe timed out')),
      install: () => Promise.resolve(undefined),
    };
    const service = fakeService([
      broken,
      fakeEntry({ id: 'nighthawk-webbridge', detect: { steps: [{ id: 'daemon', state: 'ok' }] } }),
    ]);

    const list = await service.listCapabilities();
    expect(list.find((c) => c.id === 'nighthawk-webbridge')?.state).toBe('ready');
    const cu = list.find((c) => c.id === 'nighthawk-cu');
    expect(cu?.state).toBe('partial');
    expect(cu?.steps).toEqual([{ id: 'detect', state: 'failed', detail: 'probe timed out' }]);
  });

  it('marks optional steps as non-blocking for ready', async () => {
    const service = fakeService([
      fakeEntry({
        id: 'nighthawk-webbridge',
        detect: {
          version: 'v1.11.3',
          steps: [
            { id: 'daemon', state: 'ok' },
            { id: 'extension', state: 'missing', optional: true },
          ],
        },
      }),
    ]);
    const status = await service.getCapability('nighthawk-webbridge');
    expect(status.state).toBe('ready');
    expect(status.version).toBe('v1.11.3');
  });

  it('reports not_installed when no step is ok, and unsupported as-is', async () => {
    const service = fakeService([
      fakeEntry({ id: 'nighthawk-cu', detect: { steps: [{ id: 'plugin', state: 'missing' }] } }),
      fakeEntry({ id: 'nighthawk-webbridge', supported: false }),
    ]);
    const list = await service.listCapabilities();
    expect(list.find((c) => c.id === 'nighthawk-cu')?.state).toBe('not_installed');
    const unsupported = list.find((c) => c.id === 'nighthawk-webbridge');
    expect(unsupported?.state).toBe('unsupported');
    expect(unsupported?.supported).toBe(false);
  });

  it('throws capability.not_found for unknown ids', async () => {
    const service = fakeService([]);
    await service.getCapability('nope').then(
      () => {
        expect.unreachable();
      },
      (error) => {
        expectErrorCode(error, CapabilityErrors.codes.CAPABILITY_NOT_FOUND);
      },
    );
    await service.installCapability('nope').then(
      () => {
        expect.unreachable();
      },
      (error) => {
        expectErrorCode(error, CapabilityErrors.codes.CAPABILITY_NOT_FOUND);
      },
    );
  });

  it('rejects install on an unsupported entry', async () => {
    const service = fakeService([fakeEntry({ id: 'nighthawk-cu', supported: false })]);
    await service.installCapability('nighthawk-cu').then(
      () => {
        expect.unreachable();
      },
      (error) => {
        expectErrorCode(error, CapabilityErrors.codes.CAPABILITY_UNSUPPORTED);
      },
    );
  });

  it('serializes installs and clears progress on success', async () => {
    let release: (() => void) | undefined;
    const service = fakeService([
      fakeEntry({
        id: 'nighthawk-cu',
        install: (report) => {
          report('download', 42);
          return new Promise<string | undefined>((resolve) => {
            release = () => {
              resolve(undefined);
            };
          });
        },
      }),
    ]);

    const started = await service.installCapability('nighthawk-cu');
    expect(started.install.running).toBe(true);

    await service.installCapability('nighthawk-cu').then(
      () => {
        expect.unreachable();
      },
      (error) => {
        expectErrorCode(error, CapabilityErrors.codes.CAPABILITY_INSTALL_IN_PROGRESS);
      },
    );

    const during = await service.getCapability('nighthawk-cu');
    expect(during.install).toEqual({ running: true, step: 'download', percent: 42 });

    release?.();
    for (let i = 0; i < 50; i += 1) {
      const status = await service.getCapability('nighthawk-cu');
      if (!status.install.running) {
        expect(status.install.error).toBeUndefined();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect.unreachable('install never settled');
  });

  it('describes the registry without running detectors', async () => {
    const service = fakeService([
      fakeEntry({ id: 'nighthawk-cu', supported: true }),
      fakeEntry({ id: 'nighthawk-webbridge', supported: false }),
    ]);
    const descriptors = service.describeCapabilities();
    expect(descriptors.map((d) => d.id)).toEqual(['nighthawk-cu', 'nighthawk-webbridge']);
    expect(descriptors.find((d) => d.id === 'nighthawk-webbridge')?.supported).toBe(false);
  });

  it('emits onDidChangeInstall on every progress transition', async () => {
    const service = fakeService([
      fakeEntry({
        id: 'nighthawk-cu',
        install: (report) => {
          report('download', 42);
          return Promise.resolve(undefined);
        },
      }),
    ]);
    const seen: Array<{ id: string; install: { running: boolean; step?: string } }> = [];
    service.onDidChangeInstall((change) => {
      seen.push({ id: change.id, install: change.install });
    });

    await service.installCapability('nighthawk-cu');
    for (let i = 0; i < 50; i += 1) {
      const status = await service.getCapability('nighthawk-cu');
      if (!status.install.running) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    expect(seen[0]).toEqual({ id: 'nighthawk-cu', install: { running: true } });
    expect(seen).toContainEqual({ id: 'nighthawk-cu', install: { running: true, step: 'download', percent: 42 } });
    expect(seen.at(-1)).toEqual({ id: 'nighthawk-cu', install: { running: false } });
  });

  it('surfaces an install note from the entry through progress', async () => {
    const service = fakeService([
      fakeEntry({
        id: 'nighthawk-cu',
        install: () => Promise.resolve('user-skill-migrated'),
      }),
    ]);
    await service.installCapability('nighthawk-cu');
    for (let i = 0; i < 50; i += 1) {
      const status = await service.getCapability('nighthawk-cu');
      if (!status.install.running) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect((await service.getCapability('nighthawk-cu')).install.note).toBe('user-skill-migrated');
  });

  it('surfaces install errors through progress until the next attempt', async () => {
    let attempts = 0;
    const service = fakeService([
      fakeEntry({
        id: 'nighthawk-cu',
        install: () => {
          attempts += 1;
          return attempts === 1
            ? Promise.reject(new Error('boom'))
            : Promise.resolve(undefined);
        },
      }),
    ]);
    await service.installCapability('nighthawk-cu');
    for (let i = 0; i < 50; i += 1) {
      const status = await service.getCapability('nighthawk-cu');
      if (!status.install.running) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const failed = await service.getCapability('nighthawk-cu');
    expect(failed.install).toEqual({ running: false, error: 'boom' });

    await service.installCapability('nighthawk-cu');
    for (let i = 0; i < 50; i += 1) {
      const status = await service.getCapability('nighthawk-cu');
      if (!status.install.running) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const retried = await service.getCapability('nighthawk-cu');
    expect(retried.install.error).toBeUndefined();
    expect(attempts).toBe(2);
  });

  it('logs an install error with its last progress step when setup fails', async () => {
    const warnings: Array<{ message: string; payload?: LogPayload }> = [];
    let resolveLogged: (() => void) | undefined;
    const logged = new Promise<void>((resolve) => {
      resolveLogged = resolve;
    });
    const error = new Error('signature mismatch');
    const log = {
      ...stubLog(),
      warn: (message: string, payload?: LogPayload) => {
        warnings.push({ message, payload });
        resolveLogged?.();
      },
    } satisfies ILogService;
    const service = fakeService(
      [
        fakeEntry({
          id: 'nighthawk-cu',
          install: async (report) => {
            report('runtime');
            throw error;
          },
        }),
      ],
      log,
    );

    await service.installCapability('nighthawk-cu');
    await logged;

    expect(warnings).toEqual([
      {
        message: 'capability install failed',
        payload: { capabilityId: 'nighthawk-cu', step: 'runtime', error },
      },
    ]);
  });
});
