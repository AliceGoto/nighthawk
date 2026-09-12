/**
 * SwarmMemberViewer — full-screen detail view for one swarm member — the
 * "split TUI" opened from SwarmBrowserApp. Shows the member's task text,
 * live model output, terminal result, and (when a record exists) its
 * step activity. A bottom input line starts a conversation with the
 * member's subagent (`c` to enter, Enter to send, Esc to leave); `s`
 * cancels that single member and `x` cancels the whole swarm.
 */

import {
  Container,
  Input,
  Key,
  matchesKey,
  type Focusable,
  type Terminal,
  truncateToWidth,
  visibleWidth,
} from '@nighthawk/pi-tui';

import { MESSAGE_INDENT } from '#/tui/constant/rendering';
import type { SubagentActivityRecord } from '#/tui/controllers/subagent-activity-store';
import { currentTheme } from '#/tui/theme';
import { printableChar } from '#/tui/utils/printable-key';
import type { SwarmMemberView } from './swarm-browser';
import { PHASE_LABEL, phaseColor } from './swarm-browser';

const ELLIPSIS = '…';

export interface SwarmMemberViewerProps {
  readonly member: SwarmMemberView;
  readonly swarmDescription: string;
  readonly record: SubagentActivityRecord | undefined;
  readonly onClose: () => void;
  /** Cancel the member's subagent turn; only called when agentId exists. */
  readonly onStopMember: (agentId: string) => void;
  /** Cancel the whole swarm (aborts the parent turn's tool execution). */
  readonly onStopSwarm: () => void;
  readonly onSendMessage: (text: string) => void;
}

function padToWidth(line: string, width: number): string {
  const w = visibleWidth(line);
  if (w === width) return line;
  if (w > width) return truncateToWidth(line, width, ELLIPSIS);
  return line + ' '.repeat(width - w);
}

function fitExactly(line: string, width: number): string {
  let s = line;
  if (visibleWidth(s) > width) s = truncateToWidth(s, width, ELLIPSIS);
  return padToWidth(s, width);
}

export class SwarmMemberViewer extends Container implements Focusable {
  focused = false;

  private props: SwarmMemberViewerProps;
  private readonly terminal: Terminal;
  private readonly input = new Input();
  private inputMode = false;
  private scrollTop = 0;
  /** Stick to the bottom on updates until the user scrolls away. */
  private followTail = true;
  private lines: string[] = [];
  private lastCacheKey = '';

  constructor(props: SwarmMemberViewerProps, terminal: Terminal) {
    super();
    this.props = props;
    this.terminal = terminal;
    this.input.onSubmit = (value) => {
      this.inputMode = false;
      this.input.setValue('');
      const text = value.trim();
      if (text.length > 0) this.props.onSendMessage(text);
      this.followTail = true;
      this.invalidate();
    };
  }

  setProps(next: SwarmMemberViewerProps): void {
    this.props = next;
    this.invalidate();
  }

  override invalidate(): void {
    this.lastCacheKey = '';
    super.invalidate();
  }

  // ── input ──────────────────────────────────────────────────────────

  handleInput(data: string): void {
    if (this.inputMode) {
      if (matchesKey(data, Key.escape)) {
        this.inputMode = false;
        this.input.setValue('');
        this.invalidate();
        return;
      }
      this.input.handleInput(data);
      return;
    }

    const visible = this.viewableRows();
    const k = printableChar(data);

    if (matchesKey(data, Key.escape) || k === 'q' || k === 'Q') {
      this.props.onClose();
      return;
    }
    if (k === 'c' || k === 'C') {
      this.inputMode = true;
      this.input.setValue('');
      this.invalidate();
      return;
    }
    if (k === 's' || k === 'S') {
      const agentId = this.props.member.agentId;
      if (agentId !== undefined) this.props.onStopMember(agentId);
      return;
    }
    if (k === 'x' || k === 'X') {
      this.props.onStopSwarm();
      return;
    }
    if (matchesKey(data, Key.up) || k === 'k') {
      this.scrollBy(-1);
      return;
    }
    if (matchesKey(data, Key.down) || k === 'j') {
      this.scrollBy(1);
      return;
    }
    if (
      matchesKey(data, Key.pageUp) ||
      matchesKey(data, Key.ctrl('u')) ||
      k === ' ' ||
      data === '\u0002' /* C-b */
    ) {
      this.scrollBy(-Math.max(1, visible - 1));
      return;
    }
    if (
      matchesKey(data, Key.pageDown) ||
      matchesKey(data, Key.ctrl('d')) ||
      data === '\u0006' /* C-f */
    ) {
      this.scrollBy(Math.max(1, visible - 1));
      return;
    }
    if (matchesKey(data, Key.home) || k === 'g') {
      this.scrollTo(0);
      return;
    }
    if (matchesKey(data, Key.end) || k === 'G') {
      this.scrollTo(this.maxScroll());
      return;
    }
  }

