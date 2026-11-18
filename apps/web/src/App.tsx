import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';

import {
  ApiError,
  abortSession,
  activateSkill,
  createCronTask,
  createProvider,
  createSession,
  deleteCronTask,
  deleteProvider,
  deleteSession,
  exportSession,
  getConfig,
  getMeta,
  getSession,
  listCronTasks,
  listModels,
  listMcpServers,
  listProviders,
  listSkills,
  listMessages,
  listPlugins,
  listSessions,
  loadToken,
  sendPrompt,
  renameSession,
  respondInteraction,
  setDefaultModel,
  setSessionConfig,
  setToken,
  updateProvider,
  uploadFile,
  type CronTaskItem,
  type FileMeta,
  type ModelEntry,
  type PluginSummary,
  type ProviderItem,
  type SkillItem,
  type QuestionItem,
  type Message,
  type Session,
} from './api';
import { AuthImage } from './AuthImage';
import { Markdown } from './Markdown';
import { ModelMenu } from './ModelMenu';
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

const SIDEBAR_MIN = 264;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 280;
const SIDEBAR_AUTO_COLLAPSE = 1024;
const SIDEBAR_DRAWER = 768;
const CENTER_MIN = 400;
const RIGHT_MIN = 320;
const RIGHT_DEFAULT_RATIO = 0.45;
const RIGHT_MAX_RATIO = 0.7;

const PANEL_TABS = [
  ['plugins', '插件'],
  ['providers', '供应商'],
  ['skills', 'Skills'],
  ['mcp', 'MCP'],
  ['cron', '定时'],
] as const;

type PanelTab = (typeof PANEL_TABS)[number][0];

function panelFromUrl(): PanelTab | undefined {
  const fromUrl = new URLSearchParams(location.search).get('panel');
  return PANEL_TABS.find(([tab]) => tab === fromUrl)?.[0];
}

