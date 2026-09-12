/**
 * SwarmBrowserController — wires the `/swarm-status` command to a full-screen
 * interactive swarm browser (SwarmBrowserApp), following the
 * TasksBrowserController pattern: 1s polling refresh, inline stop
 * confirmation, and a member detail viewer (SwarmMemberViewer) that can
 * cancel a single member, cancel the whole swarm, or start a conversation
 * with the member's subagent.
 */

import type { NighthawkHarness, Session } from '@nighthawk/nighthawk-sdk';
import type { ProcessTerminal, TUI } from '@nighthawk/pi-tui';

import {
  SwarmBrowserApp,
  projectSwarmViews,
  type SwarmBrowserProps,
  type SwarmSummaryView,
} from '../components/dialogs/swarm-browser';
import { SwarmMemberViewer } from '../components/dialogs/swarm-member-viewer';
import { beginScreenTakeover, endScreenTakeover, type ScreenTakeover } from '../utils/screen-takeover';
import type { Theme } from '#/tui/theme';
import type { CustomEditor } from '../components/editor/custom-editor';
import type { SessionEventHandler } from './session-event-handler';

export interface SwarmBrowserHost {
  readonly state: {
    readonly theme: Theme;
    readonly terminal: ProcessTerminal;
    readonly ui: TUI;
    readonly editor: CustomEditor;
    readonly swarmBrowser: SwarmBrowserState | undefined;
  };
  readonly harness: NighthawkHarness;
  readonly session: Session | undefined;
  readonly sessionEventHandler: SessionEventHandler;
  showError(msg: string): void;
  setSwarmBrowser(value: SwarmBrowserState | undefined): void;
}

export type SwarmBrowserState = {
  component: SwarmBrowserApp;
  takeover: ScreenTakeover;
  selectedSwarmIndex: number;
  selectedMemberIndex: number;
  flashMessage: string | undefined;
  flashTimer: NodeJS.Timeout | undefined;
  pollTimer: NodeJS.Timeout | undefined;
  viewer:
    | {
        component: SwarmMemberViewer;
        takeover: ScreenTakeover;
        agentId: string | undefined;
        pollTimer: NodeJS.Timeout;
      }
    | undefined;
};

export class SwarmBrowserController {
  constructor(private readonly host: SwarmBrowserHost) {}

  async show(): Promise<void> {
    const { state } = this.host;
    if (state.swarmBrowser !== undefined) return;

    const swarms = this.projectSwarms();
    const component = new SwarmBrowserApp(
      {
        swarms,
        selectedSwarmIndex: 0,
        members: swarms[0]?.members ?? [],
        selectedMemberIndex: 0,
        flashMessage: undefined,
        ...this.buildCallbacks(),
      },
      state.terminal,
    );

    const takeover = beginScreenTakeover(state.ui, component);
    state.ui.setFocus(component);
    state.ui.requestRender(true);

    const pollTimer = setInterval(() => {
      void this.refresh({ silent: true });
    }, 1000);

    this.host.setSwarmBrowser({
      component,
      takeover,
      selectedSwarmIndex: 0,
      selectedMemberIndex: 0,
      flashMessage: undefined,
      flashTimer: undefined,
      pollTimer,
      viewer: undefined,
    });
  }

  close(): void {
    const { state } = this.host;
    const browser = state.swarmBrowser;
    if (browser === undefined) return;
    if (browser.viewer !== undefined) this.closeMemberViewer();
    if (browser.pollTimer !== undefined) clearInterval(browser.pollTimer);
    if (browser.flashTimer !== undefined) clearTimeout(browser.flashTimer);

    endScreenTakeover(state.ui, browser.takeover);
    this.host.setSwarmBrowser(undefined);
    state.ui.setFocus(state.editor);
    state.ui.requestRender(true);
  }

  /** Re-read all live swarm state and push it into the browser. */
  private async refresh(opts: { silent?: boolean } = {}): Promise<void> {
    const { state } = this.host;
    const browser = state.swarmBrowser;
    if (browser === undefined) return;
    void opts;
    const swarms = this.projectSwarms();
    if (state.swarmBrowser !== browser) return;
    this.pushProps(swarms);
  }