  private scrollBy(delta: number): void {
    this.scrollTo(this.scrollTop + delta);
  }

  private scrollTo(target: number): void {
    this.scrollTop = Math.max(0, Math.min(target, this.maxScroll()));
    this.followTail = this.scrollTop >= this.maxScroll();
    this.invalidate();
  }

  private maxScroll(): number {
    return Math.max(0, this.lines.length - this.viewableRows());
  }

  /** Content rows inside the body frame: rows minus header(1), input(1),
   *  footer(1), top border(1), bottom border(1). */
  private viewableRows(): number {
    return Math.max(1, this.terminal.rows - 5);
  }

  // ── body assembly ──────────────────────────────────────────────────

  private cacheKey(innerWidth: number): string {
    const member = this.props.member;
    return [
      String(innerWidth),
      member.id,
      member.phase,
      member.agentId ?? '',
      this.props.record?.version ?? -1,
    ].join('|');
  }

  private buildLines(innerWidth: number): string[] {
    const member = this.props.member;
    const out: string[] = [];

    if (member.itemText.length > 0) {
      out.push(currentTheme.boldFg('text', 'Task'));
      out.push(
        ...wrapLines(member.itemText, innerWidth).map((line) =>
          currentTheme.fg('text', line),
        ),
      );
      out.push('');
    }

    if (member.latestModelText.length > 0) {
      out.push(currentTheme.boldFg('primary', 'Live output'));
      out.push(
        ...wrapLines(member.latestModelText, innerWidth).map((line) =>
          currentTheme.fg('text', line),
        ),
      );
      out.push('');
    }

    if (member.completedText !== undefined && member.completedText.length > 0) {
      out.push(currentTheme.boldFg('success', 'Result'));
      out.push(
        ...wrapLines(member.completedText, innerWidth).map((line) =>
          currentTheme.fg('text', line),
        ),
      );
      out.push('');
    }
    if (member.failureText !== undefined && member.failureText.length > 0) {
      out.push(currentTheme.boldFg('error', 'Failed'));
      out.push(
        ...wrapLines(member.failureText, innerWidth).map((line) =>
          currentTheme.fg('error', line),
        ),
      );
      out.push('');
    }

    const record = this.props.record;
    if (record !== undefined && record.steps.length > 0) {
      out.push(currentTheme.boldFg('primary', `Activity (${record.status})`));
      for (const step of record.steps) {
        out.push(currentTheme.dim(`── step ${String(step.step)} ──`));
        if (step.textTail.trim().length > 0) {
          out.push(...wrapLines(step.textTail.trim(), innerWidth));
        }
        for (const call of step.toolCalls) {
          const mark =
            call.status === 'done' ? '✓' : call.status === 'error' ? '✗' : '●';
          out.push(
            currentTheme.fg('text', `${MESSAGE_INDENT}${mark} ${call.name}`),
          );
        }
        out.push('');
      }
    }

    if (out.length === 0) {
      out.push(currentTheme.dim(`${MESSAGE_INDENT}Waiting for activity…`));
    }
    return out;
  }

  // ── render ─────────────────────────────────────────────────────────

  override render(width: number): string[] {
    const rows = Math.max(4, this.terminal.rows);
    const bodyHeight = rows - 3;
    const innerWidth = Math.max(1, width - 4);

    const key = this.cacheKey(innerWidth);
    if (key !== this.lastCacheKey) {
      this.lines = this.buildLines(innerWidth);
      this.lastCacheKey = key;
    }
    if (this.followTail) this.scrollTop = this.maxScroll();

    const header = this.renderHeader(width);
    const body = this.renderBody(width, bodyHeight);
    const inputLine = this.renderInputLine(width);
    const footer = this.renderFooter(width, bodyHeight);

    const out: string[] = [header];
    for (const line of body) out.push(line);
    out.push(inputLine);
    out.push(footer);
    return out;
  }

