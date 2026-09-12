/**
 * SwarmBrowserApp — full-screen alt-screen takeover for browsing agent
 * swarms, replacing the text-only `/swarm-status` summary. Two stacked
 * frames: the top lists clusters (description + active/completed/failed
 * statistics), the bottom lists the selected cluster's members (id, phase,
 * item text). Selecting a member and pressing Enter/O opens the member
 * detail viewer; `c` starts a conversation with the member's subagent;
 * `s` stops the whole swarm (inline `y` confirmation).
 *
 * Data flows in via `setProps`; user actions fire the `on*` callbacks back
 * to the controller, following the `TasksBrowserApp` pattern.
 */

import {
  Container,
  Key,
  matchesKey,
  type Terminal,
  truncateToWidth,
  visibleWidth,
  type Focusable,
} from '@nighthawk/pi-tui';

import { SELECT_POINTER } from '@/tui/constant/symbols';
import { currentTheme } from '#/tui/theme';
import { printableChar } from '@/tui/utils/printable-key';
import type { AgentSwarmMember, AgentSwarmProgressComponent } from '../messages/agent-swarm-progress';
import type { SwarmProgressSummary } from '../../controllers/subagent-event-handler';

const ELLIPSIS = '…';

/** Auto-cancel the inline stop confirmation after this many ms. */
const STOP_CONFIRM_TIMEOUT_MS = 5_000;

/** Minimum dimensions before we just print a "too small" message. */
const MIN_WIDTH = 48;
const MIN_HEIGHT = 10;

export type SwarmMemberPhase =
  | 'pending'
  | 'queued'
  | 'suspended'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Display projection of one swarm member (from AgentSwarmMember). */
export interface SwarmMemberView {
  readonly id: string;
  readonly agentId?: string;
  readonly phase: SwarmMemberPhase;
  readonly itemText: string;
  readonly latestModelText: string;
  readonly completedText?: string;
  readonly failureText?: string;
  readonly suspendedReason?: string;
}

/** Display projection of one cluster. */
export interface SwarmSummaryView {
  readonly toolCallId: string;
  readonly description: string;
  readonly total: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly isFinished: boolean;
  readonly members: readonly SwarmMemberView[];
}

export type SwarmBrowserFocusPane = 'swarms' | 'members';

export interface SwarmBrowserProps {
  readonly swarms: readonly SwarmSummaryView[];
  readonly selectedSwarmIndex: number;
  readonly members: readonly SwarmMemberView[];
  readonly selectedMemberIndex: number;
  readonly flashMessage: string | undefined;
  readonly onSelectSwarm: (index: number) => void;
  readonly onSelectMember: (index: number) => void;
  readonly onRefresh: () => void;
  readonly onCancel: () => void;
  /** Fired when the user confirms a swarm stop via the inline `y` prompt. */
  readonly onStopSwarm: (toolCallId: string) => void;
  /** Fired when the user presses Enter/O on a selected member. */
  readonly onOpenMember: () => void;
  /** Fired when the user presses `c` on a member that has an agent binding. */
  readonly onTalkToMember: () => void;
}