  private projectSwarms(): SwarmSummaryView[] {
    const handler = this.host.sessionEventHandler.subAgentEventHandler;
    return projectSwarmViews(handler.getSwarmProgressSummaries(), handler.agentSwarmProgress);
  }

  private pushProps(swarms: readonly SwarmSummaryView[]): void {
    const browser = this.host.state.swarmBrowser;
    if (browser === undefined) return;
    const selectedSwarmIndex = Math.min(browser.selectedSwarmIndex, swarms.length - 1);
    const swarm = swarms[selectedSwarmIndex];
    const members = swarm?.members ?? [];
    const selectedMemberIndex = Math.min(browser.selectedMemberIndex, members.length - 1);
    browser.component.setProps({
      swarms,
      selectedSwarmIndex,
      members,
      selectedMemberIndex,
      flashMessage: browser.flashMessage,
      ...this.buildCallbacks(),
    });
    this.host.state.ui.requestRender();
  }

  // ── callbacks ────────────────────────────────────────────────────────

  private buildCallbacks(): Pick<
    SwarmBrowserProps,
    | 'onSelectSwarm'
    | 'onSelectMember'
    | 'onRefresh'
    | 'onCancel'
    | 'onStopSwarm'
    | 'onOpenMember'
    | 'onTalkToMember'
  > {
    return {
      onSelectSwarm: (index: number) => {
        this.handleSelectSwarm(index);
      },
      onSelectMember: (index: number) => {
        this.handleSelectMember(index);
      },
      onRefresh: () => {
        this.handleRefresh();
      },
      onCancel: () => {
        this.close();
      },
      onStopSwarm: (toolCallId: string) => {
        void this.handleStopSwarm(toolCallId);
      },
      onOpenMember: () => {
        this.openMemberViewer();
      },
      onTalkToMember: () => {
        this.startTalk();
      },
    };
  }

  private handleSelectSwarm(index: number): void {
    const browser = this.host.state.swarmBrowser;
    if (browser === undefined || browser.selectedSwarmIndex === index) return;
    browser.selectedSwarmIndex = index;
    browser.selectedMemberIndex = 0;
    this.pushProps(this.projectSwarms());
  }

  private handleSelectMember(index: number): void {
    const browser = this.host.state.swarmBrowser;
    if (browser === undefined || browser.selectedMemberIndex === index) return;
    browser.selectedMemberIndex = index;
    this.pushProps(this.projectSwarms());
  }

  private handleRefresh(): void {
    this.flash('Refreshing…', 600);
    void this.refresh();
  }

