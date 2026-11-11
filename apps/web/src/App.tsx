import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import {
  ApiError,
  abortSession,
  createSession,
  deleteSession,
  getConfig,
  getMeta,
  getSnapshot,
  listModels,
  listMcpServers,
  listMessages,
  listPlugins,
  listSessions,
  loadToken,
  sendPrompt,
  renameSession,
  respondInteraction,
  setSessionConfig,
  setToken,
  uploadFile,
  type FileMeta,
  type ModelEntry,
  type PluginSummary,
  type QuestionItem,
  type Message,
  type Session,
} from './api';
import { AuthImage } from './AuthImage';
import { Markdown } from './Markdown';
import {
  ApprovalCard,
  QuestionCard,
  type ApprovalItem,
  type QuestionPrompt,
} from './Pending';
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
  images: ImageRef[];
}

interface ImageRef {
  url?: string;
  fileId?: string;
}

const QUICK_PROMPTS = [
  '介绍一下这个项目的结构',
  '找出一个值得重构的模块',
  '给最近改动的文件补一组测试',
];

const EFFORT_LABELS: Record<string, string> = {
  off: '关闭',
  minimal: '最低',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
  max: '最高',
};

function effortLabel(value: string): string {
  return EFFORT_LABELS[value] ?? value;
}

function imageRefOf(block: {
  type: string;
  image_url?: { url: string; id?: string };
  imageUrl?: { url: string };
  source?: { kind?: string; url?: string; data?: string; media_type?: string; file_id?: string };
}): ImageRef | undefined {
  const direct = block.image_url?.url ?? block.imageUrl?.url;
  if (typeof direct === 'string' && direct.length > 0) return { url: direct };
  const source = block.source;
  if (source === undefined) return undefined;
  if (source.kind === 'url' && typeof source.url === 'string' && source.url.length > 0) {
    return { url: source.url };
  }
  if (
    source.kind === 'base64' &&
    typeof source.data === 'string' &&
    typeof source.media_type === 'string'
  ) {
    return { url: `data:${source.media_type};base64,${source.data}` };
  }
  if (
    (source.kind === 'file' || source.kind === 'session_media') &&
    typeof source.file_id === 'string'
  ) {
    return { fileId: source.file_id };
  }
  return undefined;
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
      id: block.tool_call_id ?? block.id ?? crypto.randomUUID(),
      name: block.tool_name ?? block.name ?? 'tool',
      args: block.input,
      running: false,
    }));
}

function toItems(messages: Message[]): Item[] {
  const items: Item[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      const text = message.content.map(textOf).join('');
      const images = message.content
        .map((block) => imageRefOf(block))
        .filter((ref): ref is ImageRef => ref !== undefined);
      const trimmed = text.trimStart();
      if ((text.trim().length === 0 && images.length === 0) || trimmed.startsWith('<system-reminder>')) {
        continue;
      }
      items.push({ id: message.id, role: 'user', text, thinking: '', tools: [], images });
      continue;
    }
    if (message.role === 'assistant') {
      const text = message.content.map(textOf).join('');
      const thinking = message.content
        .filter((block) => block.type === 'thinking')
        .map((block) => block.thinking ?? '')
        .join('');
      const tools = toolsOf(message);
      const images = message.content
        .map((block) => imageRefOf(block))
        .filter((ref): ref is ImageRef => ref !== undefined);
      if (text.length > 0 || tools.length > 0 || thinking.length > 0 || images.length > 0) {
        items.push({ id: message.id, role: 'assistant', text, thinking, tools, images });
      }
      continue;
    }
    if (message.role === 'tool') {
      const last = items.at(-1);
      for (const block of message.content) {
        if (block.type !== 'tool_result' || last === undefined) continue;
        const target = last.tools.find(
          (tool) => tool.id === (block.tool_call_id ?? block.tool_use_id),
        );
        if (target !== undefined) {
          const output = block.output ?? block.content;
          target.output = typeof output === 'string' ? output : JSON.stringify(output);
          target.isError = block.is_error === true;
          target.running = false;
        }
      }
    }
  }
  return items;
}