  private renderHeader(width: number): string {
    const member = this.props.member;
    const swipe = `${swarmPreview(this.props.swarmDescription)} › #${member.id}`;
    const badge = currentTheme.fg(phaseColor(member.phase), PHASE_LABEL[member.phase]);
    const agentTag =
      member.agentId === undefined ? '' : currentTheme.fg('textMuted', ` ${member.agentId}`);
    const composed =
      currentTheme.boldFg('primary', ' Swarm member ') +
      currentTheme.boldFg('text', swipe) +
      ' ' +
      badge +
      agentTag;
    return fitExactly(composed, width);
  }

  private renderBody(width: number, bodyHeight: number): string[] {
    const innerWidth = Math.max(1, width - 4);

    const max = this.maxScroll();
    if (this.scrollTop > max) this.scrollTop = max;
    if (this.scrollTop < 0) this.scrollTop = 0;

    const viewRows = Math.max(1, bodyHeight - 2);
    const top = currentTheme.fg('primary', '┌' + '─'.repeat(Math.max(0, width - 2)) + '┐');
    const bottom = currentTheme.fg('primary', '└' + '─'.repeat(Math.max(0, width - 2)) + '┘');

    const out: string[] = [top];
    for (let i = 0; i < viewRows; i++) {
      const lineIndex = this.scrollTop + i;
      const raw = this.lines[lineIndex] ?? '';
      const inner = fitExactly(raw, innerWidth);
      out.push(currentTheme.fg('primary', '│ ') + inner + currentTheme.fg('primary', ' │'));
    }
    out.push(bottom);
    return out;
  }

  private renderInputLine(width: number): string {
    if (!this.inputMode) {
      return fitExactly(currentTheme.fg('textMuted', ' c 对话 · s 终止成员 · x 终止集群 '), width);
    }
    const inputWidth = Math.max(10, width - 8);
    const inputText = this.input.render(inputWidth)[0] ?? '';
    const line = currentTheme.boldFg('primary', ` 对话 > `) + inputText;
    return fitExactly(line, width);
  }

  private renderFooter(width: number, bodyHeight: number): string {
    const key = (text: string): string => currentTheme.boldFg('primary', text);
    const dim = (text: string): string => currentTheme.fg('textMuted', text);

    const total = this.lines.length;
    const viewRows = Math.max(1, bodyHeight - 2);
    const maxScroll = Math.max(0, total - viewRows);
    const percent = maxScroll === 0 ? 100 : Math.round((this.scrollTop / maxScroll) * 100);
    const lineFrom = total === 0 ? 0 : this.scrollTop + 1;
    const lineTo = Math.min(total, this.scrollTop + viewRows);

    const position = currentTheme.fg(
      'textMuted',
      ` ${String(lineFrom)}-${String(lineTo)} / ${String(total)} (${String(percent)}%) `,
    );
    const keys =
      `${key('↑↓')} ${dim('scroll')}  ` +
      `${key('C')} ${dim('talk')}  ` +
      `${key('S')} ${dim('stop member')}  ` +
      `${key('X')} ${dim('stop swarm')}  ` +
      `${key('Q/Esc')} ${dim('back')}`;
    const left = ` ${keys}`;
    const leftW = visibleWidth(left);
    const rightW = visibleWidth(position);
    if (leftW + 2 + rightW <= width) {
      return left + ' '.repeat(width - leftW - rightW) + position;
    }
    return fitExactly(left, width);
  }
}

function swarmPreview(description: string): string {
  const s = description.replaceAll(/\s+/g, ' ').trim();
  return s.length === 0 ? '(swarm)' : s;
}

function wrapLines(text: string, width: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (rawLine.length === 0) {
      lines.push('');
      continue;
    }
    let rest = rawLine;
    while (visibleWidth(rest) > width) {
      const cut = Math.max(1, truncateIndex(rest, width));
      lines.push(truncateToWidth(rest, width, ''));
      rest = rest.slice(cut);
    }
    lines.push(rest);
  }
  return lines;
}

function truncateIndex(text: string, width: number): number {
  let w = 0;
  for (let i = 0; i < text.length; i += 1) {
    const cw = visibleWidth(text[i] ?? '');
    if (w + cw > width) return i;
    w += cw;
  }
  return text.length;
}