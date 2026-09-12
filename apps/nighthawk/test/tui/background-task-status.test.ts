import type { BackgroundTaskInfo, BackgroundTaskStatus } from '@nighthawk/nighthawk-sdk';
import { describe, expect, it } from 'vitest';

import { formatBackgroundTaskTranscript } from '@/tui/utils/background-task-status';

function task(overrides: Partial<BackgroundTaskInfo> = {}): BackgroundTaskInfo {
  const taskId = overrides.taskId ?? 'bash-abcd1234';
  const kind = overrides.kind ?? (taskId.startsWith('agent-') ? 'agent' : 'process');
  const base = {
    taskId,
    kind,
    description: 'dev server',
    status: 'running',
    startedAt: Date.now() - 1000,
    endedAt: null,
    ...overrides,
  };
  if (kind === 'agent') {
    return {
      ...base,
      kind: 'agent',
      agentId: 'agent-child',
      subagentType: 'coder',
      ...overrides,
    } as BackgroundTaskInfo;
  }
  return {
    ...base,
    kind: 'process',
    command: 'npm run dev',
    pid: 1234,
    exitCode: null,
    ...overrides,
  } as BackgroundTaskInfo;
}

describe('formatBackgroundTaskTranscript', () => {
  it('renders a bash started entry', () => {
    const data = formatBackgroundTaskTranscript(task({ status: 'running' }));
    expect(data.phase).toBe('started');
    expect(data.headline).toContain('命令任务 在后台启动');
    expect(data.detail).toBe('dev server');
  });

  it('renders an agent started entry', () => {
    const data = formatBackgroundTaskTranscript(
      task({ taskId: 'agent-deadbeef', status: 'running' }),
    );
    expect(data.headline).toContain('代理任务 在后台启动');
  });

  it('renders a question started entry', () => {
    const data = formatBackgroundTaskTranscript(
      task({
        taskId: 'question-deadbeef',
        kind: 'question',
        questionCount: 1,
        status: 'running',
      }),
    );
    expect(data.headline).toContain('询问任务 在后台启动');
  });

  it('renders a completed entry with exit code in detail', () => {
    const data = formatBackgroundTaskTranscript(
      task({ status: 'completed', exitCode: 0, endedAt: Date.now() }),
    );
    expect(data.phase).toBe('completed');
    expect(data.headline).toContain('命令任务 在后台已完成');
    expect(data.detail).toContain('exit 0');
  });

  it('renders a failed entry with non-zero exit', () => {
    const data = formatBackgroundTaskTranscript(
      task({ status: 'failed', exitCode: 2, endedAt: Date.now() }),
    );
    expect(data.phase).toBe('failed');
    expect(data.headline).toContain('命令任务 在后台失败');
    expect(data.detail).toContain('exit 2');
  });

  it('renders a killed entry with stop reason', () => {
    const data = formatBackgroundTaskTranscript(
      task({ status: 'killed', stopReason: 'user', endedAt: Date.now() }),
    );
    expect(data.phase).toBe('failed');
    expect(data.headline).toContain('命令任务 已终止');
    expect(data.detail).toContain('user');
  });

  it('renders a lost entry with restart note', () => {
    const data = formatBackgroundTaskTranscript(task({ status: 'lost', endedAt: Date.now() }));
    expect(data.phase).toBe('failed');
    expect(data.headline).toContain('命令任务 已丢失');
    expect(data.detail).toContain('session restarted');
  });

  it('surfaces timeout stop reason for agent deadlines', () => {
    const data = formatBackgroundTaskTranscript(
      task({
        taskId: 'agent-aaaaaaaa',
        status: 'timed_out',
        endedAt: Date.now(),
      }),
    );
    expect(data.detail).toContain('timed out');
  });

  it('handles every BackgroundTaskStatus without throwing', () => {
    const statuses: BackgroundTaskStatus[] = [
      'running',
      'completed',
      'failed',
      'timed_out',
      'killed',
      'lost',
    ];
    for (const status of statuses) {
      expect(() => formatBackgroundTaskTranscript(task({ status }))).not.toThrow();
    }
  });
});
