import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import {
  ApiError,
  abortSession,
  createSession,
  getConfig,
  getMeta,
  getSnapshot,
  listModels,
  listMessages,
  listSessions,
  loadToken,
  sendPrompt,
  setSessionModel,
  setToken,
  type Config,
  type ModelEntry,
  type Message,
  type Session,
} from './api';
import { Socket, type WireEvent } from './ws';

interface ToolCall {
  id: string;
  name: string;
  args: unknown;
  output?: string;
  isError?: boolean;
  running: boolean;
}

interface Item {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  thinking: string;
  tools: ToolCall[];
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function textOf(block: { type: string; text?: string }): string {
  return block.type === 'text' ? (block.text ?? '') : '';
}

function toolsOf(message: Message): ToolCall[] {
  return message.content
    .filter((block) => block.type === 'tool_use')
    .map((block) => ({
      id: block.id ?? crypto.randomUUID(),
      name: block.name ?? 'tool',
      args: block.input,
      running: false,
    }));
}

function toItems(messages: Message[]): Item[] {
  const items: Item[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      const text = message.content.map(textOf).join('');
      if (text.length > 0) items.push({ id: message.id, role: 'user', text, thinking: '', tools: [] });
      continue;
    }
    if (message.role === 'assistant') {
      const text = message.content.map(textOf).join('');
      const thinking = message.content
        .filter((block) => block.type === 'thinking')
        .map((block) => block.text ?? '')
        .join('');
      const tools = toolsOf(message);
      if (text.length > 0 || tools.length > 0) {
        items.push({ id: message.id, role: 'assistant', text, thinking, tools });
      }
      continue;
    }
    if (message.role === 'tool') {
      const last = items.at(-1);
      for (const block of message.content) {
        if (block.type !== 'tool_result' || last === undefined) continue;
        const target = last.tools.find((tool) => tool.id === block.tool_use_id);
        if (target !== undefined) {
          target.output = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
          target.isError = block.is_error === true;
          target.running = false;
        }
      }
    }
  }
  return items;
}

interface FrameState {
  kind: string;
  text: string;
}

function applyFrames(
  previous: Record<string, FrameState>,
  ops: readonly unknown[],
): { frames: Record<string, FrameState>; completed: boolean; running: boolean } {
  const frames: Record<string, FrameState> = { ...previous };
  let completed = false;
  let running = false;
  for (const raw of ops) {
    if (typeof raw !== 'object' || raw === null) continue;
    const op = raw as Record<string, unknown>;
    const kind = op['op'];
    if (kind === 'frame.upsert') {
      const frame = op['frame'];
      if (typeof frame !== 'object' || frame === null) continue;
      const record = frame as Record<string, unknown>;
      const id = record['frameId'];
      if (typeof id !== 'string') continue;
      frames[id] = {
        kind: typeof record['kind'] === 'string' ? record['kind'] : 'text',
        text: typeof record['text'] === 'string' ? record['text'] : '',
      };
      continue;
    }
    if (kind === 'append') {
      const target = op['target'];
      if (typeof target !== 'object' || target === null) continue;
      const id = (target as Record<string, unknown>)['frameId'];
      if (typeof id !== 'string') continue;
      const text = typeof op['text'] === 'string' ? op['text'] : '';
      if (text.length === 0) continue;
      const current = frames[id] ?? { kind: 'text', text: '' };
      const offset = typeof op['offset'] === 'number' ? op['offset'] : current.text.length;
      if (offset === current.text.length) frames[id] = { ...current, text: current.text + text };
      continue;
    }
    if (kind === 'turn.upsert') {
      const turn = op['turn'];
      if (typeof turn !== 'object' || turn === null) continue;
      const state = (turn as Record<string, unknown>)['state'];
      if (state === 'completed' || state === 'failed' || state === 'cancelled') completed = true;
      if (state === 'running') running = true;
      continue;
    }
    if (kind === 'prompt.upsert') {
      const prompt = op['prompt'];
      if (typeof prompt !== 'object' || prompt === null) continue;
      if ((prompt as Record<string, unknown>)['status'] === 'running') running = true;
    }
  }
  return { frames, completed, running };
}