  private async handleStopSwarm(toolCallId: string): Promise<void> {
    const session = this.host.session;
    if (session === undefined) {
      this.flash('没有活跃会话。');
      return;
    }
    this.flash(`Stopping swarm ${toolCallId}…`, 1500);
    try {
      await session.cancel();
      await this.refresh({ silent: true });
    } catch (error) {
      this.flash(`Stop failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ── member viewer ───────────────────────────────────────────────────

  private openMemberViewer(): void {
    const { state } = this.host;
    const browser = state.swarmBrowser;
    if (browser === undefined || browser.viewer !== undefined) return;

    const swarms = this.projectSwarms();
    const swarm = swarms[browser.selectedSwarmIndex];
    const member = swarm?.members[browser.selectedMemberIndex];
    if (swarm === undefined || member === undefined) {
      this.flash('请先选择一个成员。');
      return;
    }

    const record =
      member.agentId === undefined
        ? undefined
        : this.host.sessionEventHandler.subAgentEventHandler.activityStore.get(member.agentId);

    const viewer = new SwarmMemberViewer(
      {
        member,
        swarmDescription: swarm.description,
        record,
        onClose: () => {
          this.closeMemberViewer();
        },
        onStopMember: (agentId: string) => {
          void this.handleStopMember(agentId);
        },
        onStopSwarm: () => {
          void this.handleStopSwarm(swarm.toolCallId);
        },
        onSendMessage: (text: string) => {
          void this.handleTalk(member.agentId, text);
        },
      },
      state.terminal,
    );

    const takeover = beginScreenTakeover(state.ui, viewer);
    state.ui.setFocus(viewer);
    state.ui.requestRender(true);

    const pollTimer = setInterval(() => {
      this.refreshMemberViewer();
    }, 1000);

    browser.viewer = {
      component: viewer,
      takeover,
      agentId: member.agentId,
      pollTimer,
    };
  }

  private refreshMemberViewer(): void {
    const { state } = this.host;
    const viewer = state.swarmBrowser?.viewer;
    if (viewer === undefined || !(viewer.component instanceof SwarmMemberViewer)) return;
    const swarms = this.projectSwarms();
    const browser = state.swarmBrowser;
    if (browser === undefined) return;
    const swarm = swarms[browser.selectedSwarmIndex];
    const member = swarm?.members[browser.selectedMemberIndex];
    if (swarm === undefined || member === undefined) return;
    const record =
      member.agentId === undefined
        ? undefined
        : this.host.sessionEventHandler.subAgentEventHandler.activityStore.get(member.agentId);
    viewer.component.setProps({
      member,
      swarmDescription: swarm.description,
      record,
      onClose: () => {
        this.closeMemberViewer();
      },
      onStopMember: (agentId: string) => {
        void this.handleStopMember(agentId);
      },
      onStopSwarm: () => {
        void this.handleStopSwarm(swarm.toolCallId);
      },
      onSendMessage: (text: string) => {
        void this.handleTalk(member.agentId, text);
      },
    });
    state.ui.requestRender();
  }

  private closeMemberViewer(): void {
    const browser = this.host.state.swarmBrowser;
    if (browser === undefined || browser.viewer === undefined) return;
    const viewer = browser.viewer;
    clearInterval(viewer.pollTimer);
    browser.viewer = undefined;
    endScreenTakeover(this.host.state.ui, viewer.takeover);
    this.host.state.ui.setFocus(browser.component);
    this.host.state.ui.requestRender(true);
  }

  // ── member actions ──────────────────────────────────────────────────

  private async handleStopMember(agentId: string): Promise<void> {
    const session = this.host.session;
    if (session === undefined) {
      this.flash('没有活跃会话。');
      return;
    }
    this.flash(`Stopping member ${agentId}…`, 1500);
    try {
      await this.host.harness.cancelAgent({ sessionId: session.id, agentId });
      await this.refresh({ silent: true });
    } catch (error) {
      this.flash(`Stop failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private startTalk(): void {
    const browser = this.host.state.swarmBrowser;
    if (browser === undefined) return;
    const swarms = this.projectSwarms();
    const member = swarms[browser.selectedSwarmIndex]?.members[browser.selectedMemberIndex];
    if (member === undefined) {
      this.flash('请先选择一个成员。');
      return;
    }
    if (member.agentId === undefined) {
      this.flash('该成员尚未绑定子代理（等待注册…）。');
      return;
    }
    this.openMemberViewer();
  }

  private async handleTalk(agentId: string | undefined, text: string): Promise<void> {
    const session = this.host.session;
    if (session === undefined) {
      this.flash('没有活跃会话。');
      return;
    }
    if (agentId === undefined) {
      this.flash('成员尚未绑定子代理，无法对话。');
      return;
    }
    try {
      await this.host.harness.withInteractiveAgent(agentId, () => session.prompt(text));
      this.flash(`已发送到 ${agentId}`);
    } catch (error) {
      this.flash(`发送失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private flash(message: string, durationMs = 2500): void {
    const browser = this.host.state.swarmBrowser;
    if (browser === undefined) return;
    if (browser.flashTimer !== undefined) clearTimeout(browser.flashTimer);
    browser.flashMessage = message;
    browser.flashTimer = setTimeout(() => {
      const current = this.host.state.swarmBrowser;
      if (current !== browser) return;
      current.flashMessage = undefined;
      current.flashTimer = undefined;
      this.pushProps(this.projectSwarms());
    }, durationMs);
    this.pushProps(this.projectSwarms());
  }
}