export const PHASE_LABEL: Record<SwarmMemberPhase, string> = {
  pending: '排队中',
  queued: '排队中',
  suspended: '限流',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

export function phaseColor(phase: SwarmMemberPhase): 'success' | 'textDim' | 'error' | 'warning' {
  switch (phase) {
    case 'running':
      return 'success';
    case 'completed':
      return 'textDim';
    case 'failed':
      return 'error';
    case 'cancelled':
    case 'suspended':
      return 'warning';
    case 'pending':
    case 'queued':
      return 'textDim';
  }
}

function singleLine(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}

function padToWidth(line: string, width: number): string {
  const w = visibleWidth(line);
  if (w === width) return line;
  if (w > width) return truncateToWidth(line, width, ELLIPSIS);
  return line + ' '.repeat(width - w);
}

/** Fit `line` into exactly `width` columns, even after CJK-edge truncation. */
function fitExactly(line: string, width: number): string {
  let s = line;
  if (visibleWidth(s) > width) s = truncateToWidth(s, width, ELLIPSIS);
  return padToWidth(s, width);
}

export class SwarmBrowserApp extends Container implements Focusable {
  focused = false;

  private props: SwarmBrowserProps;
  private readonly terminal: Terminal;
  private focus: SwarmBrowserFocusPane = 'swarms';
  private swarmScroll = 0;
  private memberScroll = 0;
  private pendingStopToolCallId: string | undefined = undefined;
  private pendingStopTimer: NodeJS.Timeout | undefined = undefined;

  constructor(props: SwarmBrowserProps, terminal: Terminal) {
    super();
    this.props = props;
    this.terminal = terminal;
  }

  setProps(next: SwarmBrowserProps): void {
    this.props = next;
    if (this.pendingStopToolCallId !== undefined) {
      const swarm = next.swarms.find((s) => s.toolCallId === this.pendingStopToolCallId);
      if (swarm === undefined || swarm.isFinished) this.clearPendingStop();
    }
    this.invalidate();
  }

  private clearPendingStop(): void {
    this.pendingStopToolCallId = undefined;
    if (this.pendingStopTimer !== undefined) {
      clearTimeout(this.pendingStopTimer);
      this.pendingStopTimer = undefined;
    }
  }

  handleInput(data: string): void {
    const k = printableChar(data);

    if (this.pendingStopToolCallId !== undefined) {
      if (k === 'y' || k === 'Y') {
        const toolCallId = this.pendingStopToolCallId;
        this.clearPendingStop();
        this.props.onStopSwarm(toolCallId);
        this.invalidate();
        return;
      }
      this.clearPendingStop();
      this.invalidate();
      return;
    }

    if (matchesKey(data, Key.escape) || k === 'q' || k === 'Q') {
      this.props.onCancel();
      return;
    }
    if (matchesKey(data, Key.tab) || k === '\t') {
      this.focus = this.focus === 'swarms' ? 'members' : 'swarms';
      this.invalidate();
      return;
    }
    if (matchesKey(data, Key.up) || k === 'k') {
      this.moveSelection(-1);
      return;
    }
    if (matchesKey(data, Key.down) || k === 'j') {
      this.moveSelection(1);
      return;
    }
    if (k === 'r' || k === 'R') {
      this.props.onRefresh();
      return;
    }
    if (k === 's' || k === 'S') {
      const swarm = this.props.swarms[this.props.selectedSwarmIndex];
      if (swarm === undefined || swarm.isFinished) return;
      this.pendingStopToolCallId = swarm.toolCallId;
      this.pendingStopTimer = setTimeout(() => {
        this.clearPendingStop();
        this.invalidate();
      }, STOP_CONFIRM_TIMEOUT_MS);
      this.invalidate();
      return;
    }
    if (k === 'o' || k === 'O' || matchesKey(data, Key.enter)) {
      if (this.focus === 'members') {
        this.props.onOpenMember();
      }
      return;
    }
    if (k === 'c' || k === 'C') {
      if (this.focus === 'members') {
        this.props.onTalkToMember();
      }
      return;
    }
  }

  private moveSelection(delta: number): void {
    if (this.focus === 'swarms') {
      const count = this.props.swarms.length;
      if (count === 0) return;
      const next = clampIndex(this.props.selectedSwarmIndex + delta, count);
      if (next !== this.props.selectedSwarmIndex) this.props.onSelectSwarm(next);
      return;
    }
    const count = this.props.members.length;
    if (count === 0) return;
    const next = clampIndex(this.props.selectedMemberIndex + delta, count);
    if (next !== this.props.selectedMemberIndex) this.props.onSelectMember(next);
  }

  /**
   * Render the entire screen. Layout: header(1) + body(rows-2) + footer(1).
   */
  override render(width: number): string[] {
    const rows = Math.max(1, this.terminal.rows);
    if (width < MIN_WIDTH || rows < MIN_HEIGHT) {
      return this.renderTooSmall(width, rows);
    }

    const header = this.renderHeader(width);
    const footer = this.renderFooter(width);
    const bodyHeight = rows - 2;

    // Top frame = swarm list (~40% or 8 rows), bottom = members.
    const swarmHeight = Math.min(
      Math.max(6, Math.min(Math.floor(bodyHeight * 0.4), bodyHeight - 4)),
      Math.max(3, bodyHeight - 3),
    );
    const memberHeight = bodyHeight - swarmHeight;

    const swarmLines = this.renderSwarmFrame(width, swarmHeight);
    const memberLines = this.renderMemberFrame(width, memberHeight);

    const lines: string[] = [header];
    for (const line of swarmLines) lines.push(line);
    for (const line of memberLines) lines.push(line);
    lines.push(footer);
    return lines;
  }

  // ── header / footer ──────────────────────────────────────────────────

  private renderHeader(width: number): string {
    const title = currentTheme.boldFg('primary', ' SWARM BROWSER ');
    const totals = currentTheme.fg('textMuted', ` ${String(this.props.swarms.length)} swarms `);
    return fitExactly(title + totals, width);
  }

  private renderFooter(width: number): string {
    const key = (text: string): string => currentTheme.boldFg('primary', text);
    const dim = (text: string): string => currentTheme.fg('textMuted', text);

    if (this.pendingStopToolCallId !== undefined) {
      const warn = (text: string): string => currentTheme.boldFg('warning', text);
      const line =
        ` ${warn('Stop swarm')}? ` +
        `${key('Y')} ${dim('confirm')}  ${key('N')}${dim('/')}${key('esc')} ${dim('cancel')} `;
      return fitExactly(line, width);
    }

    const parts = [
      ` ${key('↑↓')} ${dim('select')}`,
      `${key('Tab')} ${dim('pane')}`,
      `${key('Enter/O')} ${dim('member')}`,
      `${key('C')} ${dim('talk')}`,
      `${key('S')} ${dim('stop swarm')}`,
      `${key('R')} ${dim('refresh')}`,
      `${key('Q/Esc')} ${dim('cancel')} `,
    ];
    const left = parts.join('  ');
    const flash = this.props.flashMessage;
    if (flash !== undefined && flash.length > 0) {
      const flashStyled = currentTheme.fg('warning', ` ${flash} `);
      const total = visibleWidth(left) + visibleWidth(flashStyled);
      if (total <= width) {
        return left + ' '.repeat(width - total) + flashStyled;
      }
    }
    return fitExactly(left, width);
  }

  // ── frame primitive ──────────────────────────────────────────────────

  /**
   * Render a framed box: `┌─ Title ─┐` top, `│ <content> │` sides, `└─┘`
   * bottom. Result is exactly `width × height` cells.
   */
  private renderFrame(
    title: string,
    content: readonly string[],
    width: number,
    height: number,
  ): string[] {
    if (height < 2 || width < 4) {
      const out: string[] = [];
      for (let i = 0; i < height; i++) out.push(' '.repeat(width));
      return out;
    }
    const innerWidth = width - 2;
    const innerHeight = height - 2;

    const titleStyled = currentTheme.boldFg('textStrong', title);
    const titleWidth = visibleWidth(titleStyled);
    const titleSegment = `─ ${titleStyled} `;
    const titleSegmentWidth = visibleWidth(titleSegment);
    const remainingDashes = Math.max(0, innerWidth - titleSegmentWidth);
    const topMid =
      titleWidth > 0 && titleSegmentWidth <= innerWidth
        ? currentTheme.fg('primary', '─ ') +
          titleStyled +
          ' ' +
          currentTheme.fg('primary', '─'.repeat(remainingDashes))
        : currentTheme.fg('primary', '─'.repeat(innerWidth));
    const top = currentTheme.fg('primary', '┌') + topMid + currentTheme.fg('primary', '┐');
    const bottom = currentTheme.fg('primary', '└' + '─'.repeat(innerWidth) + '┘');

    const lines: string[] = [top];
    for (let i = 0; i < innerHeight; i++) {
      const inner = content[i] ?? '';
      lines.push(
        currentTheme.fg('primary', '│') +
          fitExactly(inner, innerWidth) +
          currentTheme.fg('primary', '│'),
      );
    }
    lines.push(bottom);
    return lines;
  }

  // ── top: swarm list frame ────────────────────────────────────────────

  private renderSwarmFrame(width: number, height: number): string[] {
    const innerHeight = Math.max(0, height - 2);
    if (this.props.swarms.length === 0) {
      const lines: string[] = [
        currentTheme.fg('textMuted', '此会话中没有集群。发起 AgentSwarm 后在此查看。'),
      ];
      while (lines.length < innerHeight) lines.push('');
      return this.renderFrame('Swarms', lines, width, height);
    }

    this.adjustScroll(this.props.selectedSwarmIndex, this.swarmScroll, innerHeight, (scroll) => {
      this.swarmScroll = scroll;
    });
    const start = this.swarmScroll;
    const window = this.props.swarms.slice(start, start + innerHeight);

    const innerWidth = width - 2;
    const lines: string[] = [];
    for (const [vi, swarm] of window.entries()) {
      const index = start + vi;
      lines.push(this.renderSwarmRow(swarm, index === this.props.selectedSwarmIndex, innerWidth));
    }
    while (lines.length < innerHeight) lines.push('');

    return this.renderFrame('Swarms', lines, width, height);
  }

  private renderSwarmRow(
    swarm: SwarmSummaryView,
    selected: boolean,
    innerWidth: number,
  ): string {
    const pointer = selected ? `${SELECT_POINTER} ` : '  ';
    const pointerStyled = currentTheme.fg(selected ? 'primary' : 'textDim', pointer);
    const idText = selected
      ? currentTheme.boldFg('text', swarm.toolCallId)
      : currentTheme.fg('text', swarm.toolCallId);

    const stats: string[] = [];
    if (swarm.active > 0)
      stats.push(currentTheme.fg('success', `${String(swarm.active)} active`));
    if (swarm.completed > 0)
      stats.push(currentTheme.fg('textStrong', `${String(swarm.completed)} done`));
    if (swarm.failed > 0)
      stats.push(currentTheme.fg('error', `${String(swarm.failed)} failed`));
    const stateMark = swarm.isFinished
      ? currentTheme.fg('textMuted', ' [finished]')
      : currentTheme.fg('accent', ' [running]');
    const statsText = stats.join(' ') || currentTheme.fg('textMuted', 'idle');

    const prefix = `${pointerStyled}${idText} ${stateMark} ${statsText} `;
    const prefixWidth = visibleWidth(prefix);
    const descBudget = Math.max(0, innerWidth - prefixWidth - 1);
    if (descBudget < 6) return fitExactly(prefix, innerWidth);

    const desc = truncateToWidth(singleLine(swarm.description), descBudget, ELLIPSIS);
    return fitExactly(`${prefix} ${currentTheme.fg('textDim', desc)}`, innerWidth);
  }

  // ── bottom: member list frame ────────────────────────────────────────

  private renderMemberFrame(width: number, height: number): string[] {
    const innerHeight = Math.max(0, height - 2);
    if (
      this.props.selectedSwarmIndex < 0 ||
      this.props.selectedSwarmIndex >= this.props.swarms.length
    ) {
      const lines: string[] = [currentTheme.fg('textMuted', 'Select a swarm above.')];
      while (lines.length < innerHeight) lines.push('');
      return this.renderFrame('Members', lines, width, height);
    }

    const swarm = this.props.swarms[this.props.selectedSwarmIndex];
    if (swarm === undefined) {
      const lines: string[] = [currentTheme.fg('textMuted', 'Select a swarm above.')];
      while (lines.length < innerHeight) lines.push('');
      return this.renderFrame('Members', lines, width, height);
    }
    const members = swarm.members;
    if (members.length === 0) {
      const lines: string[] = [currentTheme.fg('textMuted', '暂无成员（等待子代理注册…）')];
      while (lines.length < innerHeight) lines.push('');
      return this.renderFrame('Members', lines, width, height);
    }

    this.adjustScroll(
      this.props.selectedMemberIndex,
      this.memberScroll,
      innerHeight,
      (scroll) => {
        this.memberScroll = scroll;
      },
    );
    const start = this.memberScroll;
    const window = members.slice(start, start + innerHeight);

    const innerWidth = width - 2;
    const lines: string[] = [];
    for (const [vi, member] of window.entries()) {
      const index = start + vi;
      lines.push(this.renderMemberRow(member, index === this.props.selectedMemberIndex, innerWidth));
    }
    while (lines.length < innerHeight) lines.push('');

    return this.renderFrame('Members', lines, width, height);
  }

  private renderMemberRow(
    member: SwarmMemberView,
    selected: boolean,
    innerWidth: number,
  ): string {
    const pointer = selected ? `${SELECT_POINTER} ` : '  ';
    const pointerStyled = currentTheme.fg(selected ? 'primary' : 'textDim', pointer);
    const idText = selected
      ? currentTheme.boldFg('primary', member.id)
      : currentTheme.fg('text', member.id);
    const badge = currentTheme.fg(phaseColor(member.phase), PHASE_LABEL[member.phase]);
    const agentTag =
      member.agentId === undefined
        ? ''
        : currentTheme.fg('textMuted', ` ${member.agentId}`);

    const prefix = `${pointerStyled}${idText} ${badge}${agentTag} `;
    const prefixWidth = visibleWidth(prefix);
    const textBudget = Math.max(0, innerWidth - prefixWidth - 1);
    if (textBudget < 6) return fitExactly(prefix, innerWidth);

    let body = member.itemText;
    if (body.length === 0) {
      if (member.completedText !== undefined && member.completedText.length > 0) {
        body = member.completedText;
      } else if (member.failureText !== undefined && member.failureText.length > 0) {
        body = member.failureText;
      } else {
        body = member.latestModelText;
      }
    }
    const desc = truncateToWidth(singleLine(body), textBudget, ELLIPSIS);
    return fitExactly(`${prefix} ${currentTheme.fg('text', desc)}`, innerWidth);
  }

  private adjustScroll(
    selectedIndex: number,
    currentScroll: number,
    visibleRows: number,
    setScroll: (scroll: number) => void,
  ): void {
    if (visibleRows <= 0) {
      setScroll(0);
      return;
    }
    let scroll = currentScroll;
    if (selectedIndex < scroll) {
      scroll = selectedIndex;
    } else if (selectedIndex >= scroll + visibleRows) {
      scroll = selectedIndex - visibleRows + 1;
    }
    const maxScroll = Math.max(0, scroll);
    if (scroll < 0) scroll = 0;
    if (scroll > maxScroll) scroll = maxScroll;
    setScroll(scroll);
  }

  // ── too-small fallback ──────────────────────────────────────────────

  private renderTooSmall(width: number, rows: number): string[] {
    const lines: string[] = [];
    const msg = currentTheme.fg(
      'error',
      `Terminal too small (need ≥ ${String(MIN_WIDTH)} × ${String(MIN_HEIGHT)})`,
    );
    lines.push(fitExactly(msg, width));
    for (let i = 1; i < rows; i++) lines.push(' '.repeat(width));
    return lines;
  }
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

/**
 * Project the live swarm progress state into display views for the browser.
 * Members are read straight off each swarm's progress component, so the
 * panel always reflects the same state the inline progress grid renders.
 */
export function projectSwarmViews(
  summaries: readonly SwarmProgressSummary[],
  progressMap: ReadonlyMap<string, AgentSwarmProgressComponent>,
): SwarmSummaryView[] {
  return summaries.map((summary) => ({
    toolCallId: summary.toolCallId,
    description: summary.description,
    total: summary.total,
    active: summary.active,
    completed: summary.completed,
    failed: summary.failed,
    cancelled: summary.cancelled,
    isFinished: summary.isFinished,
    members: (progressMap.get(summary.toolCallId)?.getMembers() ?? []).map((member) =>
      projectMember(member),
    ),
  }));
}

function projectMember(member: AgentSwarmMember): SwarmMemberView {
  return {
    id: member.id,
    agentId: member.agentId,
    phase: member.phase,
    itemText: member.itemText,
    latestModelText: member.latestModelText,
    completedText: member.completedText,
    failureText: member.failureText,
    suspendedReason: member.suspendedReason,
  };
}