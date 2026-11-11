/**
 * Tests for the CLI telemetry bootstrap helpers, focusing on the
 * `nighthawk web` / `nighthawk server run` host wiring added in `cli/telemetry.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetNightHawkRegionCache } from '#/utils/region';

const mocks = vi.hoisted(() => ({
  initializeTelemetry: vi.fn(),
  createNightHawkDeviceId: vi.fn(() => 'device-123'),
  resolveNightHawkHome: vi.fn(() => '/home/.nighthawk'),
  resolveConfigPath: vi.fn(() => '/home/.nighthawk/config.toml'),
  loadRuntimeConfigSafe: vi.fn(
    (): {
      config: { defaultModel?: string; telemetry?: boolean };
      fileError: Error | undefined;
    } => ({
      config: { defaultModel: 'kimi-k2', telemetry: true },
      fileError: undefined,
    }),
  ),
  getCachedAccessToken: vi.fn(async () => 'tok'),
}));

vi.mock('@nighthawk/nighthawk-telemetry', () => ({
  initializeTelemetry: mocks.initializeTelemetry,
  setTelemetryContext: vi.fn(),
  track: vi.fn(),
  withTelemetryContext: vi.fn(),
}));

vi.mock('@nighthawk/nighthawk-oauth', async (importOriginal) => {
  // Spread the real module: the SDK's v2 client pulls agent-core-v2 into the
  // import graph, which subclasses NightHawkOAuthToolkit from this package.
  const actual = await importOriginal<typeof import('@nighthawk/nighthawk-oauth')>();
  return {
    ...actual,
    createNightHawkDeviceId: mocks.createNightHawkDeviceId,
    NIGHTHAWK_PROVIDER_NAME: 'managed:nighthawk',
  };
});

vi.mock('@nighthawk/nighthawk-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nighthawk/nighthawk-sdk')>();
  return {
    ...actual,
    resolveNightHawkHome: mocks.resolveNightHawkHome,
    resolveConfigPath: mocks.resolveConfigPath,
    loadRuntimeConfigSafe: mocks.loadRuntimeConfigSafe,
    NightHawkAuthFacade: vi.fn(function () {
      return { getCachedAccessToken: mocks.getCachedAccessToken };
    }),
  };
});

describe('initializeServerTelemetry', () => {
  beforeEach(() => {
    vi.stubEnv('NIGHTHAWK_OAUTH_HOST', 'https://auth.kimi.com');
    resetNightHawkRegionCache();
    mocks.initializeTelemetry.mockClear();
    mocks.loadRuntimeConfigSafe.mockClear();
    mocks.loadRuntimeConfigSafe.mockReturnValue({
      config: { defaultModel: 'kimi-k2', telemetry: true },
      fileError: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetNightHawkRegionCache();
  });

  it('configures the sink with ui_mode="web" and the CLI product identity', async () => {
    const { initializeServerTelemetry } = await import('#/cli/telemetry');
    const client = initializeServerTelemetry({ version: '1.2.3' });
    expect(mocks.initializeTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'nighthawk-cli',
        version: '1.2.3',
        uiMode: 'web',
        model: 'kimi-k2',
        enabled: true,
        deviceId: 'device-123',
        homeDir: '/home/.nighthawk',
      }),
    );
    // The returned client wraps the module functions so core + the host share
    // the same underlying client.
    expect(client).toEqual(
      expect.objectContaining({
        track: expect.any(Function),
        withContext: expect.any(Function),
        setContext: expect.any(Function),
      }),
    );
    // The first dynamic import pulls in the whole SDK/oauth chain (~3s idle,
    // more under full-suite transform contention) — give it headroom past the
    // 5s default timeout.
  }, 20000);

  it('disables telemetry when config.toml sets telemetry = false', async () => {
    mocks.loadRuntimeConfigSafe.mockReturnValue({
      config: { defaultModel: 'kimi-k2', telemetry: false },
      fileError: undefined,
    });
    const { initializeServerTelemetry } = await import('#/cli/telemetry');
    initializeServerTelemetry({ version: '1.2.3' });

    expect(mocks.initializeTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('degrades to enabled with no model when config is unreadable', async () => {
    mocks.loadRuntimeConfigSafe.mockReturnValue({
      config: {},
      fileError: new Error('bad toml'),
    });
    const { initializeServerTelemetry } = await import('#/cli/telemetry');
    initializeServerTelemetry({ version: '1.2.3' });

    expect(mocks.initializeTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, model: undefined }),
    );
  });
});