interface FrameToolState {
  id: string;
  name: string;
  state: string;
  input?: unknown;
  output?: unknown;
  error?: string;
}

interface FrameState {
  kind: string;
  text: string;
  tool?: FrameToolState;
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
      const frameKind = typeof record['kind'] === 'string' ? record['kind'] : 'text';
      if (frameKind === 'tool') {
        frames[id] = {
          kind: 'tool',
          text: '',
          tool: {
            id: typeof record['toolCallId'] === 'string' ? record['toolCallId'] : id,
            name: typeof record['name'] === 'string' ? record['name'] : 'tool',
            state: typeof record['state'] === 'string' ? record['state'] : 'running',
            input: record['input'],
            output: record['output'],
            error: typeof record['error'] === 'string' ? record['error'] : undefined,
          },
        };
        continue;
      }
      frames[id] = {
        kind: frameKind,
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
  const text = values
    .filter((frame) => frame.kind === 'text')
    .map((frame) => frame.text)
    .join('');
  const thinking = values
    .filter((frame) => frame.kind === 'thinking')
    .map((frame) => frame.text)
    .join('');
  const tools: ToolCall[] = values
    .filter((frame) => frame.kind === 'tool' && frame.tool !== undefined)
    .map((frame) => {
      const tool = frame.tool as FrameToolState;
      return {
        id: tool.id,
        name: tool.name,
        args: tool.input,
        output:
          tool.output === undefined
            ? tool.error
            : typeof tool.output === 'string'
              ? tool.output
              : JSON.stringify(tool.output),
        isError: tool.state === 'error',
        running: tool.state === 'running',
      };
    });
  if (text.length === 0 && thinking.length === 0 && tools.length === 0) return undefined;
  return { id: 'live', role: 'assistant', text, thinking, tools, images: [] };
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
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [model, setModel] = useState('');
  const [effort, setEffort] = useState('');
  const [pickerOpen, setPickerOpen] = useState(
    () => new URLSearchParams(location.search).get('picker') === '1',
  );
  const [query, setQuery] = useState('');
  const [attachments, setAttachments] = useState<FileMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [renamingId, setRenamingId] = useState<string>();
  const [renameValue, setRenameValue] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const fromUrl = new URLSearchParams(location.search).get('theme');
    if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl;
    return localStorage.getItem('nighthawk.theme') === 'light' ? 'light' : 'dark';
  });
  const [panel, setPanel] = useState<'none' | 'plugins' | 'mcp'>(() => {
    const fromUrl = new URLSearchParams(location.search).get('panel');
    return fromUrl === 'plugins' || fromUrl === 'mcp' ? fromUrl : 'none';
  });
  const [plugins, setPlugins] = useState<PluginSummary[]>([]);
  const [mcpServers, setMcpServers] = useState<Record<string, unknown>[]>([]);
  const [pending, setPending] = useState<
    ({ kind: 'approval'; item: ApprovalItem } | { kind: 'question'; item: QuestionPrompt })[]
  >([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>();
  const [currentId, setCurrentId] = useState<string | undefined>(
    () => new URLSearchParams(location.search).get('session') ?? undefined,
  );
  const [items, setItems] = useState<Item[]>([]);
  const [live, setLive] = useState<Item | undefined>();
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('closed');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [cwd, setCwd] = useState('/Users/zhuyao/project/nighthawk');
  const socketRef = useRef<Socket | undefined>(undefined);
  const framesRef = useRef<Record<string, FrameState>>({});
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const effortTimer = useRef<number | undefined>(undefined);
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
          setLive({ id: 'live', role: 'assistant', text: '', thinking: '', tools: [], images: [] });
          break;
        case 'assistant.delta':
          setLive((previous) => ({
            id: 'live',
            role: 'assistant',
            text: (previous?.text ?? '') + str(payload['delta']),
            thinking: previous?.thinking ?? '',
            tools: previous?.tools ?? [],
            images: previous?.images ?? [],
          }));
          break;
        case 'thinking.delta':
          setLive((previous) => ({
            id: 'live',
            role: 'assistant',
            text: previous?.text ?? '',
            thinking: (previous?.thinking ?? '') + str(payload['delta']),
            tools: previous?.tools ?? [],
            images: previous?.images ?? [],
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
            images: previous?.images ?? [],
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
        case 'interaction': {
          const frame = event as unknown as Record<string, unknown>;
          const status = str(frame['status']);
          const id = str(frame['interaction_id']);
          if (id.length === 0) break;
          if (status === 'ended') {
            setPending((previous) => previous.filter((entry) => entry.item.id !== id));
            break;
          }
          if (status !== 'pending') break;
          const request = frame['request'];
          if (typeof request !== 'object' || request === null) break;
          const body = request as Record<string, unknown>;
          const sessionId = str(frame['session_id']) || currentIdRef.current || '';
          if (frame['kind'] === 'approval') {
            setPending((previous) => [
              ...previous.filter((entry) => entry.item.id !== id),
              {
                kind: 'approval',
                item: {
                  id,
                  sessionId,
                  toolName: str(body['tool_name'], 'tool'),
                  action: str(body['action']),
                  display: body['tool_input_display'],
                },
              },
            ]);
          } else if (frame['kind'] === 'question' && Array.isArray(body['questions'])) {
            setPending((previous) => [
              ...previous.filter((entry) => entry.item.id !== id),
              {
                kind: 'question',
                item: { id, sessionId, questions: body['questions'] as QuestionItem[] },
              },
            ]);
          }
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
          setModels(modelPage.items);
          const initial = configData.default_model ?? modelPage.items[0]?.model ?? '';
          setModel(initial);
          const entry = modelPage.items.find((item) => item.model === initial);
          const levels = entry?.support_efforts ?? [];
          setEffort(entry?.default_effort ?? levels[Math.floor(levels.length / 2)] ?? '');
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
    if (!pickerOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  useEffect(() => {
    if (currentId === undefined) return;
    void refreshMessages(currentId);
    void getSnapshot(currentId)
      .then((snapshot) => {
        const sessionModel = snapshot.session.agent_config?.model;
        if (typeof sessionModel === 'string' && sessionModel.length > 0) setModel(sessionModel);
        const sessionThinking = snapshot.session.agent_config?.thinking;
        if (typeof sessionThinking === 'string' && sessionThinking.length > 0) setEffort(sessionThinking);
      })
      .catch(() => undefined);
    socketRef.current?.subscribe(currentId);
    framesRef.current = {};
    setLive(undefined);
  }, [currentId, refreshMessages]);

  const addFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: FileMeta[] = [];
      for (const file of files) uploaded.push(await uploadFile(file));
      setAttachments((previous) => [...previous, ...uploaded]);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }, []);

  const commitRename = useCallback(
    async (id: string) => {
      const title = renameValue.trim();
      setRenamingId(undefined);
      if (title.length === 0) return;
      try {
        await renameSession(id, title);
        await reload();
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }
    },
    [renameValue, reload],
  );

  const loadPanels = useCallback(async (which: 'plugins' | 'mcp') => {
    setPanel(which);
    try {
      if (which === 'plugins') {
        const result = await listPlugins();
        setPlugins(result.plugins);
      } else {
        const result = await listMcpServers();
        setMcpServers(result);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const startWithPrompt = useCallback(
    async (text: string) => {
      setBusy(true);
      framesRef.current = {};
      try {
        const session = await createSession(cwd);
        if (model.length > 0) {
          await setSessionConfig(session.id, effort.length > 0 ? { model, thinking: effort } : { model });
        }
        await reload();
        setCurrentId(session.id);
        // Let the session subscription attach before the first turn starts.
        await new Promise((resolve) => setTimeout(resolve, 250));
        await sendPrompt(session.id, text);
      } catch (error) {
        setBusy(false);
        setError(error instanceof Error ? error.message : String(error));
      }
    },
    [cwd, model, effort, reload],
  );

  const submit = useCallback(async () => {
    const text = composer.trim();
    if (text.length === 0 && attachments.length === 0) return;
    setComposer('');
    if (currentId === undefined) {
      await startWithPrompt(text);
      return;
    }
    const pendingFiles = attachments;
    setAttachments([]);
    setItems((previous) => [
      ...previous,
      {
        id: `local_${crypto.randomUUID()}`,
        role: 'user',
        text,
        thinking: '',
        tools: [],
        images: pendingFiles
          .filter((file) => file.media_type.startsWith('image/'))
          .map((file) => ({ fileId: file.id })),
      },
    ]);
    setBusy(true);
    framesRef.current = {};
    try {
      await sendPrompt(currentId, text, pendingFiles);
    } catch (error) {
      setBusy(false);
      setError(error instanceof Error ? error.message : String(error));
    }
  }, [composer, currentId, attachments, startWithPrompt]);

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
      if (model.length > 0) {
        await setSessionConfig(session.id, effort.length > 0 ? { model, thinking: effort } : { model });
      }
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

  useEffect(() => {
    if (panel !== 'none') void loadPanels(panel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem('nighthawk.theme', theme);
  }, [theme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        void newSession();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newSession]);

  const selectedEntry = useMemo(
    () => models.find((entry) => entry.model === model),
    [models, model],
  );
  const efforts = useMemo(() => selectedEntry?.support_efforts ?? [], [selectedEntry]);
  const effortText = effort.length > 0 ? effortLabel(effort) : '';

  const applyConfig = useCallback(
    (patch: { model?: string; thinking?: string }) => {
      const sessionId = currentIdRef.current;
      if (sessionId === undefined) return;
      void setSessionConfig(sessionId, patch).catch((error) => {
        setError(error instanceof Error ? error.message : String(error));
      });
    },
    [],
  );

  const selectModel = useCallback(
    (entry: ModelEntry) => {
      const list = entry.support_efforts ?? [];
      const nextEffort = entry.default_effort ?? list[Math.floor(list.length / 2)] ?? '';
      setModel(entry.model);
      setEffort(nextEffort);
      applyConfig({ model: entry.model, ...(nextEffort.length > 0 ? { thinking: nextEffort } : {}) });
      setPickerOpen(false);
    },
    [applyConfig],
  );

  const changeEffort = useCallback(
    (value: string) => {
      setEffort(value);
      if (effortTimer.current !== undefined) window.clearTimeout(effortTimer.current);
      effortTimer.current = window.setTimeout(() => applyConfig({ thinking: value }), 350);
    },
    [applyConfig],
  );

  const removeSession = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
        setConfirmDeleteId(undefined);
        if (currentIdRef.current === id) setCurrentId(undefined);
        await reload();
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }
    },
    [reload],
  );

  const resolveApproval = useCallback(
    (item: ApprovalItem, decision: 'approved' | 'rejected', scope?: 'session') => {
      setPending((previous) => previous.filter((entry) => entry.item.id !== item.id));
      void respondInteraction(
        item.sessionId,
        item.id,
        scope === undefined ? { kind: 'approval', decision } : { kind: 'approval', decision, scope },
      ).catch((error) => {
        setError(error instanceof Error ? error.message : String(error));
      });
    },
    [],
  );

  const answerQuestion = useCallback((item: QuestionPrompt, answers: Record<string, unknown>) => {
    setPending((previous) => previous.filter((entry) => entry.item.id !== item.id));
    void respondInteraction(item.sessionId, item.id, { kind: 'question', answers }).catch((error) => {
      setError(error instanceof Error ? error.message : String(error));
    });
  }, []);

  const dismissPendingQuestion = useCallback((item: QuestionPrompt) => {
    setPending((previous) => previous.filter((entry) => entry.item.id !== item.id));
    void respondInteraction(item.sessionId, item.id, { kind: 'question', dismissed: true }).catch(() => undefined);
  }, []);

  const visibleSessions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return sessions;
    return sessions.filter((session) =>
      `${session.title} ${session.last_prompt} ${session.metadata.cwd ?? ''}`.toLowerCase().includes(needle),
    );
  }, [sessions, query]);

  const visibleItems = useMemo(() => {
    if (live === undefined) return items;
    if (live.text.length === 0 && live.tools.length === 0 && live.thinking.length === 0) return items;
    return [...items, live];
  }, [items, live]);

  useEffect(() => {
    const element = transcriptRef.current;
    if (element === null) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distance < 140) element.scrollTop = element.scrollHeight;
  }, [visibleItems]);

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

  const composerNode = (
          <footer className={`composer${current === undefined ? ' composer-inline' : ''}`}>
            {pending.length > 0 && (
              <div className="pending-stack">
                {pending.map((entry) =>
                  entry.kind === 'approval' ? (
                    <ApprovalCard
                      key={entry.item.id}
                      item={entry.item}
                      onResolve={(decision, scope) => resolveApproval(entry.item, decision, scope)}
                    />
                  ) : (
                    <QuestionCard
                      key={entry.item.id}
                      item={entry.item}
                      onAnswer={(answers) => answerQuestion(entry.item, answers)}
                      onDismiss={() => dismissPendingQuestion(entry.item)}
                    />
                  ),
                )}
              </div>
            )}
            <div className="composer-inner">
              {pickerOpen && <div className="picker-backdrop" onClick={() => setPickerOpen(false)} />}
              {pickerOpen && (
                <div className="model-picker">
                  <div className="picker-head">
                    <span className="picker-title">模型</span>
                    <span className="picker-scope">{selectedEntry?.provider ?? ''}</span>
                    <button type="button" className="picker-close" onClick={() => setPickerOpen(false)}>
                      ×
                    </button>
                  </div>
                  {efforts.length > 0 && (
                    <div className="tier-row">
                      <span className="tier-label">强度</span>
                      {efforts.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={value === effort ? 'tier-chip active' : 'tier-chip'}
                          onClick={() => changeEffort(value)}
                        >
                          {effortLabel(value)}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="picker-list">
                    {groupedModels.map(([provider, entries]) => (
                      <div className="picker-group" key={provider}>
                        <div className="picker-group-title">{provider}</div>
                        {entries.map((entry) => (
                          <button
                            type="button"
                            key={entry.model}
                            className={entry.model === model ? 'picker-item active' : 'picker-item'}
                            onClick={() => selectModel(entry)}
                          >
                            <span className="picker-item-name">{entry.display_name ?? entry.model}</span>
                            <span className="picker-item-meta">
                              {entry.support_efforts !== undefined && entry.support_efforts.length > 0
                                ? `${String(entry.support_efforts.length)} 档`
                                : '—'}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = '';
                  void addFiles(files);
                }}
              />
              {attachments.length > 0 && (
                <div className="attachments">
                  {attachments.map((file) => (
                    <span className="attachment-chip" key={file.id}>
                      <span className="attachment-name">{file.name}</span>
                      <button
                        type="button"
                        aria-label="移除附件"
                        onClick={() =>
                          setAttachments((previous) => previous.filter((item) => item.id !== file.id))
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                onPaste={(event) => {
                  const files = Array.from(event.clipboardData.files);
                  if (files.length > 0) {
                    event.preventDefault();
                    void addFiles(files);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder="问点什么，Enter 发送，Shift+Enter 换行"
                rows={2}
              />
              <div className="composer-bar">
                <div className="composer-left">
                  <button
                    type="button"
                    className="bar-icon"
                    title="在当前目录新建会话"
                    onClick={() => void newSession()}
                  >
                    ＋
                  </button>
                  <button
                    type="button"
                    className="bar-icon"
                    title="添加附件"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? '…' : (
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                        <path d="M10.5 4.5 5.9 9.1a2 2 0 0 0 2.8 2.8l4.8-4.8a3.2 3.2 0 0 0-4.5-4.5L3.9 7.7a4.4 4.4 0 0 0 6.2 6.2l4-4" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="composer-right">
                  <button
                    type="button"
                    className="model-trigger"
                    aria-expanded={pickerOpen}
                    onClick={() => setPickerOpen((open) => !open)}
                  >
                    <span className="model-trigger-name">
                      {selectedEntry?.display_name ?? model ?? '选择模型'}
                    </span>
                    {effortText.length > 0 && <span className="model-trigger-tier">· {effortText}</span>}
                    <span className="chev">⌄</span>
                  </button>
                  {busy ? (
                    <button type="button" className="send-btn stop" aria-label="停止" onClick={() => void stop()}>
                      <span className="send-stop" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="send-btn"
                      aria-label="发送"
                      disabled={composer.trim().length === 0}
                      onClick={() => void submit()}
                    >
                      ↑
                    </button>
                  )}
                </div>
              </div>
            </div>
          </footer>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="/nighthawk-icon.svg" alt="" width={22} height={22} />
          <span className="brand-name">NightHawk</span>
          <span className="brand-tag">codex</span>
          <span className={`dot ${status}`} title={status} />
        </div>
        <button type="button" className="new-chat" onClick={() => void newSession()}>
          <span className="new-chat-label">＋　新建会话</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="new-session">
          <input
            value={cwd}
            onChange={(event) => setCwd(event.target.value)}
            placeholder="工作目录"
            spellCheck={false}
          />
        </div>
        <div className="session-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索会话"
            spellCheck={false}
          />
        </div>
        <div className="sidebar-label">对话</div>
        <nav className="sessions">
          {visibleSessions.map((session) => (
            <div key={session.id} className={session.id === currentId ? 'session-row active' : 'session-row'}>
              {renamingId === session.id ? (
                <div className="session-main">
                  <input
                    className="session-rename"
                    autoFocus
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={() => void commitRename(session.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void commitRename(session.id);
                      if (event.key === 'Escape') setRenamingId(undefined);
                    }}
                  />
                </div>
              ) : (
                <button type="button" className="session-main" onClick={() => setCurrentId(session.id)}>
                  <span className="session-title">
                    {session.title.length > 0 ? session.title : session.last_prompt || '新会话'}
                  </span>
                  <span className="session-meta">
                    {session.busy
                      ? '运行中'
                      : session.pending_interaction !== 'none'
                        ? '待确认'
                        : (session.metadata.cwd ?? '')}
                  </span>
                </button>
              )}
              <button
                type="button"
                className="session-delete"
                aria-label="重命名会话"
                onClick={() => {
                  setRenamingId(session.id);
                  setRenameValue(session.title.length > 0 ? session.title : session.last_prompt);
                }}
              >
                <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 13.5h2.5L13 6a1.6 1.6 0 0 0-2.3-2.3L3 11.2V13.5Z" />
                </svg>
              </button>
              {confirmDeleteId === session.id ? (
                <span className="session-confirm">
                  <button type="button" className="danger" onClick={() => void removeSession(session.id)}>
                    删除
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(undefined)}>
                    取消
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="session-delete"
                  aria-label="删除会话"
                  onClick={() => setConfirmDeleteId(session.id)}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 4.2h10M6.4 4.2V2.6h3.2v1.6M4.6 4.2l.6 8.4h5.6l.6-8.4" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {visibleSessions.length === 0 && <div className="sessions-empty">没有会话</div>}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="footer-btn" onClick={() => void loadPanels('plugins')}>
            插件
          </button>
          <button type="button" className="footer-btn" onClick={() => void loadPanels('mcp')}>
            MCP
          </button>
          <button
            type="button"
            className="footer-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '浅色' : '深色'}
          </button>
          {meta !== undefined && str(meta['version']).length > 0 && (
            <span className="version">v{str(meta['version'])}</span>
          )}
        </div>
      </aside>

      <main className="main">
        {current !== undefined && (
          <header className="header">
            <div className="header-title">
              <strong>{current.title.length > 0 ? current.title : '未命名会话'}</strong>
              <span className="cwd">{current.metadata.cwd ?? ''}</span>
            </div>
            <span className={`pill ${busy ? 'busy' : 'idle'}`}>{busy ? '运行中' : '空闲'}</span>
          </header>
        )}

        {current === undefined ? (
          <div className="welcome">
            <div className="tome ornate">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <div className="tome-label">CODEX · NIGHTHAWK</div>
              <h1 className="welcome-mark">Nighthawk</h1>
              <div className="rule" />
              <p className="welcome-sub">本地运行的编码 agent。模型与密钥，皆藏于你自己的 config.toml。</p>
              <div className="welcome-chips">
              {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" className="chip" onClick={() => void startWithPrompt(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            {composerNode}
          </div>
        ) : (
          <>
          <div className="transcript" ref={transcriptRef}>
            {visibleItems.map((item) => (
              <article key={item.id} className={`message ${item.role}`}>
                <div className="role">{item.role === 'user' ? '你' : 'NightHawk'}</div>
                {item.images.length > 0 && (
                  <div className="msg-images">
                    {item.images.map((ref, index) =>
                      ref.url !== undefined ? (
                        <img key={`${item.id}_${String(index)}`} src={ref.url} alt="" loading="lazy" />
                      ) : (
                        <AuthImage
                          key={`${item.id}_${String(index)}`}
                          sessionId={current?.id ?? ''}
                          fileId={ref.fileId ?? ''}
                        />
                      ),
                    )}
                  </div>
                )}
                {item.role === 'assistant' && item.text.length > 0 && (
                  <button
                    type="button"
                    className="msg-copy"
                    title="复制这条回复"
                    onClick={() => {
                      void navigator.clipboard.writeText(item.text);
                    }}
                  >
                    复制
                  </button>
                )}
                {item.thinking.length > 0 && (
                  <details className="thinking">
                    <summary>思考</summary>
                    <pre>{item.thinking}</pre>
                  </details>
                )}
                {item.text.length > 0 &&
                  (item.role === 'assistant' ? (
                    <Markdown text={item.text} />
                  ) : (
                    <div className="text">{item.text}</div>
                  ))}
                {item.tools.map((tool) => (
                  <details key={tool.id} className={`tool ${tool.isError === true ? 'failed' : ''}`}>
                    <summary>
                      <span className="tool-name">{tool.name}</span>
                      <span className="tool-state">
                        {tool.running ? '运行中' : tool.isError === true ? '失败' : '完成'}
                      </span>
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
          {composerNode}
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

      {panel !== 'none' && (
        <>
          <div className="sheet-backdrop" onClick={() => setPanel('none')} />
          <aside className="sheet">
            <div className="sheet-head">
              <button
                type="button"
                className={panel === 'plugins' ? 'sheet-tab active' : 'sheet-tab'}
                onClick={() => void loadPanels('plugins')}
              >
                插件
              </button>
              <button
                type="button"
                className={panel === 'mcp' ? 'sheet-tab active' : 'sheet-tab'}
                onClick={() => void loadPanels('mcp')}
              >
                MCP
              </button>
              <button type="button" className="sheet-close" onClick={() => setPanel('none')}>
                ×
              </button>
            </div>
            <div className="sheet-body">
              {panel === 'plugins' ? (
                plugins.length === 0 ? (
                  <div className="sheet-empty">没有已安装的插件</div>
                ) : (
                  plugins.map((plugin) => (
                    <div className="sheet-item" key={plugin.id}>
                      <div className="sheet-item-head">
                        <span className="sheet-item-name">{plugin.displayName}</span>
                        <span className={plugin.enabled ? 'sheet-badge on' : 'sheet-badge'}>
                          {plugin.enabled ? '已启用' : '已停用'}
                        </span>
                      </div>
                      <div className="sheet-item-meta">
                        {[plugin.version, plugin.description].filter((part) => part !== undefined).join(' · ')}
                      </div>
                      <div className="sheet-item-sub">
                        skills {plugin.skillCount} · mcp {plugin.mcpServerCount}
                      </div>
                    </div>
                  ))
                )
              ) : mcpServers.length === 0 ? (
                <div className="sheet-empty">没有 MCP 服务</div>
              ) : (
                mcpServers.map((server, index) => {
                  const name = str(server['name'], `server ${String(index)}`);
                  const enabled = server['enabled'] === true;
                  const where = str(server['url']) || str(server['command']);
                  return (
                    <div className="sheet-item" key={name}>
                      <div className="sheet-item-head">
                        <span className="sheet-item-name">{name}</span>
                        <span className={enabled ? 'sheet-badge on' : 'sheet-badge'}>
                          {enabled ? '已启用' : '已停用'}
                        </span>
                      </div>
                      <div className="sheet-item-meta">
                        {[str(server['transport']), where].filter((part) => part.length > 0).join(' · ')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
