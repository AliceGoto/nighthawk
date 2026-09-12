import type { Terminal } from '@nighthawk/pi-tui';
import { describe, expect, it, vi } from 'vitest';

import {
  SwarmBrowserApp,
  type SwarmSummaryView,
} from '#/tui/components/dialogs/swarm-browser';

const ANSI_SGR = /\[[0-9;]*m/g;
function strip(text: string): string {
  return text.replaceAll(ANSI_SGR, '');
}

/** Minimal Terminal stub — only `rows` is read by the component. */
function fakeTerminal(rows: number, columns = 120): Terminal {
  return {
    start: () => {},
    stop: () => {},
    drainInput: () => Promise.resolve(),
    write: () => {},
    get columns() {
      return columns;
    },
    get rows() {
      return rows;
    },
    get kittyProtocolActive() {
      return false;
    },
    moveBy: () => {},
    hideCursor: () => {},
    showCursor: () => {},
    clearLine: () => {},
    clearFromCursor: () => {},
    clearScreen: () => {},
    setTitle: () => {},
    setProgress: () => {},
  };
}

function sampleSwarm(overrides: Partial<SwarmSummaryView> = {}): SwarmSummaryView {
  return {
    toolCallId: 'call_1',
    description: 'review changed files',
    total: 3,
    active: 1,
    completed: 1,
    failed: 1,
    cancelled: 0,
    isFinished: false,
    members: [
      {
        id: '001',
        agentId: 'agent-1',
        phase: 'running',
        itemText: 'Review src/a.ts',
        latestModelText: 'checking imports…',
      },
      {
        id: '002',
        agentId: 'agent-2',
        phase: 'completed',
        itemText: 'Review src/b.ts',
        latestModelText: '',
        completedText: 'done',
      },
      {
        id: '003',
        agentId: undefined,
        phase: 'queued',
        itemText: 'Review src/c.ts',
        latestModelText: '',
      },
    ],
    ...overrides,
  } satisfies SwarmSummaryView;
}

function callbacks() {
  return {
    onSelectSwarm: vi.fn(),
    onSelectMember: vi.fn(),
    onRefresh: vi.fn(),
    onCancel: vi.fn(),
    onStopSwarm: vi.fn(),
    onOpenMember: vi.fn(),
    onTalkToMember: vi.fn(),
  };
}

describe('SwarmBrowserApp', () => {
  it('renders cluster summaries and member rows', () => {
    const component = new SwarmBrowserApp(
      {
        swarms: [sampleSwarm()],
        selectedSwarmIndex: 0,
        members: sampleSwarm().members,
        selectedMemberIndex: 0,
        flashMessage: undefined,
        ...callbacks(),
      },
      fakeTerminal(30),
    );

    const output = strip(component.render(120).join('\n'));
    expect(output).toContain('SWARM BROWSER');
    expect(output).toContain('review changed files');
    expect(output).toContain('Review src/a.ts');
    expect(output).toContain('001');
  });

  it('shows an empty state when no swarms exist', () => {
    const component = new SwarmBrowserApp(
      {
        swarms: [],
        selectedSwarmIndex: 0,
        members: [],
        selectedMemberIndex: 0,
        flashMessage: undefined,
        ...callbacks(),
      },
      fakeTerminal(30),
    );

    const output = strip(component.render(120).join('\n'));
    expect(output).toContain('没有集群');
  });

  it('fires onStopSwarm after inline y confirmation', () => {
    const cb = callbacks();
    const component = new SwarmBrowserApp(
      {
        swarms: [sampleSwarm()],
        selectedSwarmIndex: 0,
        members: sampleSwarm().members,
        selectedMemberIndex: 0,
        flashMessage: undefined,
        ...cb,
      },
      fakeTerminal(30),
    );

    component.handleInput('s');
    expect(strip(component.render(120).join('\n'))).toContain('Stop swarm');
    component.handleInput('y');
    expect(cb.onStopSwarm).toHaveBeenCalledWith('call_1');
  });

  it('opens the member viewer from the members pane', () => {
    const cb = callbacks();
    const component = new SwarmBrowserApp(
      {
        swarms: [sampleSwarm()],
        selectedSwarmIndex: 0,
        members: sampleSwarm().members,
        selectedMemberIndex: 0,
        flashMessage: undefined,
        ...cb,
      },
      fakeTerminal(30),
    );

    component.handleInput('\t'); // focus to members pane
    component.handleInput('o');
    expect(cb.onOpenMember).toHaveBeenCalled();
  });

  it('fires onTalkToMember from the members pane', () => {
    const cb = callbacks();
    const component = new SwarmBrowserApp(
      {
        swarms: [sampleSwarm()],
        selectedSwarmIndex: 0,
        members: sampleSwarm().members,
        selectedMemberIndex: 0,
        flashMessage: undefined,
        ...cb,
      },
      fakeTerminal(30),
    );

    component.handleInput('\t');
    component.handleInput('c');
    expect(cb.onTalkToMember).toHaveBeenCalled();
  });

  it('ignores stop on an already-finished swarm', () => {
    const cb = callbacks();
    const component = new SwarmBrowserApp(
      {
        swarms: [sampleSwarm({ isFinished: true })],
        selectedSwarmIndex: 0,
        members: sampleSwarm().members,
        selectedMemberIndex: 0,
        flashMessage: undefined,
        ...cb,
      },
      fakeTerminal(30),
    );

    component.handleInput('s');
    component.handleInput('y');
    expect(cb.onStopSwarm).not.toHaveBeenCalled();
    expect(strip(component.render(120).join('\n'))).not.toContain('Stop swarm');
  });
});