function readStoredWidth(key: string): number | undefined {
  const raw = localStorage.getItem(key);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function clampWidth(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

const PROVIDER_STATUS_LABELS: Record<string, string> = {
  connected: '已连接',
  error: '异常',
  unconfigured: '未配置',
};

function providerStatusLabel(value: string): string {
  return PROVIDER_STATUS_LABELS[value] ?? value;
}

function formatLocalTime(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function modelAliasesOf(provider: ProviderItem): string[] {
  const aliases = provider.models ?? [];
  const fallback = provider.default_model;
  if (fallback !== undefined && !aliases.includes(fallback)) return [fallback, ...aliases];
  return aliases;
}

const DEFAULT_MAX_CONTEXT = 131072;

function parseProviderModels(text: string): { model: string; max_context_size: number }[] {
  const entries: { model: string; max_context_size: number }[] = [];
  const seen = new Set<string>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) continue;
    const colon = line.lastIndexOf(':');
    const tail = colon > 0 ? line.slice(colon + 1).trim() : '';
    const sized = /^\d+$/.test(tail);
    const model = (sized ? line.slice(0, colon) : line).trim();
    if (model.length === 0 || seen.has(model)) continue;
    seen.add(model);
    const context = sized ? Number(tail) : DEFAULT_MAX_CONTEXT;
    entries.push({ model, max_context_size: context > 0 ? context : DEFAULT_MAX_CONTEXT });
  }
  return entries;
}

function providerModelsText(provider: ProviderItem, entries: ModelEntry[]): string {
  const prefix = `${provider.id}/`;
  return modelAliasesOf(provider)
    .map((alias) => {
      const model = alias.startsWith(prefix) ? alias.slice(prefix.length) : alias;
      const size = entries.find((item) => item.model === alias)?.max_context_size ?? DEFAULT_MAX_CONTEXT;
      return `${model}:${String(size)}`;
    })
    .join('\n');
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

function DragHandle({
  side,
  style,
  onStart,
  onDrag,
  onEnd,
}: {
  side: 'sidebar' | 'right';
  style: CSSProperties;
  onStart: () => void;
  onDrag: (dx: number) => void;
  onEnd: () => void;
}): ReactElement {
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const origin = useRef(0);
  const latest = useRef(0);
  const frame = useRef<number | null>(null);
  const callbacks = useRef({ onStart, onDrag, onEnd });
  callbacks.current = { onStart, onDrag, onEnd };

  const stop = useCallback((apply: boolean): void => {
    if (!active.current) return;
    active.current = false;
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    if (apply) callbacks.current.onDrag(latest.current - origin.current);
    document.body.classList.remove('is-resizing');
    setDragging(false);
    callbacks.current.onEnd();
  }, []);

  useEffect(
    () => () => {
      if (!active.current) return;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      document.body.classList.remove('is-resizing');
      callbacks.current.onEnd();
    },
    [],
  );

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    origin.current = event.clientX;
    latest.current = event.clientX;
    active.current = true;
    callbacks.current.onStart();
    document.body.classList.add('is-resizing');
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!active.current) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    latest.current = event.clientX;
    frame.current ??= requestAnimationFrame(() => {
      frame.current = null;
      callbacks.current.onDrag(latest.current - origin.current);
    });
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!active.current) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      stop(true);
    },
    [stop],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      stop(false);
    },
    [stop],
  );

  const onLostPointerCapture = useCallback(() => {
    stop(true);
  }, [stop]);

  return (
    <div
      className={`resizer resizer-${side}`}
      style={style}
      data-dragging={dragging ? true : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
    />
  );
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
  const [viewport, setViewport] = useState(() => window.innerWidth);
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    clampWidth(readStoredWidth('nighthawk.sidebarWidth') ?? SIDEBAR_DEFAULT, SIDEBAR_MIN, SIDEBAR_MAX),
  );
  const [rightWidth, setRightWidth] = useState<number | undefined>(() =>
    readStoredWidth('nighthawk.rightWidth'),
  );
  const [wideSidebarOpen, setWideSidebarOpen] = useState(true);
  const [narrowSidebarOpen, setNarrowSidebarOpen] = useState(false);
  const [panel, setPanel] = useState<PanelTab>(() => panelFromUrl() ?? 'plugins');
  const [panelOpen, setPanelOpen] = useState(() => panelFromUrl() !== undefined);
  const [plugins, setPlugins] = useState<PluginSummary[]>([]);
  const [mcpServers, setMcpServers] = useState<Record<string, unknown>[]>([]);
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [skillsSessionId, setSkillsSessionId] = useState('');
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [cronSessionId, setCronSessionId] = useState('');
  const [cronTasks, setCronTasks] = useState<CronTaskItem[]>([]);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronExpression, setCronExpression] = useState('');
  const [cronPrompt, setCronPrompt] = useState('');
  const [cronRecurring, setCronRecurring] = useState(true);
  const [cronBusy, setCronBusy] = useState(false);
  const [activatedSkills, setActivatedSkills] = useState<Record<string, boolean>>({});
  const [activatingSkill, setActivatingSkill] = useState<string>();
  const [defaultingModel, setDefaultingModel] = useState<string>();
  const [providerId, setProviderId] = useState('');
  const [providerType, setProviderType] = useState('openai');
  const [providerBaseUrl, setProviderBaseUrl] = useState('');
  const [providerKey, setProviderKey] = useState('');
  const [providerModelsDraft, setProviderModelsDraft] = useState('');
  const [editingProvider, setEditingProvider] = useState<ProviderItem>();
  const [providerBusy, setProviderBusy] = useState(false);
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
  const skillsSessionIdRef = useRef('');
  const cronSessionIdRef = useRef('');
  const sidebarWidthRef = useRef(sidebarWidth);
  const rightWidthRef = useRef(rightWidth);
  const sidebarBase = useRef(0);
  const rightBase = useRef(0);
  const dockedWidthsRef = useRef({ sidebar: 0, right: 0 });
  const { sessions, reload } = useSessions();

  currentIdRef.current = currentId;

  const narrow = viewport < SIDEBAR_AUTO_COLLAPSE;
  const drawer = viewport < SIDEBAR_DRAWER;
  const sidebarOpen = narrow ? narrowSidebarOpen : wideSidebarOpen;
  const sidebarPrefWidth = clampWidth(sidebarWidth, SIDEBAR_MIN, SIDEBAR_MAX);
  const sidebarColumnWidth = sidebarOpen && !drawer ? sidebarPrefWidth : 0;
  const rightPrefWidth = clampWidth(
    rightWidth ?? Math.round(viewport * RIGHT_DEFAULT_RATIO),
    RIGHT_MIN,
    Math.max(RIGHT_MIN, Math.round(viewport * RIGHT_MAX_RATIO)),
  );
  const rightSpace = viewport - sidebarColumnWidth - CENTER_MIN;
  const rightDockWidth = panelOpen ? Math.min(rightPrefWidth, Math.max(0, rightSpace)) : 0;
  const rightMode: 'none' | 'docked' | 'overlay' =
    !panelOpen ? 'none' : drawer || rightDockWidth < RIGHT_MIN ? 'overlay' : 'docked';
  const rightColumnWidth = rightMode === 'docked' ? rightDockWidth : 0;
  const rightDragMax = Math.max(
    RIGHT_MIN,
    Math.min(Math.round(viewport * RIGHT_MAX_RATIO), rightSpace),
  );

  sidebarWidthRef.current = sidebarWidth;
  rightWidthRef.current = rightWidth;
  dockedWidthsRef.current = { sidebar: sidebarColumnWidth, right: rightColumnWidth };

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
          if (currentIdRef.current === undefined) {
            const initial = configData.default_model ?? modelPage.items[0]?.model ?? '';
            setModel(initial);
            const entry = modelPage.items.find((item) => item.model === initial);
            const levels = entry?.support_efforts ?? [];
            setEffort(entry?.default_effort ?? levels[Math.floor(levels.length / 2)] ?? '');
          }
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
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPanelOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen]);

  useEffect(() => {
    if (currentId === undefined) return;
    void refreshMessages(currentId);
    void getSession(currentId)
      .then((session) => {
        const sessionModel = session.agent_config?.model;
        if (typeof sessionModel === 'string' && sessionModel.length > 0) setModel(sessionModel);
        const sessionThinking = session.agent_config?.thinking;
        setEffort(typeof sessionThinking === 'string' ? sessionThinking : '');
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

  const loadSkills = useCallback(async (sessionId: string) => {
    skillsSessionIdRef.current = sessionId;
    setSkillsSessionId(sessionId);
    setSkills([]);
    if (sessionId.length === 0) {
      setSkillsLoading(false);
      return;
    }
    setSkillsLoading(true);
    try {
      const result = await listSkills(sessionId);
      if (skillsSessionIdRef.current !== sessionId) return;
      setSkills(result.skills);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (skillsSessionIdRef.current === sessionId) setSkillsLoading(false);
    }
  }, []);

  const loadCron = useCallback(async (sessionId: string) => {
    cronSessionIdRef.current = sessionId;
    setCronSessionId(sessionId);
    setCronTasks([]);
    if (sessionId.length === 0) {
      setCronLoading(false);
      return;
    }
    setCronLoading(true);
    try {
      const result = await listCronTasks(sessionId);
      if (cronSessionIdRef.current !== sessionId) return;
      setCronTasks(result.items);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      if (cronSessionIdRef.current === sessionId) setCronLoading(false);
    }
  }, []);

  const submitCron = useCallback(async () => {
    const sessionId = cronSessionId;
    const expression = cronExpression.trim();
    const prompt = cronPrompt.trim();
    if (sessionId.length === 0) {
      setError('先选择一个会话');
      return;
    }
    if (expression.length === 0 || prompt.length === 0) {
      setError('cron 表达式和任务内容必填');
      return;
    }
    setCronBusy(true);
    try {
      await createCronTask(sessionId, { cron: expression, prompt, recurring: cronRecurring });
      setCronExpression('');
      setCronPrompt('');
      await loadCron(sessionId);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setCronBusy(false);
    }
  }, [cronSessionId, cronExpression, cronPrompt, cronRecurring, loadCron]);

  const removeCronTask = useCallback(
    async (taskId: string) => {
      const sessionId = cronSessionId;
      if (sessionId.length === 0) return;
      if (!window.confirm('删除这个定时任务？')) return;
      try {
        await deleteCronTask(sessionId, taskId);
        await loadCron(sessionId);
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }
    },
    [cronSessionId, loadCron],
  );

  const loadPanels = useCallback(
    async (which: PanelTab) => {
      setPanel(which);
      setPanelOpen(true);
      try {
        if (which === 'plugins') {
          const result = await listPlugins();
          setPlugins(result.plugins);
        } else if (which === 'mcp') {
          const result = await listMcpServers();
          setMcpServers(result);
        } else if (which === 'providers') {
          const [providerPage, modelPage] = await Promise.all([listProviders(), listModels()]);
          setProviders(providerPage.items);
          setModels(modelPage.items);
        } else if (which === 'cron') {
          await loadCron(currentIdRef.current ?? cronSessionIdRef.current ?? '');
        } else {
          await loadSkills(currentIdRef.current ?? skillsSessionIdRef.current ?? '');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }
    },
    [loadCron, loadSkills],
  );

  const toggleSidebar = useCallback(() => {
    if (narrow) setNarrowSidebarOpen((open) => !open);
    else setWideSidebarOpen((open) => !open);
  }, [narrow]);

  const startSidebarResize = useCallback(() => {
    sidebarBase.current = dockedWidthsRef.current.sidebar;
  }, []);

  const resizeSidebar = useCallback((dx: number) => {
    const next = clampWidth(sidebarBase.current + dx, SIDEBAR_MIN, SIDEBAR_MAX);
    sidebarWidthRef.current = next;
    setSidebarWidth(next);
  }, []);

  const endSidebarResize = useCallback(() => {
    localStorage.setItem('nighthawk.sidebarWidth', String(sidebarWidthRef.current));
  }, []);

  const startRightResize = useCallback(() => {
    rightBase.current = dockedWidthsRef.current.right;
  }, []);

  const resizeRight = useCallback(
    (dx: number) => {
      const next = clampWidth(rightBase.current - dx, RIGHT_MIN, rightDragMax);
      rightWidthRef.current = next;
      setRightWidth(next);
    },
    [rightDragMax],
  );

  const endRightResize = useCallback(() => {
    const width = rightWidthRef.current;
    if (width !== undefined) localStorage.setItem('nighthawk.rightWidth', String(width));
  }, []);

  const resetProviderForm = useCallback(() => {
    setProviderId('');
    setProviderBaseUrl('');
    setProviderKey('');
    setProviderModelsDraft('');
  }, []);

  const startEditProvider = useCallback(
    (provider: ProviderItem) => {
      setEditingProvider(provider);
      setProviderId(provider.id);
      setProviderType(provider.type ?? 'openai');
      setProviderBaseUrl(provider.base_url ?? '');
      setProviderKey('');
      setProviderModelsDraft(providerModelsText(provider, models));
    },
    [models],
  );

  const cancelProviderEdit = useCallback(() => {
    setEditingProvider(undefined);
    resetProviderForm();
  }, [resetProviderForm]);

  const submitProvider = useCallback(async () => {
    const id = providerId.trim();
    const entries = parseProviderModels(providerModelsDraft);
    if (id.length === 0 || entries.length === 0) {
      setError('供应商 id 和模型 id 必填');
      return;
    }
    const baseUrl = providerBaseUrl.trim();
    const apiKey = providerKey.trim();
    setProviderBusy(true);
    try {
      if (editingProvider === undefined) {
        await createProvider({
          id,
          type: providerType,
          base_url: baseUrl.length > 0 ? baseUrl : undefined,
          api_key: apiKey.length > 0 ? apiKey : undefined,
          models: entries,
        });
      } else {
        const original = editingProvider;
        const aliasPrefix = `${original.id}/`;
        const defaultModel =
          original.default_model !== undefined && original.default_model.startsWith(aliasPrefix)
            ? original.default_model.slice(aliasPrefix.length)
            : undefined;
        await updateProvider(original.id, {
          type: providerType,
          base_url: baseUrl.length > 0 ? baseUrl : undefined,
          api_key: apiKey.length > 0 ? apiKey : undefined,
          new_id: id !== original.id ? id : undefined,
          default_model:
            defaultModel !== undefined && entries.some((entry) => entry.model === defaultModel)
              ? defaultModel
              : undefined,
          models: entries,
        });
        setEditingProvider(undefined);
      }
      resetProviderForm();
      await loadPanels('providers');
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setProviderBusy(false);
    }
  }, [providerId, providerType, providerBaseUrl, providerKey, providerModelsDraft, editingProvider, resetProviderForm, loadPanels]);

  const removeProvider = useCallback(
    async (id: string) => {
      if (!window.confirm(`删除供应商「${id}」？它的模型别名也会一并删除。`)) return;
      try {
        await deleteProvider(id);
        await loadPanels('providers');
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }
    },
    [loadPanels],
  );

  const makeDefaultModel = useCallback(
    async (alias: string) => {
      setDefaultingModel(alias);
      try {
        await setDefaultModel(alias);
        await loadPanels('providers');
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setDefaultingModel(undefined);
      }
    },
    [loadPanels],
  );

  const activateSessionSkill = useCallback(async (sessionId: string, name: string) => {
    const answer = window.prompt(`激活 skill「${name}」，可选参数（留空则不传）`);
    if (answer === null) return;
    const args = answer.trim();
    setActivatingSkill(name);
    try {
      const result = await activateSkill(sessionId, name, args.length > 0 ? args : undefined);
      setActivatedSkills((previous) => ({
        ...previous,
        [`${sessionId}:${name}`]: true,
        [`${sessionId}:${result.skill_name}`]: true,
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setActivatingSkill(undefined);
    }
  }, []);

  const downloadExport = useCallback(async () => {
    const sessionId = currentIdRef.current;
    if (sessionId === undefined) return;
    try {
      const blob = await exportSession(sessionId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${sessionId}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
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

  useEffect(() => {
    if (panelOpen) void loadPanels(panel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem('nighthawk.theme', theme);
  }, [theme]);

  useEffect(() => {
    let frame: number | null = null;
    const onResize = (): void => {
      frame ??= requestAnimationFrame(() => {
        frame = null;
        setViewport(window.innerWidth);
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    setNarrowSidebarOpen(false);
  }, [narrow, drawer]);

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
                  <ModelMenu
                    models={models}
                    model={model}
                    effort={effort}
                    onSelectModel={selectModel}
                    onSelectEffort={changeEffort}
                  />
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
    <div
      className="app"
      data-sidebar-drawer={drawer || undefined}
      data-sidebar-open={sidebarOpen || undefined}
      data-sidebar-collapsed={sidebarOpen ? undefined : true}
      data-right-overlay={rightMode === 'overlay' || undefined}
      data-right-full={(panelOpen && drawer) || undefined}
      style={
        {
          '--sidebar-w': `${sidebarColumnWidth}px`,
          '--sidebar-pref-w': `${sidebarPrefWidth}px`,
          '--right-w': `${rightColumnWidth}px`,
          '--right-pref-w': `${rightPrefWidth}px`,
        } as CSSProperties
      }
    >
      <aside id="app-sidebar" className="sidebar" aria-hidden={!sidebarOpen} inert={!sidebarOpen}>
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
          <button type="button" className="footer-btn" onClick={() => void loadPanels('providers')}>
            供应商
          </button>
          <button type="button" className="footer-btn" onClick={() => void loadPanels('mcp')}>
            MCP
          </button>
          <button type="button" className="footer-btn" onClick={() => void loadPanels('cron')}>
            定时
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

      {drawer && sidebarOpen && (
        <div className="drawer-backdrop" onClick={() => setNarrowSidebarOpen(false)} />
      )}

      <main className="main">
        <header className="header">
          <div className="header-left">
            <button
              type="button"
              className="sidebar-toggle"
              aria-controls="app-sidebar"
              aria-expanded={sidebarOpen}
              title={sidebarOpen ? '收起侧栏' : '展开侧栏'}
              aria-label={sidebarOpen ? '收起侧栏' : '展开侧栏'}
              onClick={toggleSidebar}
            >
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
              </svg>
            </button>
            {current !== undefined && (
              <div className="header-title">
                <strong>{current.title.length > 0 ? current.title : '未命名会话'}</strong>
                <span className="cwd">{current.metadata.cwd ?? ''}</span>
              </div>
            )}
          </div>
          {current !== undefined && (
            <div className="header-right">
              <button type="button" className="header-btn" onClick={() => void downloadExport()}>
                导出
              </button>
              <span className={`pill ${busy ? 'busy' : 'idle'}`}>{busy ? '运行中' : '空闲'}</span>
            </div>
          )}
        </header>

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

      {panelOpen && (
        <>
          {rightMode === 'overlay' && (
            <div className="sheet-backdrop" onClick={() => setPanelOpen(false)} />
          )}
          <aside className="sheet">
            <div className="sheet-head">
              {PANEL_TABS.map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  className={panel === tab ? 'sheet-tab active' : 'sheet-tab'}
                  onClick={() => void loadPanels(tab)}
                >
                  {label}
                </button>
              ))}
              <button type="button" className="sheet-close" onClick={() => setPanelOpen(false)}>
                ×
              </button>
            </div>
            <div className="sheet-body">
              {panel === 'plugins' &&
                (plugins.length === 0 ? (
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
                ))}

              {panel === 'mcp' &&
                (mcpServers.length === 0 ? (
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
                ))}

              {panel === 'providers' && (
                <>
                  <div className="sheet-form">
                    <input
                      className="sheet-input"
                      placeholder="供应商 id，例如 deepseek"
                      value={providerId}
                      onChange={(event) => setProviderId(event.target.value)}
                    />
                    <select
                      className="sheet-input"
                      value={providerType}
                      onChange={(event) => setProviderType(event.target.value)}
                    >
                      <option value="openai">openai</option>
                      <option value="openai_responses">openai_responses</option>
                      <option value="anthropic">anthropic</option>
                      <option value="google-genai">google-genai</option>
                      <option value="vertexai">vertexai</option>
                    </select>
                    <input
                      className="sheet-input"
                      placeholder="base_url，例如 https://api.deepseek.com"
                      value={providerBaseUrl}
                      onChange={(event) => setProviderBaseUrl(event.target.value)}
                    />
                    <input
                      className="sheet-input"
                      type="password"
                      placeholder={
                        editingProvider === undefined
                          ? 'API key（只写入，不回显）'
                          : 'API key（留空表示保留原密钥）'
                      }
                      value={providerKey}
                      onChange={(event) => setProviderKey(event.target.value)}
                    />
                    <textarea
                      className="sheet-input sheet-textarea"
                      rows={3}
                      spellCheck={false}
                      placeholder="模型，一行一个：模型 id 或 模型id:上下文长度"
                      value={providerModelsDraft}
                      onChange={(event) => setProviderModelsDraft(event.target.value)}
                    />
                    <div className="sheet-form-actions">
                      <button
                        type="button"
                        className="sheet-submit"
                        disabled={providerBusy}
                        onClick={() => void submitProvider()}
                      >
                        {providerBusy
                          ? editingProvider === undefined
                            ? '提交中…'
                            : '保存中…'
                          : editingProvider === undefined
                            ? '添加供应商'
                            : '保存修改'}
                      </button>
                      {editingProvider !== undefined && (
                        <button type="button" className="sheet-cancel" onClick={cancelProviderEdit}>
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                  {providers.length === 0 ? (
                    <div className="sheet-empty">还没有配置供应商</div>
                  ) : (
                    providers.map((provider) => {
                      const aliases = modelAliasesOf(provider);
                      return (
                        <div className="sheet-item" key={provider.id}>
                          <div className="sheet-item-head">
                            <span className="sheet-item-name">{provider.id}</span>
                            <span className="sheet-item-tail">
                              {provider.status !== undefined && provider.status !== 'connected' && (
                                <span className="sheet-badge warn">
                                  {providerStatusLabel(provider.status)}
                                </span>
                              )}
                              <span className={provider.has_api_key === true ? 'sheet-badge on' : 'sheet-badge'}>
                                {provider.has_api_key === true ? '有密钥' : '无密钥'}
                              </span>
                              <button
                                type="button"
                                className="sheet-action"
                                disabled={editingProvider?.id === provider.id}
                                onClick={() => startEditProvider(provider)}
                              >
                                {editingProvider?.id === provider.id ? '编辑中' : '编辑'}
                              </button>
                              <button
                                type="button"
                                className="sheet-action danger"
                                onClick={() => void removeProvider(provider.id)}
                              >
                                删除
                              </button>
                            </span>
                          </div>
                          <div className="sheet-item-meta">
                            {[str(provider.type), str(provider.base_url)].filter((part) => part.length > 0).join(' · ')}
                          </div>
                          <div className="sheet-item-sub">
                            {provider.default_model !== undefined
                              ? `默认模型 ${provider.default_model}`
                              : '未设置默认模型'}
                          </div>
                          {aliases.length > 0 && (
                            <div className="sheet-chips">
                              <span className="sheet-chip-label">模型</span>
                              {aliases.map((alias) => {
                                const active = alias === provider.default_model;
                                return (
                                  <button
                                    key={alias}
                                    type="button"
                                    className={active ? 'sheet-chip active' : 'sheet-chip'}
                                    title={active ? '当前默认模型' : '设为默认模型'}
                                    disabled={active || defaultingModel === alias}
                                    onClick={() => void makeDefaultModel(alias)}
                                  >
                                    {alias}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {panel === 'skills' && (
                <>
                  <select
                    className="sheet-input"
                    value={skillsSessionId}
                    onChange={(event) => void loadSkills(event.target.value)}
                  >
                    <option value="">选择一个会话</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title.length > 0 ? session.title : session.last_prompt || '新会话'}
                      </option>
                    ))}
                  </select>
                  {skillsSessionId.length === 0 ? (
                    <div className="sheet-empty">先选择一个会话，再查看它可用的 skill</div>
                  ) : skillsLoading ? (
                    <div className="sheet-empty">加载中…</div>
                  ) : skills.length === 0 ? (
                    <div className="sheet-empty">这个会话没有可用 skill</div>
                  ) : (
                    skills.map((skill) => {
                      const activated = activatedSkills[`${skillsSessionId}:${skill.name}`] === true;
                      return (
                        <div className="sheet-item" key={skill.name}>
                          <div className="sheet-item-head">
                            <span className="sheet-item-name">{skill.name}</span>
                            <span className="sheet-item-tail">
                              {skill.source !== undefined && (
                                <span className="sheet-badge">{skill.source}</span>
                              )}
                              {activated ? (
                                <span className="sheet-badge on">已激活</span>
                              ) : (
                                <button
                                  type="button"
                                  className="sheet-action"
                                  disabled={activatingSkill === skill.name}
                                  onClick={() => void activateSessionSkill(skillsSessionId, skill.name)}
                                >
                                  {activatingSkill === skill.name ? '激活中…' : '激活'}
                                </button>
                              )}
                            </span>
                          </div>
                          {skill.description !== undefined && (
                            <div className="sheet-item-meta">{skill.description}</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {panel === 'cron' && (
                <>
                  <select
                    className="sheet-input"
                    value={cronSessionId}
                    onChange={(event) => void loadCron(event.target.value)}
                  >
                    <option value="">选择一个会话</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title.length > 0 ? session.title : session.last_prompt || '新会话'}
                      </option>
                    ))}
                  </select>
                  {cronSessionId.length === 0 ? (
                    <div className="sheet-empty">先选择一个会话，再创建或查看它的定时任务。</div>
                  ) : (
                    <>
                      <div className="sheet-form">
                        <input
                          className="sheet-input"
                          spellCheck={false}
                          placeholder="cron 表达式，例如 0 9 * * *"
                          value={cronExpression}
                          onChange={(event) => setCronExpression(event.target.value)}
                        />
                        <textarea
                          className="sheet-input sheet-textarea"
                          rows={2}
                          placeholder="到点后要发送的任务内容"
                          value={cronPrompt}
                          onChange={(event) => setCronPrompt(event.target.value)}
                        />
                        <label className="sheet-check">
                          <input
                            type="checkbox"
                            checked={cronRecurring}
                            onChange={(event) => setCronRecurring(event.target.checked)}
                          />
                          周期任务
                        </label>
                        <button
                          type="button"
                          className="sheet-submit"
                          disabled={cronBusy}
                          onClick={() => void submitCron()}
                        >
                          {cronBusy ? '创建中…' : '创建定时任务'}
                        </button>
                      </div>
                      {cronLoading ? (
                        <div className="sheet-empty">加载中…</div>
                      ) : cronTasks.length === 0 ? (
                        <div className="sheet-empty">这个会话还没有定时任务。</div>
                      ) : (
                        cronTasks.map((task) => (
                          <div className="sheet-item" key={task.id}>
                            <div className="sheet-item-head">
                              <span className="sheet-cron">{task.cron}</span>
                              <span className="sheet-item-tail">
                                <span className={task.recurring ? 'sheet-badge on' : 'sheet-badge'}>
                                  {task.recurring ? '周期' : '单次'}
                                </span>
                                {task.stale && <span className="sheet-badge warn">已过期</span>}
                                <button
                                  type="button"
                                  className="sheet-action danger"
                                  onClick={() => void removeCronTask(task.id)}
                                >
                                  删除
                                </button>
                              </span>
                            </div>
                            <div className="sheet-prompt">{task.prompt}</div>
                            <div className="sheet-item-sub">
                              {task.next_fire_at === null
                                ? '不再触发'
                                : `下次触发 ${formatLocalTime(task.next_fire_at)}`}
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        </>
      )}

      {sidebarOpen && !drawer && (
        <DragHandle
          side="sidebar"
          style={{ left: sidebarColumnWidth }}
          onStart={startSidebarResize}
          onDrag={resizeSidebar}
          onEnd={endSidebarResize}
        />
      )}
      {rightMode === 'docked' && (
        <DragHandle
          side="right"
          style={{ right: rightColumnWidth }}
          onStart={startRightResize}
          onDrag={resizeRight}
          onEnd={endRightResize}
        />
      )}
    </div>
  );
}
