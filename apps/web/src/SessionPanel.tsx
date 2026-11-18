import { useEffect, useRef, useState, type ReactElement } from 'react';

import {
  getFileHistoryChanges,
  getSessionEnvironments,
  getSessionGoal,
  getSessionWarnings,
  setSessionConfig,
  type FileChange,
  type GoalSnapshot,
  type Session,
  type SessionEnvironmentItem,
  type SessionWarning,
} from './api';
import './SessionPanel.css';

interface SessionUsageView {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_creation_tokens?: number;
  total_cost_usd?: number;
  context_tokens?: number;
  context_limit?: number;
  turn_count?: number;
}

interface FileChangesView {
  changes: FileChange[];
  recorded: boolean;
}

const NUMBER_FORMAT = new Intl.NumberFormat('zh-CN');

const FILE_STATUS_LABELS: Record<FileChange['status'], string> = {
  added: '新增',
  modified: '修改',
  deleted: '删除',
};

const ENVIRONMENT_STATUS_LABELS: Record<string, string> = {
  pending: '等待中',
  connecting: '连接中',
  ready: '就绪',
  disconnected: '已断开',
  disposed: '已释放',
};

const ENVIRONMENT_STATUS_TONES: Record<string, string> = {
  pending: 'pending',
  connecting: 'connecting',
  ready: 'ready',
  disconnected: 'disconnected',
  disposed: 'disposed',
};

const GOAL_STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  paused: '已暂停',
  blocked: '受阻',
  complete: '已完成',
};

type GoalControl = 'pause' | 'resume' | 'cancel';

interface GoalAction {
  control: GoalControl;
  label: string;
}

function goalActionsFor(status: string): GoalAction[] {
  switch (status) {
    case 'active':
      return [
        { control: 'pause', label: '暂停' },
        { control: 'cancel', label: '取消' },
      ];
    case 'paused':
    case 'blocked':
      return [
        { control: 'resume', label: '继续' },
        { control: 'cancel', label: '取消' },
      ];
    default:
      return [];
  }
}