function buildLive(frames: Record<string, FrameState>): Item | undefined {
  const values = Object.values(frames);
  const text = values.filter((frame) => frame.kind !== 'thinking').map((frame) => frame.text).join('');
  const thinking = values.filter((frame) => frame.kind === 'thinking').map((frame) => frame.text).join('');
  if (text.length === 0 && thinking.length === 0) return undefined;
  return { id: 'live', role: 'assistant', text, thinking, tools: [] };
}

function useSessions(): {
  sessions: Session[];
  reload: () => Promise<void>;
  error: string | undefined;
} {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string>();
  const reload = useCallback(async () => {
    try {
      const page = await listSessions();
      setSessions(page.items);
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }, []);
  return { sessions, reload, error };
}

export function App(): ReactElement {
  const [token, setTokenState] = useState(loadToken);
  const [tokenDraft, setTokenDraft] = useState('');
  const [composer, setComposer] = useState('');
  const [meta, setMeta] = useState<Record<string, unknown>>();
  const [config, setConfig] = useState<Config>();
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [model, setModel] = useState('');
  const [currentId, setCurrentId] = useState<string>();
  const [items, setItems] = useState<Item[]>([]);
  const [live, setLive] = useState<Item | undefined>();
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('closed');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [cwd, setCwd] = useState('/Users/zhuyao/project/nighthawk');
  const socketRef = useRef<Socket | undefined>(undefined);
  const framesRef = useRef<Record<string, FrameState>>({});
  const currentIdRef = useRef<string | undefined>(undefined);
  const { sessions, reload } = useSessions();

  currentIdRef.current = currentId;

  const handleEvent = useCallback(
    (event: WireEvent) => {
      const sessionId = event.session_id ?? currentIdRef.current;
      if (sessionId !== currentIdRef.current) return;
      const payload = event.payload ?? {};
      switch (event.type) {
        case 'turn.started':
          setBusy(true);
          setLive({ id: 'live', role: 'assistant', text: '', thinking: '', tools: [] });
          break;
        case 'assistant.delta':
          setLive((previous) => ({
            id: 'live',
            role: 'assistant',
            text: (previous?.text ?? '') + str(payload['delta']),
            thinking: previous?.thinking ?? '',
            tools: previous?.tools ?? [],
          }));
          break;
        case 'thinking.delta':
          setLive((previous) => ({
            id: 'live',
            role: 'assistant',
            text: previous?.text ?? '',
            thinking: (previous?.thinking ?? '') + str(payload['delta']),
            tools: previous?.tools ?? [],
          }));
          break;
        case 'tool.call.started': {
          const tool: ToolCall = {
            id: str(payload['toolCallId']) || crypto.randomUUID(),
            name: str(payload['name'], 'tool'),
            args: payload['args'],
            running: true,
          };
          setLive((previous) => ({
            id: 'live',
            role: 'assistant',
            text: previous?.text ?? '',
            thinking: previous?.thinking ?? '',
            tools: [...(previous?.tools ?? []), tool],
          }));
          break;
        }
        case 'tool.result': {
          const toolCallId = str(payload['toolCallId']);
          const output = payload['output'];
          setLive((previous) => {
            if (previous === undefined) return previous;
            return {
              ...previous,
              tools: previous.tools.map((tool) =>
                tool.id === toolCallId
                  ? {
                      ...tool,
                      running: false,
                      isError: payload['isError'] === true,
                      output: typeof output === 'string' ? output : JSON.stringify(output),
                    }
                  : tool,
              ),
            };
          });
          break;
        }
        case 'transcript.reset':
          framesRef.current = {};
          setLive(undefined);
          break;
        case 'transcript.ops': {
          const ops = Array.isArray(payload['ops']) ? payload['ops'] : [];
          const next = applyFrames(framesRef.current, ops);
          framesRef.current = next.frames;
          setLive(buildLive(next.frames));
          if (next.running) setBusy(true);
          if (next.completed) {
            setBusy(false);
            framesRef.current = {};
            setLive(undefined);
            if (currentIdRef.current !== undefined) void refreshMessages(currentIdRef.current);
          }
          break;
        }
        case 'turn.ended':
          setBusy(false);
          framesRef.current = {};
          setLive(undefined);
          if (currentIdRef.current !== undefined) {
            void refreshMessages(currentIdRef.current);
          }
          break;
        case 'error':
          setError(str(payload['message'], 'turn failed'));
          setBusy(false);
          break;
        default:
          break;
      }
    },
    [],
  );

  const refreshMessages = useCallback(async (sessionId: string) => {
    try {
      const page = await listMessages(sessionId);
      setItems(toItems([...page.items].toReversed()));
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    if (token.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const metaData = await getMeta();
        if (!cancelled) setMeta(metaData);
        const configData = await getConfig();
        const modelPage = await listModels();
        if (!cancelled) {
          setConfig(configData);
          setModels(modelPage.items);
          setModel(configData.default_model ?? modelPage.items[0]?.model ?? '');
        }
        await reload();
      } catch (error) {
        if (error instanceof ApiError && error.code === 40101) {
          setToken('');
          setTokenState('');
          setError('token 无效或已过期');
        } else {
          setError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reload]);

  useEffect(() => {
    if (token.length === 0) return;
    const socket = new Socket(token, handleEvent, setStatus);
    socketRef.current = socket;
    socket.connect();
    return () => {
      socket.dispose();
      socketRef.current = undefined;
    };
  }, [token, handleEvent]);

  useEffect(() => {
    if (currentId === undefined) return;
    void refreshMessages(currentId);
    void getSnapshot(currentId)
      .then((snapshot) => {
        const sessionModel = snapshot.session.agent_config?.model;
        if (typeof sessionModel === 'string' && sessionModel.length > 0) setModel(sessionModel);
      })
      .catch(() => undefined);
    socketRef.current?.subscribe(currentId);
    framesRef.current = {};
    setLive(undefined);
  }, [currentId, refreshMessages]);

  const submit = useCallback(async () => {
    const text = composer.trim();
    if (text.length === 0 || currentId === undefined) return;
    setComposer('');
    setItems((previous) => [
      ...previous,
      { id: `local_${crypto.randomUUID()}`, role: 'user', text, thinking: '', tools: [] },
    ]);
    setBusy(true);
    framesRef.current = {};
    try {
      await sendPrompt(currentId, text);
    } catch (error) {
      setBusy(false);
      setError(error instanceof Error ? error.message : String(error));
    }
  }, [composer, currentId]);

  const stop = useCallback(async () => {
    if (currentId === undefined) return;
    try {
      await abortSession(currentId);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }, [currentId]);

  const newSession = useCallback(async () => {
    try {
      const session = await createSession(cwd);
      if (model.length > 0) await setSessionModel(session.id, model);
      await reload();
      setCurrentId(session.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }, [cwd, model, reload]);

  const groupedModels = useMemo(() => {
    const groups = new Map<string, ModelEntry[]>();
    for (const entry of models) {
      const list = groups.get(entry.provider) ?? [];
      list.push(entry);
      groups.set(entry.provider, list);
    }
    return [...groups.entries()].toSorted(([a], [b]) => a.localeCompare(b));
  }, [models]);

  const visibleItems = useMemo(() => {
    if (live === undefined) return items;
    if (live.text.length === 0 && live.tools.length === 0 && live.thinking.length === 0) return items;
    return [...items, live];
  }, [items, live]);

  if (token.length === 0) {
    return (
      <div className="gate">
        <div className="gate-card">
          <h1>NightHawk</h1>
          <p>粘贴 `nighthawk web` 启动时打印的访问令牌。</p>
          <input
            autoFocus
            value={tokenDraft}
            onChange={(event) => setTokenDraft(event.target.value)}
            placeholder="token"
          />
          <button
            type="button"
            disabled={tokenDraft.trim().length === 0}
            onClick={() => {
              setToken(tokenDraft.trim());
              setTokenState(tokenDraft.trim());
            }}
          >
            连接
          </button>
          {error !== undefined && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  const current = sessions.find((session) => session.id === currentId);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/nighthawk-icon.svg" alt="" width={22} height={22} />
          <span>NightHawk</span>
          <span className={`dot ${status}`} title={status} />
        </div>
        <div className="new-session">
          <input value={cwd} onChange={(event) => setCwd(event.target.value)} placeholder="工作目录" />
          <button type="button" onClick={() => void newSession()}>
            新建
          </button>
        </div>
        <nav className="sessions">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              className={session.id === currentId ? 'session active' : 'session'}
              onClick={() => setCurrentId(session.id)}
            >
              <span className="session-title">{session.title.length > 0 ? session.title : session.last_prompt || session.id}</span>
              <span className="session-meta">
                {session.busy ? '运行中' : session.pending_interaction !== 'none' ? '待确认' : session.metadata.cwd ?? ''}
              </span>
            </button>
          ))}
        </nav>
        {meta !== undefined && (
          <div className="version">{str(meta['version'])}</div>
        )}
      </aside>

      <main className="main">
        {current === undefined ? (
          <div className="empty">
            <h2>选择或新建一个会话</h2>
            <p>会话跑在本地服务里，模型和密钥都来自你的 config.toml。</p>
          </div>
        ) : (
          <>
            <header className="header">
              <div>
                <strong>{current.title.length > 0 ? current.title : '未命名会话'}</strong>
                <span className="cwd">{current.metadata.cwd ?? ''}</span>
              </div>
              <div className="header-right">
                <select
                  className="model-select"
                  value={model}
                  onChange={(event) => {
                    const next = event.target.value;
                    setModel(next);
                    void setSessionModel(current.id, next).then(() => setModel(next));
                  }}
                >
                  <option value="">选择模型</option>
                  {groupedModels.map(([provider, entries]) => (
                    <optgroup key={provider} label={provider}>
                      {entries.map((entry) => (
                        <option key={entry.model} value={entry.model}>
                          {entry.display_name ?? entry.model}
                          {entry.model === config?.default_model ? '（默认）' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className={`pill ${busy ? 'busy' : 'idle'}`}>{busy ? '运行中' : '空闲'}</span>
              </div>
            </header>

            <div className="transcript">
              {visibleItems.map((item) => (
                <article key={item.id} className={`message ${item.role}`}>
                  <div className="role">{item.role === 'user' ? '你' : 'NightHawk'}</div>
                  {item.thinking.length > 0 && <details className="thinking"><summary>思考</summary><pre>{item.thinking}</pre></details>}
                  {item.text.length > 0 && <div className="text">{item.text}</div>}
                  {item.tools.map((tool) => (
                    <details key={tool.id} className={`tool ${tool.isError === true ? 'failed' : ''}`}>
                      <summary>
                        <span className="tool-name">{tool.name}</span>
                        <span className="tool-state">{tool.running ? '运行中' : tool.isError === true ? '失败' : '完成'}</span>
                      </summary>
                      <pre>{JSON.stringify(tool.args, null, 2)}</pre>
                      {tool.output !== undefined && <pre className="tool-output">{tool.output}</pre>}
                    </details>
                  ))}
                  {item.thinking.length === 0 && item.text.length === 0 && item.tools.length === 0 && (
                    <div className="text muted">…</div>
                  )}
                </article>
              ))}
            </div>

            <footer className="composer">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="问点什么，Enter 发送，Shift+Enter 换行"
                rows={3}
              />
              <div className="composer-actions">
                {busy ? (
                  <button type="button" className="stop" onClick={() => void stop()}>
                    停止
                  </button>
                ) : (
                  <button type="button" disabled={composer.trim().length === 0} onClick={() => void submit()}>
                    发送
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
        {error !== undefined && (
          <div className="banner" role="alert">
            {error}
            <button type="button" onClick={() => setError(undefined)}>
              关闭
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
