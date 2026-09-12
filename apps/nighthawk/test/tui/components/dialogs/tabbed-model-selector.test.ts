import type { ModelAlias } from '@nighthawk/nighthawk-sdk';
import chalk from 'chalk';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { TabbedModelSelectorComponent } from '#/tui/components/dialogs/tabbed-model-selector';
import { currentTheme } from '#/tui/theme';
import { darkColors, lightColors } from '#/tui/theme/colors';

const ESC = String.fromCodePoint(27);
const SGR = new RegExp(`${ESC}\\[[0-9;]*m`, 'g');
const strip = (s: string): string => s.replaceAll(SGR, '');
const TAB = '\t';
const RIGHT = `${ESC}[C`;
// chalk.bgHex(colors.primary) → background truecolor for #F3F3F3.
const PRIMARY_BG = '48;2;243;243;243';

function model(displayName: string, provider: string): ModelAlias {
  return {
    provider,
    model: displayName.toLowerCase().replaceAll(' ', '-'),
    maxContextSize: 200_000,
    displayName,
    capabilities: ['thinking'],
  } as unknown as ModelAlias;
}

function make(): {
  component: TabbedModelSelectorComponent;
  onSelect: ReturnType<typeof vi.fn>;
} {
  const onSelect = vi.fn();
  const component = new TabbedModelSelectorComponent({
    models: {
      k2: model('K2 Coding', 'managed:nighthawk'),
      gpt: model('GPT-5', 'openai'),
    },
    currentValue: 'k2',
    currentThinkingEffort: 'off',
    onSelect,
    onCancel: vi.fn(),
  });
  component.focused = true;
  return { component, onSelect };
}