const WARNING_SEVERITY_LABELS: Record<SessionWarning['severity'], string> = {
  info: '提示',
  warning: '警告',
  error: '错误',
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function countText(value: number | undefined): string {
  return value === undefined ? '—' : NUMBER_FORMAT.format(value);
}

function costText(value: number | undefined): string {
  return value === undefined ? '—' : `$${value.toFixed(4)}`;
}

// api.ts 的 Session 类型尚未声明 usage，服务端的会话对象实际带有该字段。
function readUsage(session: Session): SessionUsageView | undefined {
  return (session as unknown as { usage?: SessionUsageView }).usage;
}

function environmentStatusLabel(status: string): string {
  return ENVIRONMENT_STATUS_LABELS[status] ?? status;
}

function environmentStatusTone(status: string): string {
  return ENVIRONMENT_STATUS_TONES[status] ?? 'pending';
}

export interface SessionPanelProps {
  session: Session;
}

export function SessionPanel({ session }: SessionPanelProps): ReactElement {
  const [environments, setEnvironments] = useState<SessionEnvironmentItem[] | undefined>(undefined);
  const [environmentsError, setEnvironmentsError] = useState<string | undefined>(undefined);
  const [fileChanges, setFileChanges] = useState<FileChangesView | undefined>(undefined);
  const [fileChangesError, setFileChangesError] = useState<string | undefined>(undefined);
  const [goal, setGoal] = useState<GoalSnapshot | null | undefined>(undefined);
  const [goalError, setGoalError] = useState<string | undefined>(undefined);
  const [goalActionError, setGoalActionError] = useState<string | undefined>(undefined);
  const [goalActionPending, setGoalActionPending] = useState(false);
  const [warnings, setWarnings] = useState<SessionWarning[] | undefined>(undefined);
  const [warningsError, setWarningsError] = useState<string | undefined>(undefined);
  const sessionIdRef = useRef(session.id);

  useEffect(() => {
    const sessionId = session.id;
    let cancelled = false;

    sessionIdRef.current = sessionId;
    setEnvironments(undefined);
    setEnvironmentsError(undefined);
    setFileChanges(undefined);
    setFileChangesError(undefined);
    setGoal(undefined);
    setGoalError(undefined);
    setGoalActionError(undefined);
    setGoalActionPending(false);
    setWarnings(undefined);
    setWarningsError(undefined);

    void getSessionEnvironments(sessionId)
      .then((result) => {
        if (!cancelled) setEnvironments(result.environments);
      })
      .catch((error: unknown) => {
        if (!cancelled) setEnvironmentsError(errorText(error));
      });

    const turnCount = session.usage?.turn_count ?? 0;
    if (turnCount === 0) {
      setFileChanges({ changes: [], recorded: false });
    } else {
      void getFileHistoryChanges(sessionId, turnCount - 1)
        .then((result) => {
          if (!cancelled) setFileChanges(result);
        })
        .catch((error: unknown) => {
          if (!cancelled) setFileChangesError(errorText(error));
        });
    }

    void getSessionGoal(sessionId)
      .then((result) => {
        if (!cancelled) setGoal(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) setGoalError(errorText(error));
      });

    void getSessionWarnings(sessionId)
      .then((result) => {
        if (!cancelled) setWarnings(result.warnings);
      })
      .catch((error: unknown) => {
        if (!cancelled) setWarningsError(errorText(error));
      });

    return () => {
      cancelled = true;
    };
  }, [session.id]);

  const applyGoalControl = (control: GoalControl): void => {
    const sessionId = session.id;
    setGoalActionPending(true);
    setGoalActionError(undefined);
    void setSessionConfig(sessionId, { goal_control: control })
      .then(() => getSessionGoal(sessionId))
      .then((result) => {
        if (sessionIdRef.current !== sessionId) return;
        setGoal(result);
      })
      .catch((error: unknown) => {
        if (sessionIdRef.current !== sessionId) return;
        setGoalActionError(errorText(error));
      })
      .finally(() => {
        if (sessionIdRef.current === sessionId) setGoalActionPending(false);
      });
  };

  const usage = readUsage(session);
  const contextLimit = usage?.context_limit ?? 0;
  const contextTokens = usage?.context_tokens ?? 0;
  const contextPercent = contextLimit > 0 ? (contextTokens / contextLimit) * 100 : 0;
  const contextWidth = Math.min(100, contextPercent);

  const usageMetrics: { label: string; value: string }[] = [
    { label: '输入', value: countText(usage?.input_tokens) },
    { label: '输出', value: countText(usage?.output_tokens) },
    { label: '缓存读', value: countText(usage?.cache_read_tokens) },
    { label: '缓存写', value: countText(usage?.cache_creation_tokens) },
    { label: '费用', value: costText(usage?.total_cost_usd) },
    { label: '轮次', value: countText(usage?.turn_count) },
  ];

  const showGoalSection = goal !== null || goalError !== undefined;
  const goalActions = goal === undefined || goal === null ? [] : goalActionsFor(goal.status);
  const showWarningsSection =
    warnings === undefined || warnings.length > 0 || warningsError !== undefined;

  return (
    <div className="sp-root">
      <section className="sp-section">
        <h2 className="sp-section-title">环境</h2>
        <div className="sp-row">
          <span className="sp-label">工作目录</span>
          <span className="sp-value">{session.metadata.cwd ?? '—'}</span>
        </div>
        <div className="sp-row">
          <span className="sp-label">工作区</span>
          <span className="sp-value">{session.workspace_id}</span>
        </div>
        <div className="sp-env-list">
          {environmentsError !== undefined ? (
            <div className="sp-error">环境加载失败：{environmentsError}</div>
          ) : environments === undefined ? (
            <div className="sp-loading">加载中…</div>
          ) : environments.length === 0 ? (
            <div className="sp-empty">没有可用环境</div>
          ) : (
            environments.map((item) => (
              <div className="sp-env" key={item.environment_id}>
                <span
                  className={`sp-dot sp-dot-${environmentStatusTone(item.status)}`}
                  aria-hidden="true"
                />
                <span className="sp-env-type">{item.type}</span>
                <span className="sp-env-status">{environmentStatusLabel(item.status)}</span>
                {item.connect_error !== undefined && item.connect_error.length > 0 && (
                  <span className="sp-error sp-env-error">{item.connect_error}</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="sp-section">
        <h2 className="sp-section-title">用量</h2>
        <div className="sp-metrics">
          {usageMetrics.map((metric) => (
            <div className="sp-metric" key={metric.label}>
              <span className="sp-metric-label">{metric.label}</span>
              <span className="sp-metric-value">{metric.value}</span>
            </div>
          ))}
        </div>
        <div className="sp-context">
          <div className="sp-context-head">
            <span className="sp-label">上下文</span>
            {contextLimit > 0 ? (
              <span className="sp-context-count">
                {countText(contextTokens)} / {countText(contextLimit)} ·{' '}
                {Math.round(contextPercent)}%
              </span>
            ) : (
              <span className="sp-muted">未知</span>
            )}
          </div>
          {contextLimit > 0 && (
            <div className="sp-track">
              <div
                className={
                  contextPercent >= 85 ? 'sp-track-fill sp-track-fill-high' : 'sp-track-fill'
                }
                style={{ width: `${contextWidth.toFixed(1)}%` }}
              />
            </div>
          )}
        </div>
      </section>

      <section className="sp-section">
        <h2 className="sp-section-title">文件变更</h2>
        {fileChangesError !== undefined ? (
          <div className="sp-error">文件改动加载失败：{fileChangesError}</div>
        ) : fileChanges === undefined ? (
          <div className="sp-loading">加载中…</div>
        ) : !fileChanges.recorded ? (
          <div className="sp-empty">尚未记录文件改动</div>
        ) : fileChanges.changes.length === 0 ? (
          <div className="sp-empty">这个会话还没有文件改动</div>
        ) : (
          <div className="sp-files">
            {fileChanges.changes.map((change) => (
              <div className="sp-file" key={change.path}>
                <span className={`sp-file-status sp-file-status-${change.status}`}>
                  {FILE_STATUS_LABELS[change.status]}
                </span>
                <span className="sp-file-path" title={change.path}>
                  {change.path}
                </span>
                <span className="sp-file-stats">
                  <span className="sp-add">+{change.additions}</span>
                  <span className="sp-del">-{change.deletions}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {showGoalSection && (
        <section className="sp-section">
          <h2 className="sp-section-title">目标</h2>
          {goalError !== undefined ? (
            <div className="sp-error">目标加载失败：{goalError}</div>
          ) : goal === undefined ? (
            <div className="sp-loading">加载中…</div>
          ) : goal !== null ? (
            <>
              <div className="sp-goal-objective">{goal.objective}</div>
              <div className="sp-row">
                <span className="sp-label">状态</span>
                <span className={`sp-value sp-goal-status sp-goal-status-${goal.status}`}>
                  {GOAL_STATUS_LABELS[goal.status] ?? goal.status}
                </span>
              </div>
              <div className="sp-row">
                <span className="sp-label">轮次</span>
                <span className="sp-value">{countText(goal.turnsUsed)}</span>
              </div>
              <div className="sp-row">
                <span className="sp-label">Token</span>
                <span className="sp-value">{countText(goal.tokensUsed)}</span>
              </div>
              {goalActions.length > 0 && (
                <div className="sp-goal-actions">
                  {goalActions.map((action) => (
                    <button
                      className={
                        action.control === 'cancel'
                          ? 'sp-goal-btn sp-goal-btn-danger'
                          : 'sp-goal-btn'
                      }
                      disabled={goalActionPending}
                      key={action.control}
                      onClick={() => applyGoalControl(action.control)}
                      type="button"
                    >
                      {action.label}
                    </button>
                  ))}
                  {goalActionPending && <span className="sp-muted">处理中…</span>}
                </div>
              )}
              {goalActionError !== undefined && (
                <div className="sp-error">目标操作失败：{goalActionError}</div>
              )}
            </>
          ) : null}
        </section>
      )}

      {showWarningsSection && (
        <section className="sp-section">
          <h2 className="sp-section-title">警告</h2>
          {warningsError !== undefined ? (
            <div className="sp-error">警告加载失败：{warningsError}</div>
          ) : warnings === undefined ? (
            <div className="sp-loading">加载中…</div>
          ) : (
            <div className="sp-warnings">
              {warnings.map((warning, index) => (
                <div
                  className={`sp-warning sp-warning-${warning.severity}`}
                  key={`${warning.code}:${String(index)}`}
                >
                  <div className="sp-warning-head">
                    <span className={`sp-sev sp-sev-${warning.severity}`}>
                      {WARNING_SEVERITY_LABELS[warning.severity]}
                    </span>
                    <span className="sp-warning-code">{warning.code}</span>
                  </div>
                  <div className="sp-warning-message">{warning.message}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
