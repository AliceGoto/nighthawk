import type { Terminal } from '@nighthawk/pi-tui';
import { describe, expect, it, vi } from 'vitest';

import { SwarmMemberViewer } from '#/tui/components/dialogs/swarm-member-viewer';
import type { SwarmMemberView } from '#/tui/components/dialogs/swarm-browser';
import type { SubagentActivityRecord } from '#/tui/controllers/subagent-activity-store';

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

function member(overrides: Partial<SwarmMemberView> = {}): SwarmMemberView {
  return {
    id: '001',
    agentId: 'agent-1',
    phase: 'running',
    itemText: 'Review src/a.ts for hygiene.',
    latestModelText: 'scanning imports…',
    ...overrides,
  } satisfies SwarmMemberView;
}

function record(): SubagentActivityRecord {
  return {
    agentId: 'agent-1',
    agentName: 'explore',
    description: 'Review src/a.ts',
    status: 'running',
    steps: [{ step: 1, textTail: 'reading module', toolCalls: [] }],
    totalSteps: 1,
  } satisfies SubagentActivityRecord;
}

function callbacks() {
  return {
    onClose: vi.fn(),
    onStopMember: vi.fn(),
    onStopSwarm: vi.fn(),
    onSendMessage: vi.fn(),
  };
}

describe('SwarmMemberViewer', () => {
  it('renders task text, live output and terminal result', () => {
    const component = new SwarmMemberViewer(
      {
        member: member({
          phase: 'completed',
          completedText: 'all checks passed',
        }),
        swarmDescription: 'review changed files',
        record: undefined,
        ...callbacks(),
      },
      fakeTerminal(30),
    );

    const output = strip(component.render(120).join('\n'));
    expect(output).toContain('Review src/a.ts for hygiene.');
    expect(output).toContain('scanning imports…');
    expect(output).toContain('all checks passed');
    expect(output).toContain('agent-1');
  });

  it('renders the activity record summary when present', () => {
    const component = new SwarmMemberViewer(
      {
        member: member(),
        swarmDescription: 'review changed files',
        record: record(),
        ...callbacks(),
      },
      fakeTerminal(30),
    );

    const output = strip(component.render(120).join('\n'));
    expect(output).toContain('reading module');
  });

  it('fires onStopMember and onStopSwarm from the action keys', () => {
    const cb = callbacks();
    const component = new SwarmMemberViewer(
      {
        member: member(),
        swarmDescription: 'review changed files',
        record: undefined,
        ...cb,
      },
      fakeTerminal(30),
    );

    component.handleInput('s');
    expect(cb.onStopMember).toHaveBeenCalledWith('agent-1');
    component.handleInput('x');
    expect(cb.onStopSwarm).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const cb = callbacks();
    const component = new SwarmMemberViewer(
      {
        member: member(),
        swarmDescription: 'review changed files',
        record: undefined,
        ...cb,
      },
      fakeTerminal(30),
    );

    component.handleInput('\u001B');
    expect(cb.onClose).toHaveBeenCalled();
  });

  it('enters talk mode with c and sends the message on Enter', () => {
    const cb = callbacks();
    const component = new SwarmMemberViewer(
      {
        member: member(),
        swarmDescription: 'review changed files',
        record: undefined,
        ...cb,
      },
      fakeTerminal(30),
    );

    component.handleInput('c');
    expect(strip(component.render(120).join('\n'))).toContain('对话 >');
    component.handleInput('h');
    component.handleInput('i');
    component.handleInput('\r');
    expect(cb.onSendMessage).toHaveBeenCalledTimes(1);
    const sent = cb.onSendMessage.mock.calls[0]?.[0] as string;
    expect(sent).toContain('hi');
  });

  it('leaves talk mode without sending on Escape', () => {
    const cb = callbacks();
    const component = new SwarmMemberViewer(
      {
        member: member(),
        swarmDescription: 'review changed files',
        record: undefined,
        ...cb,
      },
      fakeTerminal(30),
    );

    component.handleInput('c');
    component.handleInput('\u001B');
    expect(cb.onSendMessage).not.toHaveBeenCalled();
    expect(strip(component.render(120).join('\n'))).not.toContain('对话 >');
  });
});