describe('TabbedModelSelectorComponent', () => {
  let previousLevel: typeof chalk.level;
  const previousPalette = currentTheme.palette;
  beforeAll(() => {
    previousLevel = chalk.level;
    chalk.level = 3;
    currentTheme.setPalette(darkColors);
  });
  afterAll(() => {
    chalk.level = previousLevel;
    currentTheme.setPalette(previousPalette);
  });

  it('renders an "All" + per-provider tab strip', () => {
    const out = strip(make().component.render(120).join('\n'));
    expect(out).toContain('All');
    expect(out).toContain('NightHawk');
    expect(out).toContain('openai');
  });

  it('highlights the active tab with a filled background (AskUserQuestion style)', () => {
    // The component opens on the All tab by default; its cell carries the
    // primary background SGR.
    const raw = make().component.render(120).join('\n');
    expect(raw).toContain(PRIMARY_BG);
  });

  it('repaints the tab strip from the current theme palette without remounting', () => {
    const { component } = make();
    const stripLine = (lines: string[]): string =>
      lines.find((l) => l.includes('All') && l.includes('openai')) ?? '';
    const previous = currentTheme.palette;
    try {
      currentTheme.setPalette(darkColors);
      const darkStrip = stripLine(component.render(120));
      currentTheme.setPalette(lightColors);
      const lightStrip = stripLine(component.render(120));
      // The strip is drawn from currentTheme.palette at render time; a
      // construction-time palette snapshot would render the same strip after
      // the switch.
      expect(darkStrip).not.toBe(lightStrip);
    } finally {
      currentTheme.setPalette(previous);
    }
  });

  it('opens on the All tab by default (showing every provider\'s models)', () => {
    const out = strip(make().component.render(120).join('\n'));
    expect(out).toContain('K2 Coding');
    expect(out).toContain('GPT-5');
  });

  it('cycles provider tabs with Tab', () => {
    const { component } = make();
    // tabs = [All, NightHawk, openai]; active starts on All.
    // Two Tabs → openai, whose list shows GPT-5 and not K2 Coding.
    component.handleInput(TAB);
    component.handleInput(TAB);
    const out = strip(component.render(120).join('\n'));
    expect(out).toContain('GPT-5');
    expect(out).not.toContain('K2 Coding');
  });

  it('refreshes the active provider tab on "r", keeping "r" a search key elsewhere', () => {
    const onRefresh = vi.fn(async () => undefined);
    const component = new TabbedModelSelectorComponent({
      models: {
        k2: model('K2 Coding', 'managed:nighthawk'),
        gpt: model('GPT-5', 'openai'),
      },
      currentValue: 'k2',
      currentThinkingEffort: 'off',
      onRefresh,
      onSelect: vi.fn(),
      onCancel: vi.fn(),
    });

    // All tab: no single provider to refresh, so 'r' stays a search key.
    component.handleInput('r');
    expect(onRefresh).not.toHaveBeenCalled();
    expect(strip(component.render(120).join('\n'))).toContain('Search: r');

    // Provider tab with an idle search box: 'r' refreshes it.
    component.handleInput(TAB); // All -> NightHawk
    component.handleInput('r');
    expect(onRefresh).toHaveBeenCalledWith('managed:nighthawk');
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // With an active query the character keeps typing instead.
    component.handleInput('g');
    component.handleInput('r');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(strip(component.render(120).join('\n'))).toContain('Search: gr');
  });

  it('advertises the "r" refresh key on provider tabs only when onRefresh is set', () => {
    const component = new TabbedModelSelectorComponent({
      models: { k2: model('K2 Coding', 'managed:nighthawk') },
      currentValue: 'k2',
      currentThinkingEffort: 'off',
      onRefresh: vi.fn(),
      onSelect: vi.fn(),
      onCancel: vi.fn(),
    });

    // The All tab keeps 'r' as a search key, so no refresh hint there.
    expect(strip(component.render(120).join('\n'))).not.toContain('r 刷新模型');
    component.handleInput(TAB); // All -> NightHawk
    expect(strip(component.render(120).join('\n'))).toContain('r 刷新模型');
  });

  it('rebuilds the model dictionary in place, keeping the active tab', () => {
    const { component } = make();
    component.handleInput(TAB); // All -> NightHawk tab
    component.refreshModels({
      k2: model('K2 Coding', 'managed:nighthawk'),
      gpt: model('GPT-5', 'openai'),
      gem: model('Gemini 3', 'google'),
    });
    const out = strip(component.render(120).join('\n'));
    // The new provider joins the tab strip…
    expect(out).toContain('google');
    // …while the still-active NightHawk tab lists only its own models.
    expect(out).toContain('K2 Coding');
    expect(out).not.toContain('GPT-5');
    // The rebuilt google tab carries the refreshed model.
    component.handleInput(TAB); // NightHawk -> openai
    component.handleInput(TAB); // openai -> google
    expect(strip(component.render(120).join('\n'))).toContain('Gemini 3');
  });

  it('forwards thinking toggle (←/→) and selection (Enter) to the active tab', () => {
    const { component, onSelect } = make();
    component.handleInput(RIGHT); // toggle thinking on for k2
    component.handleInput('\r');
    expect(onSelect).toHaveBeenCalledWith({ alias: 'k2', thinking: 'on' });
  });

  it('frames the tab strip with a blank line above and below it', () => {
    const lines = make().component.render(120).map(strip);
    const hintIdx = lines.findIndex((l) => l.includes('navigate') && l.includes('Esc cancel'));
    const stripIdx = lines.findIndex((l) => l.includes('All') && l.includes('openai'));
    expect(hintIdx).toBeGreaterThanOrEqual(0);
    expect(lines[hintIdx + 1]).toBe(''); // blank between hint and tabs
    expect(stripIdx).toBe(hintIdx + 2);
    expect(lines[stripIdx + 1]).toBe(''); // blank between tabs and list
  });

  it('mentions the Tab provider switch first in the hint line', () => {
    const lines = make().component.render(120).map(strip);
    const hint = lines.find((l) => l.includes('navigate') && l.includes('Esc cancel'));
    expect(hint).toBeDefined();
    expect(hint).toContain('Tab toggle provider');
    // It comes first, before the navigation hint.
    expect(hint!.indexOf('Tab toggle provider')).toBeLessThan(hint!.indexOf('↑↓ navigate'));
  });

  it('renders the default title, and a custom title when provided', () => {
    expect(strip(make().component.render(120).join('\n'))).toContain('Select a model');

    const titled = new TabbedModelSelectorComponent({
      models: { k2: model('K2 Coding', 'managed:nighthawk') },
      currentValue: 'k2',
      currentThinkingEffort: 'off',
      title: ' Choose a model for this task',
      onSelect: vi.fn(),
      onCancel: vi.fn(),
    });
    const out = strip(titled.render(120).join('\n'));
    expect(out).toContain('Choose a model for this task');
    expect(out).not.toContain('Select a model ');
  });

  it('keeps the tab strip between hint and list when a warning line is present', () => {
    const component = new TabbedModelSelectorComponent({
      models: {
        k2: model('K2 Coding', 'managed:nighthawk'),
        gpt: model('GPT-5', 'openai'),
      },
      currentValue: 'k2',
      currentThinkingEffort: 'off',
      warning: 'Switching may increase token usage.',
      onSelect: vi.fn(),
      onCancel: vi.fn(),
    });
    const lines = component.render(120).map(strip);
    const hintIdx = lines.findIndex((l) => l.includes('navigate') && l.includes('Esc cancel'));
    expect(lines[hintIdx + 1]).toContain('Switching may increase token usage.');
    expect(lines[hintIdx + 2]).toBe(''); // blank between warning and tabs
    const stripIdx = lines.findIndex((l) => l.includes('All') && l.includes('openai'));
    expect(stripIdx).toBe(hintIdx + 3);
    expect(lines[stripIdx + 1]).toBe(''); // blank between tabs and list
    expect(lines.findIndex((l) => l.includes('K2 Coding'))).toBeGreaterThan(stripIdx);
  });
});
