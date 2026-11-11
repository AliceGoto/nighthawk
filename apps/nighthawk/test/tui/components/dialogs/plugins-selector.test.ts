import { describe, expect, it, vi } from 'vitest';
import chalk from 'chalk';
import type { CapabilityStatus, PluginSummary } from '@nighthawk/nighthawk-sdk';

import {
  PluginInstallTrustConfirmComponent,
  PluginMcpSelectorComponent,
  PluginRemoveConfirmComponent,
  PluginStopProcessesConfirmComponent,
  PluginsPanelComponent,
  type PluginInstallTrustConfirmResult,
  type PluginMcpSelection,
  type PluginRemoveConfirmResult,
  type PluginsPanelSelection,
} from '#/tui/components/dialogs/plugins-selector';
import { currentTheme } from '#/tui/theme';
import { darkColors, lightColors } from '#/tui/theme/colors';
import { isOfficialPluginInstall, isOfficialPluginSource, pluginTrustLabel } from '#/tui/utils/plugin-source-label';
import type { PluginMarketplaceEntry } from '#/utils/plugin-marketplace';

const ANSI_SGR = /\u001B\[[0-9;]*m/g;

function strip(text: string): string {
  return text.replaceAll(ANSI_SGR, '').replaceAll('\u276F', '?');
}

function withAnsiColors<T>(fn: () => T): T {
  const previousChalkLevel = chalk.level;
  chalk.level = 3;
  try {
    return fn();
  } finally {
    chalk.level = previousChalkLevel;
  }
}

function renderRaw(component: { render(width: number): string[] }, width = 120): string {
  return withAnsiColors(() => component.render(width).join('\n'));
}

function dangerShortcut(text: string): string {
  return withAnsiColors(() => chalk.hex(darkColors.error).bold(text));
}

function warningMark(): string {
  // Opening ANSI escape for the warning color; the install-trust notice is the
  // only element in that dialog using it, so its presence confirms the tone.
  return withAnsiColors(() => chalk.hex(darkColors.warning)('\u0001').split('\u0001')[0]!);
}

const superpowers = {
  id: 'superpowers',
  displayName: 'Superpowers',
  version: '5.1.0',
  enabled: true,
  state: 'ok' as const,
  skillCount: 14,
  mcpServerCount: 0,
  enabledMcpServerCount: 0,
  hookCount: 0,
  commandCount: 0,
  hasErrors: false,
  source: 'local-path' as const,
  origin: 'custom' as const,
  installedAt: '2026-01-01T00:00:00.000Z',
};

const desktopPlatforms = ['darwin', 'win32', 'linux'] as const;

const officialEntries = [
  {
    id: 'nighthawk-datasource',
    tier: 'official' as const,
    displayName: 'NightHawk Datasource',
    description: 'Query supported data sources',
    cliDescription: 'Query supported data sources (CLI)',
    version: '3.1.1',
    platforms: desktopPlatforms,
    source: 'https://x/d.zip',
    keywords: ['data'],
  },
];
const thirdPartyEntries = [
  {
    id: 'superpowers',
    tier: 'curated' as const,
    displayName: 'Superpowers',
    platforms: desktopPlatforms,
    source: 'https://x/s.zip',
  },
];
const marketplaceEntries = [...officialEntries, ...thirdPartyEntries];

function makePanel(opts: {
  installed?: readonly PluginSummary[];
  capabilities?: readonly CapabilityStatus[];
  catalogIsDefault?: boolean;
  initialTab?: 'installed' | 'official' | 'third-party' | 'custom';
  selectedId?: string;
  pluginHint?: { id: string; text: string };
}) {
  const installed = opts.installed ?? [];
  const onSelect = vi.fn<(s: PluginsPanelSelection) => void>();
  const onRequestMarketplace = vi.fn();
  const panel = new PluginsPanelComponent({
    installed,
    capabilities: opts.capabilities,
    catalogIsDefault: opts.catalogIsDefault,
    initialTab: opts.initialTab,
    selectedId: opts.selectedId,
    pluginHint: opts.pluginHint,
    onSelect,
    onCancel: vi.fn(),
    onRequestMarketplace,
  });
  return { panel, onSelect, onRequestMarketplace };
}

function makeCapability(overrides: Partial<CapabilityStatus> = {}): CapabilityStatus {
  const id = overrides.id ?? 'nighthawk-cu';
  return {
    id,
    pluginId: id === 'nighthawk-webbridge' ? 'nighthawk-browser-extension' : 'nighthawk-cu',
    displayName: 'NightHawk Computer Use',
    description: 'Background GUI automation',
    supported: true,
    state: 'partial',
    steps: [
      { id: 'plugin', state: 'ok' },
      { id: 'app', state: 'ok' },
      { id: 'service', state: 'ok' },
      { id: 'permissions.accessibility', state: 'ok' },
      { id: 'permissions.screenRecording', state: 'missing' },
    ],
    install: { running: false },
    ...overrides,
  };
}

function makeMarketplaceEntry(
  id: string,
  platforms: NonNullable<PluginMarketplaceEntry['platforms']>,
  displayName = id,
): PluginMarketplaceEntry {
  return {
    id,
    displayName,
    tier: 'official',
    version: '1.0.0',
    platforms,
    source: `https://example.test/${id}.zip`,
  };
}

describe('plugins selector dialogs', () => {
  it('keeps raw catalog versions for installation after display enrichment', () => {
    const { panel } = makePanel({});
    const raw = { ...makeMarketplaceEntry('demo', desktopPlatforms), version: undefined };
    panel.setMarketplaceCatalogVersions([raw]);
    const enriched = { ...raw, version: '7.0.0' };
    panel.setMarketplace([enriched], '/tmp/marketplace.json');

    expect(panel.expectedMarketplaceVersion(enriched)).toBeUndefined();

    const versioned = makeMarketplaceEntry('versioned', desktopPlatforms);
    panel.setMarketplaceCatalogVersions([versioned]);
    expect(panel.expectedMarketplaceVersion({ ...versioned, version: '8.0.0' })).toBe('1.0.0');
  });

  it('trusts only built-in NightHawk CDN plugin paths', () => {
    expect(pluginTrustLabel({
      id: 'nighthawk-datasource',
      displayName: 'NightHawk Datasource',
      enabled: true,
      state: 'ok',
      skillCount: 0,
      mcpServerCount: 0,
      enabledMcpServerCount: 0,
      hookCount: 0,
      commandCount: 0,
      hasErrors: false,
      source: 'zip-url',
      originalSource: 'https://code.kimi.com/nighthawk/plugins/official/nighthawk-datasource.zip',
    })).toBe('official');
    expect(pluginTrustLabel({
      id: 'superpowers',
      displayName: 'Superpowers',
      enabled: true,
      state: 'ok',
      skillCount: 0,
      mcpServerCount: 0,
      enabledMcpServerCount: 0,
      hookCount: 0,
      commandCount: 0,
      hasErrors: false,
      source: 'zip-url',
      originalSource: 'https://code.kimi.com/nighthawk/plugins/curated/superpowers.zip',
    })).toBe('curated');
    expect(pluginTrustLabel({
      id: 'nighthawk-cu',
      displayName: 'NightHawk Computer Use',
      enabled: true,
      state: 'ok',
      skillCount: 1,
      mcpServerCount: 1,
      enabledMcpServerCount: 1,
      hookCount: 0,
      commandCount: 0,
      hasErrors: false,
      source: 'zip-url',
      originalSource: 'https://cdn.kimi.com/nighthawk-computer-use/latest/nighthawk-cu-plugin.zip',
    })).toBe('official');
    expect(pluginTrustLabel({
      id: 'demo',
      displayName: 'Demo',
      enabled: true,
      state: 'ok',
      skillCount: 0,
      mcpServerCount: 0,
      enabledMcpServerCount: 0,
      hookCount: 0,
      commandCount: 0,
      hasErrors: false,
      source: 'zip-url',
      originalSource: 'https://code.kimi.com/demo.zip',
    })).toBe('third-party');
    expect(pluginTrustLabel({
      id: 'local',
      displayName: 'Local',
      enabled: true,
      state: 'ok',
      skillCount: 0,
      mcpServerCount: 0,
      enabledMcpServerCount: 0,
      hookCount: 0,
      commandCount: 0,
      hasErrors: false,
      source: 'local-path',
      originalSource: 'https://code.kimi.com/nighthawk/plugins/official/local',
    })).toBe('third-party');
  });

  it('trusts the .ai NightHawk plugin hosts with the same path rules', () => {
    const labelFor = (originalSource: string) =>
      pluginTrustLabel({
        id: 'demo',
        displayName: 'Demo',
        enabled: true,
        state: 'ok',
        skillCount: 0,
        mcpServerCount: 0,
        enabledMcpServerCount: 0,
        hookCount: 0,
        commandCount: 0,
        hasErrors: false,
        source: 'zip-url',
        originalSource,
      });
    // code.kimi.ai mirrors the cdnBase rules; cdn.kimi.ai the content-CDN ones.
    expect(labelFor('https://code.kimi.ai/nighthawk/plugins/official/nighthawk-datasource.zip')).toBe('official');
    expect(labelFor('https://code.kimi.ai/nighthawk/plugins/curated/superpowers.zip')).toBe('curated');
    expect(labelFor('https://cdn.kimi.ai/nighthawk-computer-use/latest/nighthawk-cu-plugin.zip')).toBe('official');
    expect(labelFor('https://cdn.kimi.ai/nighthawk-computer-use-windows/latest/nighthawk-cu-win-plugin.zip')).toBe('official');
    // Non-plugin paths on the .ai hosts, and lookalike hosts, stay third-party.
    expect(labelFor('https://code.kimi.ai/demo.zip')).toBe('third-party');
    expect(labelFor('https://cdn.kimi.ai/unrelated/plugin.zip')).toBe('third-party');
    expect(labelFor('https://code.kimi.ai.example.test/nighthawk/plugins/official/x.zip')).toBe('third-party');
  });

  it('recognizes installed plugins by official provenance', () => {
    const base = {
      id: 'nighthawk-datasource',
      displayName: 'NightHawk Datasource',
      enabled: true,
      state: 'ok' as const,
      skillCount: 0,
      mcpServerCount: 0,
      enabledMcpServerCount: 0,
      hookCount: 0,
      commandCount: 0,
      hasErrors: false,
    };
    // Zip installs from the official CDN path.
    expect(isOfficialPluginInstall({
      ...base,
      source: 'zip-url',
      originalSource: 'https://code.kimi.com/nighthawk/plugins/official/nighthawk-datasource.zip',
    })).toBe(true);
    expect(isOfficialPluginInstall({
      ...base,
      source: 'zip-url',
      originalSource: 'https://code.kimi.ai/nighthawk/plugins/official/nighthawk-datasource.zip',
    })).toBe(true);
    expect(isOfficialPluginInstall({
      ...base,
      id: 'nighthawk-cu',
      displayName: 'NightHawk Computer Use',
      source: 'zip-url',
      originalSource: 'https://cdn.kimi.com/nighthawk-computer-use/latest/nighthawk-cu-plugin.zip',
    })).toBe(true);
    // Same manifest id from a local path, GitHub, a loopback URL, or a
    // third-party URL is not the official build.
    expect(isOfficialPluginInstall({ ...base, source: 'local-path' })).toBe(false);
    expect(isOfficialPluginInstall({ ...base, source: 'github' })).toBe(false);
    expect(isOfficialPluginInstall({
      ...base,
      source: 'zip-url',
      originalSource: 'http://127.0.0.1:58627/nighthawk/plugins/official/nighthawk-datasource.zip',
    })).toBe(false);
    expect(isOfficialPluginInstall({
      ...base,
      source: 'zip-url',
      originalSource: 'https://example.test/nighthawk/plugins/official/nighthawk-datasource.zip',
    })).toBe(false);
  });

  it('shows installed NightHawk Computer Use and WebBridge plugins as official', () => {
    const installed: PluginSummary[] = [
      {
        ...superpowers,
        id: 'nighthawk-cu',
        displayName: 'NightHawk Computer Use',
        source: 'zip-url',
        originalSource: 'https://cdn.kimi.com/nighthawk-computer-use/latest/nighthawk-cu-plugin.zip',
      },
      {
        ...superpowers,
        id: 'nighthawk-webbridge',
        displayName: 'NightHawk Browser Extension',
        source: 'zip-url',
        originalSource: 'https://code.kimi.com/nighthawk/plugins/official/nighthawk-webbridge.zip',
      },
    ];

    const { panel } = makePanel({ installed });
    const out = strip(renderRaw(panel));

    expect(out).toContain('id nighthawk-cu');
    expect(out).toContain('via cdn.kimi.com · official');
    expect(out).toContain('id nighthawk-webbridge');
    expect(out).toContain('via code.kimi.com · official');
  });

  it('treats only the official NightHawk CDN path as a trusted install source', () => {
    expect(isOfficialPluginSource('https://code.kimi.com/nighthawk/plugins/official/nighthawk-datasource.zip')).toBe(true);
    expect(isOfficialPluginSource('https://cdn.kimi.com/nighthawk-computer-use/latest/nighthawk-cu-plugin.zip')).toBe(true);
    expect(
      isOfficialPluginSource(
        'https://cdn.kimi.com/nighthawk-computer-use-windows/latest/nighthawk-cu-win-plugin.zip',
      ),
    ).toBe(true);
    // The .ai region family follows the same path rules.
    expect(isOfficialPluginSource('https://code.kimi.ai/nighthawk/plugins/official/nighthawk-datasource.zip')).toBe(true);
    expect(isOfficialPluginSource('https://cdn.kimi.ai/nighthawk-computer-use/latest/nighthawk-cu-plugin.zip')).toBe(true);
    expect(
      isOfficialPluginSource(
        'https://cdn.kimi.ai/nighthawk-computer-use-windows/latest/nighthawk-cu-win-plugin.zip',
      ),
    ).toBe(true);
    expect(isOfficialPluginSource('https://code.kimi.ai/nighthawk/plugins/curated/superpowers.zip')).toBe(false);
    expect(isOfficialPluginSource('https://cdn.kimi.ai/unrelated/plugin.zip')).toBe(false);
    // Curated and other NightHawk CDN paths are not "official" for the install gate.
    expect(isOfficialPluginSource('https://code.kimi.com/nighthawk/plugins/curated/superpowers.zip')).toBe(false);
    expect(isOfficialPluginSource('https://code.kimi.com/nighthawk/plugins/foo.zip')).toBe(false);
    expect(isOfficialPluginSource('https://cdn.kimi.com/unrelated/plugin.zip')).toBe(false);
    // Non-NightHawk hosts (loopback included), non-https schemes, local paths, and
    // GitHub sources are unofficial.
    expect(isOfficialPluginSource('https://example.test/nighthawk/plugins/official/x.zip')).toBe(false);
    expect(isOfficialPluginSource('http://code.kimi.com/nighthawk/plugins/official/x.zip')).toBe(false);
    expect(isOfficialPluginSource('http://127.0.0.1:58627/nighthawk/plugins/official/x.zip')).toBe(false);
    expect(isOfficialPluginSource('./plugins/nighthawk-datasource')).toBe(false);
    expect(isOfficialPluginSource('/abs/path/to/plugin')).toBe(false);
    expect(isOfficialPluginSource('github.com/owner/repo')).toBe(false);
    expect(isOfficialPluginSource('not a url')).toBe(false);
  });

  it('opens on the Installed tab with the four panel tabs', () => {
    const { panel } = makePanel({ installed: [superpowers] });
    const out = strip(renderRaw(panel));
    expect(out).toContain('Plugins');
    expect(out).toContain('Installed');
    expect(out).toContain('Official');
    expect(out).toContain('Curated');
    expect(out).toContain('Custom');
    expect(out).toContain('? Superpowers  enabled');
    expect(out).toContain('Space toggle');
    expect(out).toContain('1 installed');
  });

  it('repaints from the current theme palette without remounting', () => {
    const { panel } = makePanel({ installed: [superpowers] });
    const previous = currentTheme.palette;
    try {
      currentTheme.setPalette(darkColors);
      const darkOut = renderRaw(panel);
      currentTheme.setPalette(lightColors);
      const lightOut = renderRaw(panel);
      // A palette snapshot cached at construction would render identically
      // after the switch; reading currentTheme.palette at render time must
      // produce different ANSI output for the same panel instance.
      expect(darkOut).not.toBe(lightOut);
    } finally {
      currentTheme.setPalette(previous);
    }
  });

  it('toggles an installed plugin with Space', () => {
    const { panel, onSelect } = makePanel({ installed: [superpowers] });
    panel.handleInput(' ');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'toggle', id: 'superpowers', enabled: false });
  });

  it('routes D / M / R / Enter to remove / mcp / reload / details on the Installed tab', () => {
    const { panel, onSelect } = makePanel({ installed: [superpowers] });
    panel.handleInput('d');
    panel.handleInput('m');
    panel.handleInput('r');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'remove', id: 'superpowers' });
    expect(onSelect).toHaveBeenCalledWith({ kind: 'mcp', id: 'superpowers' });
    expect(onSelect).toHaveBeenCalledWith({ kind: 'reload' });
    expect(onSelect).toHaveBeenCalledWith({ kind: 'details', id: 'superpowers' });
  });

  it('Enter on an installed plugin with an available update installs it', () => {
    const installed = [{ ...superpowers, id: 'superpowers', version: '4.0.0', origin: 'unknown' as const }];
    const entries = [
      {
        id: 'superpowers',
        tier: 'curated' as const,
        displayName: 'Superpowers',
        version: '5.0.0',
        platforms: desktopPlatforms,
        source: 'https://x/s.zip',
      },
    ];
    const { panel, onSelect } = makePanel({ installed });
    panel.setMarketplace(entries, '/tmp/marketplace.json');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'install',
      entry: expect.objectContaining({ id: 'superpowers' }),
    });
  });

  it('Enter on an up-to-date installed plugin opens details', () => {
    const installed = [{ ...superpowers, id: 'superpowers', version: '5.0.0' }];
    const entries = [
      {
        id: 'superpowers',
        tier: 'curated' as const,
        displayName: 'Superpowers',
        version: '5.0.0',
        platforms: desktopPlatforms,
        source: 'https://x/s.zip',
      },
    ];
    const { panel, onSelect } = makePanel({ installed });
    panel.setMarketplace(entries, '/tmp/marketplace.json');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'details', id: 'superpowers' });
  });

  it('I on an installed plugin opens details even when an update is available', () => {
    const installed = [{ ...superpowers, id: 'superpowers', version: '4.0.0', origin: 'unknown' as const }];
    const entries = [
      {
        id: 'superpowers',
        tier: 'curated' as const,
        displayName: 'Superpowers',
        version: '5.0.0',
        platforms: desktopPlatforms,
        source: 'https://x/s.zip',
      },
    ];
    const { panel, onSelect } = makePanel({ installed });
    panel.setMarketplace(entries, '/tmp/marketplace.json');
    panel.handleInput('i');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'details', id: 'superpowers' });
  });

  it('renders the inline plugin hint on the installed row', () => {
    const datasource = { ...superpowers, id: 'nighthawk-datasource', displayName: 'NightHawk Datasource', skillCount: 1 };
    const { panel } = makePanel({
      installed: [datasource],
      selectedId: 'nighthawk-datasource',
      pluginHint: { id: 'nighthawk-datasource', text: 'pending /new' },
    });
    const out = strip(renderRaw(panel));
    expect(out).toContain('? NightHawk Datasource  enabled  pending /new');
  });

  it('lazily loads the Official catalog', () => {
    const { panel, onRequestMarketplace } = makePanel({ installed: [superpowers] });
    panel.handleInput('\t'); // → Official
    expect(onRequestMarketplace).toHaveBeenCalledTimes(1);
    expect(strip(renderRaw(panel))).toContain('Loading marketplace');

    panel.setMarketplace(marketplaceEntries, '/tmp/marketplace.json');
    const out = strip(renderRaw(panel));
    expect(out).toContain('NightHawk Datasource  install');
    expect(out).toContain('Query supported data sources (CLI)');
    expect(out).not.toContain('Query supported data sources · v3.1.1');
    expect(out).not.toContain('id nighthawk-datasource');
    expect(out).not.toContain('Official plugin');
    expect(out).not.toContain('· data');
    expect(out).toContain('0 installed · 1 available');
  });

  it.each([
    { platform: 'darwin', other: 'win32', label: 'macOS' },
    { platform: 'win32', other: 'darwin', label: 'Windows' },
  ] as const)('applies local and cloud visibility rules on $label', ({ platform, other }) => {
    const platformSpy = vi.spyOn(process, 'platform', 'get').mockReturnValue(platform);
    try {
      const local = makeMarketplaceEntry('local', [platform], 'Local');
      const cloudLocal = makeMarketplaceEntry('cloud-local', [platform, 'cloud'], 'Cloud local');
      const cloudOnly = makeMarketplaceEntry('cloud-only', ['cloud'], 'Cloud only');
      const otherOnly = makeMarketplaceEntry('other-only', [other], 'Other only');
      const cloudOther = makeMarketplaceEntry('cloud-other', [other, 'cloud'], 'Cloud other');
      const { panel, onSelect } = makePanel({ initialTab: 'official' });
      panel.setMarketplace(
        [otherOnly, cloudOther, local, cloudLocal, cloudOnly],
        '/tmp/marketplace.json',
      );

      const out = strip(renderRaw(panel));
      expect(out).toContain('Local  install v1.0.0');
      expect(out).toContain('Cloud local  install v1.0.0');
      expect(out).toContain('Cloud only  cloud only');
      expect(out).not.toContain('Other only');
      expect(out).not.toContain('Cloud other');

      panel.handleInput('\r');
      panel.handleInput('\u001B[B');
      panel.handleInput('\r');
      panel.handleInput('\u001B[B');
      panel.handleInput('\r');

      expect(strip(renderRaw(panel))).not.toContain('Enter install');
      expect(onSelect).toHaveBeenCalledTimes(2);
      expect(onSelect).toHaveBeenNthCalledWith(1, { kind: 'install', entry: local });
      expect(onSelect).toHaveBeenNthCalledWith(2, { kind: 'install', entry: cloudLocal });
    } finally {
      platformSpy.mockRestore();
    }
  });

  it('does not offer a local update for a cloud-only entry', () => {
    const installed = {
      ...superpowers,
      id: 'cloud-plugin',
      displayName: 'Cloud plugin',
      version: '1.0.0',
    };
    const entry = {
      ...makeMarketplaceEntry('cloud-plugin', ['cloud'], 'Cloud plugin'),
      version: '2.0.0',
    };
    const { panel, onSelect } = makePanel({ installed: [installed] });
    panel.setMarketplace([entry], '/tmp/marketplace.json');

    expect(strip(renderRaw(panel))).not.toContain('update 1.0.0 → 2.0.0');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'details', id: 'cloud-plugin' });
  });

  it.each([
    {
      pluginId: 'nighthawk-cu',
      otherId: 'nighthawk-cu-win',
      displayName: 'macOS Computer Use',
      otherDisplayName: 'Windows Computer Use',
    },
    {
      pluginId: 'nighthawk-cu-win',
      otherId: 'nighthawk-cu',
      displayName: 'Windows Computer Use',
      otherDisplayName: 'macOS Computer Use',
    },
  ] as const)('shows only the current CU plugin $pluginId', ({
    pluginId,
    otherId,
    displayName,
    otherDisplayName,
  }) => {
    const other = makeMarketplaceEntry(otherId, desktopPlatforms, otherDisplayName);
    const current = makeMarketplaceEntry(pluginId, desktopPlatforms, displayName);
    const { panel, onSelect } = makePanel({
      initialTab: 'official',
      capabilities: [makeCapability({ pluginId })],
    });
    panel.setMarketplace([other, current], '/tmp/marketplace.json');

    const out = strip(renderRaw(panel));
    expect(out).toContain(displayName);
    expect(out).not.toContain(otherDisplayName);
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'install', entry: current });

    panel.setMarketplace([other], '/tmp/marketplace.json');
    expect(strip(renderRaw(panel))).not.toContain(otherDisplayName);
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows only canonical WebBridge when legacy and canonical entries coexist', () => {
    const legacy = makeMarketplaceEntry('nighthawk-webbridge', desktopPlatforms, 'Legacy WebBridge');
    const canonical = makeMarketplaceEntry(
      'nighthawk-browser-extension',
      desktopPlatforms,
      'Canonical WebBridge',
    );
    const { panel, onSelect } = makePanel({
      initialTab: 'official',
      capabilities: [
        makeCapability({ id: 'nighthawk-webbridge', pluginId: 'nighthawk-browser-extension' }),
      ],
    });
    panel.setMarketplace([legacy, canonical], '/tmp/marketplace.json');

    const out = strip(renderRaw(panel));
    expect(out).toContain('Canonical WebBridge');
    expect(out).not.toContain('Legacy WebBridge');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'install', entry: canonical });

    panel.setMarketplace([legacy], '/tmp/marketplace.json');
    expect(strip(renderRaw(panel))).not.toContain('Legacy WebBridge');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('preserves codegw order without promoting installed entries', () => {
    const first = makeMarketplaceEntry('first', desktopPlatforms, 'First');
    const second = makeMarketplaceEntry('second', desktopPlatforms, 'Second');
    const third = makeMarketplaceEntry('third', desktopPlatforms, 'Third');
    const installed = {
      ...superpowers,
      id: 'second',
      displayName: 'Second',
      version: '1.0.0',
      origin: 'marketplace' as const,
      catalogId: 'second',
    };
    const { panel } = makePanel({ installed: [installed], initialTab: 'official' });
    panel.setMarketplace([first, second, third], '/tmp/marketplace.json');

    const out = strip(renderRaw(panel));
    expect(out).toContain('First  install v1.0.0');
    expect(out).toContain('Second  installed · v1.0.0');
    expect(out).toContain('Third  install v1.0.0');
    expect(out.indexOf('First')).toBeLessThan(out.indexOf('Second'));
    expect(out.indexOf('Second')).toBeLessThan(out.indexOf('Third'));
    expect(out).toContain('1 installed · 2 available');
  });

  it('keeps built-in capability rows while the Official catalog is unavailable', () => {
    const capabilities = [
      makeCapability(),
      makeCapability({ id: 'nighthawk-webbridge', displayName: 'NightHawk Browser Extension' }),
    ];
    const { panel } = makePanel({ initialTab: 'official', capabilities });
    const out = strip(renderRaw(panel));

    expect(out).toContain('Loading marketplace');
    expect(out).toContain('NightHawk Computer Use');
    expect(out).toContain('NightHawk Browser Extension');
    expect(out).not.toContain('open in browser');
  });

  it('keeps local plugin management usable when the catalog fails', () => {
    const { panel, onSelect } = makePanel({
      installed: [superpowers],
      capabilities: [makeCapability()],
    });
    panel.setMarketplaceError('fetch failed');

    expect(strip(renderRaw(panel))).toContain('Superpowers  enabled');
    panel.handleInput(' ');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'toggle', id: 'superpowers', enabled: false });

    panel.handleInput('\t');
    const out = strip(renderRaw(panel));
    expect(out).toContain('Marketplace unavailable: fetch failed');
    expect(out).toContain('Use the Custom tab');
    expect(out).toContain('NightHawk Computer Use');
    expect(out).not.toContain('NightHawk Browser Extension');
  });

  it('does not borrow capability state for a forged custom catalog entry', () => {
    const capabilities = [
      makeCapability({
        id: 'nighthawk-webbridge',
        displayName: 'NightHawk Browser Extension',
        install: { running: true, step: 'download' },
      }),
    ];
    const entry = {
      id: 'nighthawk-browser-extension',
      tier: 'official' as const,
      displayName: 'NightHawk Browser Extension (fork)',
      version: '1.2.3',
      platforms: desktopPlatforms,
      source: 'capability:nighthawk-webbridge',
      builtIn: true,
    };
    const { panel, onSelect } = makePanel({
      initialTab: 'official',
      capabilities,
      catalogIsDefault: false,
    });
    panel.setMarketplace([entry], '/tmp/marketplace.json');

    const out = strip(renderRaw(panel));
    expect(out).toContain('NightHawk Browser Extension (fork)  install v1.2.3');
    expect(out).not.toContain('installing…');

    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'install', entry });
  });

  it('uses the closed capability mapping for real default-catalog entries', () => {
    const capabilities = [
      makeCapability({ pluginId: 'nighthawk-cu-win' }),
      makeCapability({
        id: 'nighthawk-webbridge',
        displayName: 'NightHawk Browser Extension',
        install: { running: true, step: 'download' },
      }),
    ];
    const entries = [
      {
        id: 'nighthawk-cu-win',
        tier: 'official' as const,
        displayName: 'NightHawk Computer Use for Windows',
        version: '1.0.0',
        platforms: desktopPlatforms,
        source: 'https://example.test/nighthawk-cu-win.zip',
      },
      {
        id: 'nighthawk-browser-extension',
        tier: 'official' as const,
        displayName: 'NightHawk Browser Extension',
        version: '2.0.0',
        platforms: desktopPlatforms,
        source: 'https://example.test/nighthawk-browser-extension.zip',
      },
    ];
    const { panel, onSelect } = makePanel({ initialTab: 'official', capabilities });
    panel.setMarketplace(entries, '/tmp/marketplace.json');

    const out = strip(renderRaw(panel));
    expect(out).toContain('NightHawk Computer Use for Windows  install v1.0.0');
    expect(out).toContain('NightHawk Browser Extension  installing…');
    expect(out).not.toContain('open in browser');

    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'install', entry: entries[0] });
    panel.handleInput('[B');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'install', entry: entries[1] });
  });

  it('installs a catalog official entry directly on Enter', () => {
    const { panel, onSelect } = makePanel({ initialTab: 'official' });
    panel.setMarketplace(marketplaceEntries, '/tmp/marketplace.json');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'install',
      entry: expect.objectContaining({ id: 'nighthawk-datasource' }),
    });
  });

  it('does not offer legacy WebBridge from a custom catalog', () => {
    const entry = {
      id: 'nighthawk-webbridge',
      tier: 'curated' as const,
      displayName: 'NightHawk Browser Extension',
      version: '1.0.0',
      platforms: desktopPlatforms,
      source: 'https://example.test/nighthawk-webbridge.zip',
    };
    const { panel, onSelect } = makePanel({ initialTab: 'third-party', catalogIsDefault: false });
    panel.setMarketplace([entry], '/tmp/marketplace.json');
    const out = strip(renderRaw(panel));
    expect(out).toContain('Curated');
    expect(out).not.toContain('NightHawk Browser Extension  install');
    panel.handleInput('\r');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('installs the selected Curated entry on Enter', () => {
    const { panel, onSelect } = makePanel({ installed: [superpowers], initialTab: 'third-party' });
    panel.setMarketplace(marketplaceEntries, '/tmp/marketplace.json');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'install',
      entry: expect.objectContaining({ id: 'superpowers' }),
    });
  });

  it('renders an installing state while an install is in progress', () => {
    const { panel } = makePanel({ installed: [superpowers] });
    panel.setInstalling('Superpowers');
    const out = strip(renderRaw(panel));
    expect(out).toContain('Installing Superpowers…');
  });

  it('separates cliDescription from third-party marketplace metadata', () => {
    const { panel } = makePanel({ initialTab: 'third-party' });
    panel.setMarketplace([{
      ...thirdPartyEntries[0]!,
      description: 'Curated long description',
      cliDescription: 'Curated CLI description',
      version: '1.2.3',
      keywords: ['workflow'],
    }], '/tmp/marketplace.json');
    const out = strip(renderRaw(panel));
    const lines = out.split('\n');
    const descriptionIndex = lines.findIndex((line) => line.includes('Curated CLI description'));
    const metadataIndex = lines.findIndex((line) => line.includes('id superpowers'));
    expect(descriptionIndex).toBeGreaterThanOrEqual(0);
    expect(metadataIndex).toBe(descriptionIndex + 1);
    expect(lines[descriptionIndex]).not.toContain('id superpowers');
    expect(lines[metadataIndex]).toContain('id superpowers · v1.2.3 · Curated plugin · workflow');
    expect(out).not.toContain('Curated long description');
  });

  it('keeps a valid selection if ↓ is pressed while the catalog is loading', () => {
    const { panel, onSelect } = makePanel({ initialTab: 'third-party' });
    // Catalog still loading (entries empty); pressing ↓ must not drive the
    // selection negative, or the later Enter would read entries[-1].
    panel.handleInput('\u001B[B'); // ↓
    panel.setMarketplace(marketplaceEntries, '/tmp/marketplace.json');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'install',
      entry: expect.objectContaining({ id: 'superpowers' }),
    });
  });

  it('shows untiered custom marketplace entries without the partner description', () => {
    const untiered = [
      {
        id: 'custom-plugin',
        displayName: 'Custom Plugin',
        platforms: desktopPlatforms,
        source: 'https://x/c.zip',
      },
    ];
    const { panel } = makePanel({ initialTab: 'third-party', catalogIsDefault: false });
    panel.setMarketplace(untiered, '/tmp/marketplace.json');
    const out = strip(renderRaw(panel));
    expect(out).toContain('Custom Plugin  install');
    expect(out).not.toContain('Third-party plugins from our partners.');
  });

  it('shows an update badge when the marketplace version is newer than installed', () => {
    const installed = [{ ...superpowers, id: 'superpowers', version: '4.0.0', origin: 'unknown' as const }];
    const entries = [
      {
        id: 'superpowers',
        tier: 'curated' as const,
        displayName: 'Superpowers',
        version: '5.0.0',
        platforms: desktopPlatforms,
        source: 'https://x/s.zip',
      },
    ];
    const { panel } = makePanel({ installed, initialTab: 'third-party' });
    panel.setMarketplace(entries, '/tmp/marketplace.json');
    const out = strip(renderRaw(panel));
    expect(out).toContain('Superpowers  update 4.0.0 → 5.0.0');
  });

  it('shows an update badge on the Installed tab when the marketplace version is newer', () => {
    const installed = [{ ...superpowers, id: 'superpowers', version: '4.0.0', origin: 'unknown' as const }];
    const entries = [
      {
        id: 'superpowers',
        tier: 'curated' as const,
        displayName: 'Superpowers',
        version: '5.0.0',
        platforms: desktopPlatforms,
        source: 'https://x/s.zip',
      },
    ];
    const { panel } = makePanel({ installed });
    panel.setMarketplace(entries, '/tmp/marketplace.json');
    const out = strip(renderRaw(panel));
    expect(out).toContain('Superpowers  enabled  update 4.0.0 → 5.0.0');
  });

  it('does not offer marketplace updates for same-id custom installs', () => {
    const installed = [{ ...superpowers, version: '4.0.0', source: 'github' as const }];
    const entries = [
      {
        id: 'superpowers',
        tier: 'curated' as const,
        displayName: 'Superpowers',
        version: '5.0.0',
        platforms: desktopPlatforms,
        source: 'https://x/s.zip',
      },
    ];
    const { panel, onSelect } = makePanel({ installed });
    panel.setMarketplace(entries, '/tmp/marketplace.json');

    expect(strip(renderRaw(panel))).not.toContain('update 4.0.0 → 5.0.0');
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'details', id: 'superpowers' });
  });

  it('updates the Windows backing plugin through its capability entry', () => {
    const installed = [
      {
        ...superpowers,
        id: 'nighthawk-cu-win',
        displayName: 'NightHawk Computer Use for Windows',
        version: '0.2.13',
      },
    ];
    const capability = makeCapability({ pluginId: 'nighthawk-cu-win' });
    const entry = {
      id: 'nighthawk-cu-win',
      tier: 'official' as const,
      displayName: 'NightHawk Computer Use',
      version: '0.2.14',
      platforms: desktopPlatforms,
      source: 'https://example.test/nighthawk-cu-win.zip',
    };
    const { panel, onSelect } = makePanel({ installed, capabilities: [capability] });
    panel.setMarketplace([entry], '/tmp/marketplace.json');

    expect(strip(renderRaw(panel))).toContain(
      'NightHawk Computer Use for Windows  enabled  update 0.2.13 → 0.2.14',
    );
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'install', entry });
  });

  it('keeps installation state separate from capability readiness', () => {
    const installed = [
      { ...superpowers, id: 'nighthawk-cu', displayName: 'NightHawk Computer Use', version: '0.5.4' },
    ];
    const capabilities = [makeCapability()];
    const entries = [
      {
        id: 'nighthawk-cu',
        tier: 'official' as const,
        displayName: 'NightHawk Computer Use',
        version: '0.5.4',
        platforms: desktopPlatforms,
        source: 'https://example.test/nighthawk-cu.zip',
      },
    ];
    const { panel } = makePanel({ installed, capabilities });
    panel.setMarketplace(entries, '/tmp/marketplace.json');

    const installedOut = strip(renderRaw(panel));
    expect(installedOut).toContain('NightHawk Computer Use  enabled');
    expect(installedOut).not.toContain('setup incomplete');
    expect(installedOut).not.toContain('needs permissions');

    panel.handleInput('\t');
    const officialOut = strip(renderRaw(panel));
    expect(officialOut).toContain('NightHawk Computer Use  installed · v0.5.4');
    expect(officialOut).toContain('1 installed · 0 available');
    expect(officialOut).not.toContain('needs permissions');
  });

  it('uses the Windows backing plugin id for Official installation state', () => {
    const installed = [
      {
        ...superpowers,
        id: 'nighthawk-cu-win',
        displayName: 'NightHawk Computer Use for Windows',
        version: '0.2.14',
      },
    ];
    const capabilities = [makeCapability({ pluginId: 'nighthawk-cu-win' })];
    const entries = [
      {
        id: 'nighthawk-cu-win',
        tier: 'official' as const,
        displayName: 'NightHawk Computer Use',
        version: '0.2.14',
        platforms: desktopPlatforms,
        source: 'https://example.test/nighthawk-cu-win.zip',
      },
    ];
    const { panel } = makePanel({ installed, capabilities, initialTab: 'official' });
    panel.setMarketplace(entries, '/tmp/marketplace.json');

    const out = strip(renderRaw(panel));
    expect(out).toContain('NightHawk Computer Use  installed · v0.2.14');
    expect(out).toContain('1 installed · 0 available');
  });

  it('keeps Enter on the Installed tab consistent with other plugins', () => {
    const installed = [
      { ...superpowers, id: 'nighthawk-cu', displayName: 'NightHawk Computer Use', version: '0.5.4' },
    ];
    const { panel, onSelect } = makePanel({ installed, capabilities: [makeCapability()] });

    panel.handleInput('\r');

    expect(onSelect).toHaveBeenCalledWith({ kind: 'details', id: 'nighthawk-cu' });
  });

  it('keeps unsupported capability diagnostics out of the Installed list', () => {
    const installed = [
      { ...superpowers, id: 'nighthawk-cu', displayName: 'NightHawk Computer Use', version: '0.5.4' },
    ];
    const capabilities = [
      makeCapability({ supported: false, state: 'unsupported', steps: [] }),
    ];
    const { panel, onSelect } = makePanel({ installed, capabilities });

    const out = strip(renderRaw(panel));
    expect(out).toContain('NightHawk Computer Use  enabled');
    expect(out).not.toContain('unsupported');

    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ kind: 'details', id: 'nighthawk-cu' });
  });

  it('associates a canonical marketplace entry with the legacy installed plugin', () => {
    const capabilities = [
      makeCapability({
        id: 'nighthawk-webbridge',
        pluginId: 'nighthawk-browser-extension',
        displayName: 'NightHawk Browser Extension',
        state: 'ready',
        version: 'v1.11.5',
        steps: [
          { id: 'daemon-binary', state: 'ok' },
          { id: 'daemon', state: 'ok' },
          { id: 'skill', state: 'ok' },
          { id: 'extension', state: 'missing', optional: true },
        ],
      }),
    ];
    const installed = [
      { ...superpowers, id: 'nighthawk-webbridge', displayName: 'NightHawk Browser Extension', version: '1.11.3' },
    ];
    const { panel } = makePanel({ installed, capabilities, initialTab: 'official' });
    panel.setMarketplace(
      [{
        id: 'nighthawk-browser-extension',
        displayName: 'NightHawk Browser Extension',
        version: '1.11.3',
        platforms: desktopPlatforms,
        source: 'https://example.test/nighthawk-browser-extension.zip',
        tier: 'official',
      }],
      '/tmp/marketplace.json',
    );

    const out = strip(renderRaw(panel));
    expect(out).toContain('NightHawk Browser Extension  installed · v1.11.3');
    expect(out).not.toContain('ready');
    expect(out).not.toContain('v1.11.5');
    expect(out).not.toContain('browser extension');
  });

  it('prefers the canonical installed plugin when legacy and canonical ids coexist', () => {
    const installed = [
      { ...superpowers, id: 'nighthawk-webbridge', version: '1.0.0' },
      { ...superpowers, id: 'nighthawk-browser-extension', version: '2.0.0' },
    ];
    const capabilities = [
      makeCapability({ id: 'nighthawk-webbridge', pluginId: 'nighthawk-browser-extension' }),
    ];
    const entry = {
      id: 'nighthawk-browser-extension',
      displayName: 'NightHawk Browser Extension',
      version: '2.0.0',
      platforms: desktopPlatforms,
      source: 'https://example.test/nighthawk-browser-extension.zip',
      tier: 'official' as const,
    };
    const { panel } = makePanel({ installed, capabilities, initialTab: 'official' });
    panel.setMarketplace([entry], '/tmp/marketplace.json');

    const out = strip(renderRaw(panel));
    expect(out).toContain('NightHawk Browser Extension  installed · v2.0.0');
    expect(out).not.toContain('installed · v1.0.0');
  });

  it('keeps capability repair details out of marketplace rows', () => {
    const capabilities = [
      makeCapability({
        id: 'nighthawk-webbridge',
        displayName: 'NightHawk Browser Extension',
        state: 'partial',
        steps: [
          { id: 'daemon-binary', state: 'ok' },
          { id: 'daemon', state: 'ok' },
          { id: 'skill', state: 'missing' },
          { id: 'skill-shadow', state: 'failed', optional: true },
        ],
      }),
    ];
    const { panel } = makePanel({ capabilities, initialTab: 'official' });
    panel.setMarketplace(
      [{
        id: 'nighthawk-browser-extension',
        displayName: 'NightHawk Browser Extension',
        platforms: desktopPlatforms,
        source: 'https://example.test/nighthawk-browser-extension.zip',
        tier: 'official',
      }],
      '/tmp/marketplace.json',
    );

    const out = strip(renderRaw(panel));
    expect(out).toContain('NightHawk Browser Extension  install');
    expect(out).not.toContain('agent skill');
    expect(out).not.toContain('skill shadows');
  });

  it('does not show an update badge on the Installed tab before the marketplace loads', () => {
    const installed = [{ ...superpowers, id: 'superpowers', version: '4.0.0', origin: 'unknown' as const }];
    const { panel } = makePanel({ installed });
    // The marketplace has not been loaded yet, so the badge stays hidden rather
    // than guessing.
    const out = strip(renderRaw(panel));
    expect(out).not.toContain('update');
  });

  it('shows installed · v<version> when the installed plugin is up to date', () => {
    const installed = [{
      ...superpowers,
      id: 'superpowers',
      version: '5.0.0',
      origin: 'marketplace' as const,
      catalogId: 'superpowers',
    }];
    const entries = [
      {
        id: 'superpowers',
        tier: 'curated' as const,
        displayName: 'Superpowers',
        version: '5.0.0',
        platforms: desktopPlatforms,
        source: 'https://x/s.zip',
      },
    ];
    const { panel } = makePanel({ installed, initialTab: 'third-party' });
    panel.setMarketplace(entries, '/tmp/marketplace.json');
    const out = strip(renderRaw(panel));
    expect(out).toContain('Superpowers  installed · v5.0.0');
  });

  it('shows an inline error when the Official catalog fails', () => {
    const { panel } = makePanel({ installed: [superpowers] });
    panel.handleInput('\t'); // → Official
    panel.setMarketplaceError('fetch failed');
    const out = strip(renderRaw(panel));
    expect(out).toContain('Marketplace unavailable: fetch failed');
    expect(out).toContain('Use the Custom tab');
  });

  it('installs from a URL typed on the Custom tab', () => {
    const { panel, onSelect } = makePanel({ initialTab: 'custom' });
    const out = strip(renderRaw(panel));
    expect(out).toContain('Install from a GitHub URL');
    expect(out).toContain('╭');

    for (const ch of 'https://github.com/owner/repo') {
      panel.handleInput(ch);
    }
    panel.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'install-source',
      source: 'https://github.com/owner/repo',
    });
  });

  it('toggles MCP servers from the MCP selector', () => {
    const selections: PluginMcpSelection[] = [];
    const picker = new PluginMcpSelectorComponent({
      info: {
        id: 'nighthawk-datasource',
        displayName: 'NightHawk Datasource',
        version: '1.0.0',
        enabled: true,
        state: 'ok',
        skillCount: 1,
        mcpServerCount: 1,
        enabledMcpServerCount: 1,
        hookCount: 0,
      commandCount: 0,
        hasErrors: false,
        source: 'local-path',
        origin: 'custom',
        installedAt: '2026-05-29T00:00:00.000Z',
        root: '/plugins/nighthawk-datasource',
        manifest: undefined,
        skills: [],
        mcpServers: [
          {
            name: 'data',
            runtimeName: 'plugin-nighthawk-datasource-data',
            enabled: true,
            transport: 'stdio',
            command: 'node',
            args: ['./bin/nighthawk-datasource.mjs'],
            cwd: '/plugins/nighthawk-datasource',
          },
        ],
        diagnostics: [],
      },
      onSelect: (selection) => {
        selections.push(selection);
      },
      onCancel: vi.fn(),
    });

    const raw = renderRaw(picker);
    const out = strip(raw);
    expect(out).toContain('MCP servers (1/1 enabled)');
    expect(out).toContain('? data  enabled');
    expect(out).toContain('Enter/Space enable/disable');

    picker.handleInput(' ');

    expect(selections).toEqual([
      { kind: 'toggle', pluginId: 'nighthawk-datasource', server: 'data', enabled: false },
    ]);
  });

  it('defaults process confirmation to cancel and shows the interruption warning', () => {
    const onDone = vi.fn();
    const picker = new PluginStopProcessesConfirmComponent({ label: 'NightHawk Computer Use', onDone });
    const out = renderRaw(picker);
    expect(strip(out)).toContain('Stop running processes for NightHawk Computer Use?');
    expect(strip(out)).toContain('  ? Cancel');
    expect(strip(out)).toContain('interrupt any computer operations in progress');
    picker.handleInput('\r');
    expect(onDone).toHaveBeenCalledWith(false);
  });

  it('requires selecting the stop option and pressing Enter; Escape cancels', () => {
    const onDone = vi.fn();
    const picker = new PluginStopProcessesConfirmComponent({ label: 'NightHawk Computer Use', onDone });
    picker.focused = true;
    picker.handleInput('\u001B[B');
    expect(renderRaw(picker)).toContain(dangerShortcut('Stop processes and continue'));
    picker.handleInput(' ');
    expect(onDone).not.toHaveBeenCalled();
    picker.handleInput('\r');
    expect(onDone).toHaveBeenCalledWith(true);
    onDone.mockClear();
    picker.handleInput('\u001B');
    expect(onDone).toHaveBeenCalledWith(false);
    expect(picker.render(30).every((line) => strip(line).length <= 30)).toBe(true);
  });

  it('defaults plugin removal confirmation to cancel', () => {
    const results: PluginRemoveConfirmResult[] = [];
    const picker = new PluginRemoveConfirmComponent({
      id: 'nighthawk-datasource',
      displayName: 'NightHawk Datasource',
      onDone: (result) => {
        results.push(result);
      },
    });

    const out = picker.render(120).map(strip);
    expect(out).toContain(' Remove NightHawk Datasource (nighthawk-datasource)?');
    expect(out).toContain('  ? Cancel');
    expect(out).toContain('    Keep this plugin installed.');
    expect(out).toContain('    Remove only the install record; plugin files are left in place.');

    picker.handleInput('\r');
    expect(results).toEqual([{ kind: 'cancel' }]);
  });

  it('confirms plugin removal only after choosing remove', () => {
    const results: PluginRemoveConfirmResult[] = [];
    const picker = new PluginRemoveConfirmComponent({
      id: 'nighthawk-datasource',
      displayName: 'NightHawk Datasource',
      onDone: (result) => {
        results.push(result);
      },
    });

    picker.focused = true;
    picker.handleInput('\u001B[B');
    const raw = renderRaw(picker);
    expect(strip(raw)).toContain('Enter/Space select');
    // The destructive option label keeps its danger styling (error + bold).
    expect(raw).toContain(dangerShortcut('Remove plugin'));

    picker.handleInput('\r');

    expect(results).toEqual([{ kind: 'confirm' }]);
  });

  it('defaults the third-party install trust prompt to exit', () => {
    const results: PluginInstallTrustConfirmResult[] = [];
    const picker = new PluginInstallTrustConfirmComponent({
      label: 'Superpowers',
      onDone: (result) => {
        results.push(result);
      },
    });

    const raw = renderRaw(picker);
    const out = raw.split('\n').map(strip);
    expect(out).toContain(' Install third-party plugin Superpowers?');
    expect(out).toContain('  ? Exit');
    expect(out).toContain('    Cancel the installation.');
    expect(out).toContain('    Install this third-party plugin anyway.');
    // The warning explains why confirmation is required and uses the
    // design-system warning color rather than muted/default text.
    expect(out.some((line) => line.includes('NightHawk has not reviewed'))).toBe(true);
    expect(out.some((line) => line.includes('trust the source'))).toBe(true);
    expect(raw).toContain(warningMark());

    picker.handleInput('\r');
    expect(results).toEqual([{ kind: 'cancel' }]);
  });

  it('installs a third-party plugin only after switching to trust', () => {
    const results: PluginInstallTrustConfirmResult[] = [];
    const picker = new PluginInstallTrustConfirmComponent({
      label: 'Superpowers',
      onDone: (result) => {
        results.push(result);
      },
    });

    picker.focused = true;
    picker.handleInput('\u001B[B');
    const raw = renderRaw(picker);
    expect(strip(raw)).toContain('Enter/Space select');
    // The opt-in option keeps its danger styling (error + bold).
    expect(raw).toContain(dangerShortcut('Trust and install'));

    picker.handleInput('\r');

    expect(results).toEqual([{ kind: 'confirm' }]);
  });
});
