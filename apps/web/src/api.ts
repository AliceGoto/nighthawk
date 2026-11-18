export interface Envelope<T> {
  code: number;
  msg: string;
  data: T;
  request_id: string;
}

export interface Session {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  busy: boolean;
  main_turn_active: boolean;
  pending_interaction: 'none' | 'approval' | 'question';
  last_prompt: string;
  metadata: { cwd?: string; [key: string]: unknown };
  agent_config?: { model?: string; thinking?: string; plan_mode?: boolean; permission_mode?: string };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_creation_tokens: number;
    total_cost_usd: number;
    context_tokens: number;
    context_limit: number;
    turn_count: number;
  };
}

export interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  tool_call_id?: string;
  tool_name?: string;
  input?: unknown;
  output?: unknown;
  tool_use_id?: string;
  image_url?: { url: string; id?: string };
  imageUrl?: { url: string };
  source?: {
    kind?: string;
    url?: string;
    data?: string;
    media_type?: string;
    file_id?: string;
  };
  content?: unknown;
  is_error?: boolean;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: ContentBlock[];
  created_at: string;
}

export class ApiError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

let token = '';

export function getToken(): string {
  return token;
}

export function setToken(value: string): void {
  token = value;
  localStorage.setItem('nighthawk.token', value);
}

export function loadToken(): string {
  const fromHash = new URLSearchParams(location.hash.replace(/^#/, '')).get('token');
  const stored = localStorage.getItem('nighthawk.token') ?? '';
  const value = fromHash ?? stored;
  if (fromHash !== null) {
    localStorage.setItem('nighthawk.token', fromHash);
    history.replaceState(null, '', location.pathname + location.search);
  }
  token = value;
  return value;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${getToken()}`);
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) throw new ApiError(40101, 'unauthorized');
  if (res.status === 204) return undefined as T;
  const envelope = (await res.json()) as Envelope<T>;
  if (envelope.code !== 0) throw new ApiError(envelope.code, envelope.msg);
  return envelope.data;
}

export interface Config {
  default_model?: string;
  default_provider?: string;
  models: Record<string, unknown>;
}

export function getConfig(): Promise<Config> {
  return request('/api/v1/config');
}

export function setSessionConfig(
  sessionId: string,
  patch: {
    model?: string;
    thinking?: string;
    plan_mode?: boolean;
    permission_mode?: string;
    goal_control?: 'pause' | 'resume' | 'cancel';
  },
): Promise<Session> {
  return request(`/api/v1/sessions/${sessionId}/profile`, {
    method: 'POST',
    body: JSON.stringify({ agent_config: patch }),
  });
}

export interface ModelEntry {
  provider: string;
  model: string;
  display_name?: string;
  max_context_size?: number;
  support_efforts?: string[];
  default_effort?: string;
}

export function listModels(): Promise<{ items: ModelEntry[] }> {
  return request('/api/v1/models');
}

export function setDefaultModel(modelAlias: string): Promise<unknown> {
  return request(`/api/v1/models/${encodeURIComponent(modelAlias)}:set_default`, {
    method: 'POST',
    body: '{}',
  });
}

export function getSession(sessionId: string): Promise<Session> {
  return request(`/api/v1/sessions/${sessionId}`);
}

export function getMeta(): Promise<Record<string, unknown>> {
  return request('/api/v1/meta');
}

export function listSessions(): Promise<{ items: Session[]; has_more: boolean }> {
  return request('/api/v1/sessions?page_size=50');
}

export function createSession(cwd: string): Promise<Session> {
  return request('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({ metadata: { cwd } }),
  });
}

export function listMessages(sessionId: string): Promise<{ items: Message[] }> {
  return request(`/api/v1/sessions/${sessionId}/messages?page_size=100`);
}

export function sendPrompt(sessionId: string, text: string, files: FileMeta[] = []): Promise<unknown> {
  const content: Record<string, unknown>[] = [];
  if (text.length > 0) content.push({ type: 'text', text });
  for (const file of files) {
    if (file.media_type.startsWith('image/')) {
      content.push({ type: 'image', source: { kind: 'file', file_id: file.id } });
    } else {
      content.push({
        type: 'file',
        file_id: file.id,
        name: file.name,
        media_type: file.media_type,
        size: file.size,
      });
    }
  }
  return request(`/api/v1/sessions/${sessionId}/prompts`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export interface ApprovalWire {
  approval_id: string;
  session_id: string;
  agent_id: string;
  tool_call_id: string;
  tool_name: string;
  action: string;
  tool_input_display?: unknown;
  created_at: string;
  expires_at: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface QuestionItem {
  id: string;
  question: string;
  header?: string;
  body?: string;
  options: QuestionOption[];
  multi_select?: boolean;
  allow_other?: boolean;
  other_label?: string;
}

export interface QuestionWire {
  question_id: string;
  session_id: string;
  agent_id?: string;
  questions: QuestionItem[];
  created_at: string;
}

export interface FileMeta {
  id: string;
  name: string;
  media_type: string;
  size: number;
}

export interface PluginSummary {
  id: string;
  displayName: string;
  description?: string;
  version?: string;
  enabled: boolean;
  state: 'ok' | 'error';
  skillCount: number;
  mcpServerCount: number;
}

export function renameSession(sessionId: string, title: string): Promise<Session> {
  return request(`/api/v1/sessions/${sessionId}/profile`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function uploadFile(file: File): Promise<FileMeta> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  const envelope = (await res.json()) as Envelope<FileMeta>;
  if (envelope.code !== 0) throw new ApiError(envelope.code, envelope.msg);
  return envelope.data;
}

export function listPlugins(): Promise<{ plugins: PluginSummary[] }> {
  return request('/api/v1/plugins');
}

export function listMcpServers(): Promise<Record<string, unknown>[]> {
  return request('/api/v2/mcp/servers');
}

export interface ProviderItem {
  id: string;
  type?: string;
  base_url?: string;
  has_api_key?: boolean;
  model_count?: number;
  default_model?: string;
  models?: string[];
  status?: string;
  api_key_env?: string;
}

export interface SkillItem {
  name: string;
  description?: string;
  source?: string;
  path?: string;
}

export function listProviders(): Promise<{ items: ProviderItem[] }> {
  return request('/api/v1/providers');
}

export function createProvider(body: {
  id: string;
  type: string;
  base_url?: string;
  api_key?: string;
  models: { model: string; max_context_size: number }[];
}): Promise<unknown> {
  return request('/api/v1/providers', { method: 'POST', body: JSON.stringify(body) });
}

export function deleteProvider(providerId: string): Promise<void> {
  return request(`/api/v1/providers/${encodeURIComponent(providerId)}`, { method: 'DELETE' });
}

export function updateProvider(
  providerId: string,
  body: {
    type: string;
    base_url?: string;
    api_key?: string;
    api_key_env?: string;
    default_model?: string;
    new_id?: string;
    models: { model: string; max_context_size: number }[];
  },
): Promise<{ provider: ProviderItem }> {
  return request(`/api/v1/providers/${encodeURIComponent(providerId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      type: body.type,
      ...(body.base_url === undefined ? {} : { base_url: body.base_url }),
      ...(body.api_key === undefined ? {} : { api_key: body.api_key }),
      ...(body.api_key_env === undefined ? {} : { api_key_env: body.api_key_env }),
      ...(body.default_model === undefined ? {} : { default_model: body.default_model }),
      ...(body.new_id === undefined ? {} : { new_id: body.new_id }),
      models: body.models,
    }),
  });
}

export function listSkills(sessionId: string): Promise<{ skills: SkillItem[] }> {
  return request(`/api/v1/sessions/${sessionId}/skills`);
}

export function activateSkill(
  sessionId: string,
  name: string,
  args?: string,
): Promise<{ activated: true; skill_name: string }> {
  return request(`/api/v1/sessions/${sessionId}/skills/${encodeURIComponent(name)}:activate`, {
    method: 'POST',
    body: JSON.stringify({ args }),
  });
}

export async function exportSession(sessionId: string): Promise<Blob> {
  const response = await fetch(`/api/v1/sessions/${sessionId}/export`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) throw new ApiError(response.status, 'export failed');
  return response.blob();
}

export function respondInteraction(
  sessionId: string,
  interactionId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  return request(`/api/v1/sessions/${sessionId}/interactions/${interactionId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteSession(sessionId: string): Promise<unknown> {
  return request(`/api/v1/sessions/${sessionId}:delete`, { method: 'POST', body: '{}' });
}

export function abortSession(sessionId: string): Promise<unknown> {
  return request(`/api/v1/sessions/${sessionId}:abort`, { method: 'POST' });
}

export interface CronTaskItem {
  id: string;
  cron: string;
  prompt: string;
  created_at: number;
  recurring: boolean;
  next_fire_at: number | null;
  stale: boolean;
}

export function listCronTasks(sessionId: string): Promise<{ items: CronTaskItem[] }> {
  return request(`/api/v1/sessions/${sessionId}/cron`);
}

export function createCronTask(
  sessionId: string,
  body: { cron: string; prompt: string; recurring?: boolean },
): Promise<{ task: CronTaskItem }> {
  return request(`/api/v1/sessions/${sessionId}/cron`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteCronTask(sessionId: string, taskId: string): Promise<{ removed: string[] }> {
  return request(`/api/v1/sessions/${sessionId}/cron/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
}

export interface SearchHit {
  session_id: string;
  workspace_id: string;
  session_title: string;
  agent_id: string;
  role: 'user' | 'assistant' | 'title';
  snippet: string;
  time: number;
  turn?: number;
  score: number;
}

export interface SearchResult {
  items: SearchHit[];
  has_more: boolean;
  page_token?: string;
  index_state: {
    state: 'building' | 'ready' | 'readonly';
    indexed_sessions: number;
    total_sessions: number;
    documents: number;
    stale?: boolean;
    degraded?: string;
  };
  source: 'live' | 'index';
}

export function searchMessages(query: string, pageSize = 20): Promise<SearchResult> {
  return request('/api/v1/search', {
    method: 'POST',
    body: JSON.stringify({ query, page_size: pageSize }),
  });
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  binary?: boolean;
  oversize?: boolean;
}

export function getFileHistoryChanges(
  sessionId: string,
  turnId: number,
): Promise<{ changes: FileChange[]; recorded: boolean }> {
  return request(`/api/v1/sessions/${sessionId}/file-history/changes?turn_id=${String(turnId)}`);
}

export interface GoalSnapshot {
  goalId: string;
  objective: string;
  completionCriterion?: string;
  status: string;
  turnsUsed: number;
  tokensUsed: number;
  wallClockMs: number;
  terminalReason?: string;
}

export function getSessionGoal(sessionId: string): Promise<GoalSnapshot | null> {
  return request(`/api/v1/sessions/${sessionId}/goal`);
}

export interface SessionWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export function getSessionWarnings(sessionId: string): Promise<{ warnings: SessionWarning[] }> {
  return request(`/api/v1/sessions/${sessionId}/warnings`);
}

export interface SessionEnvironmentItem {
  environment_id: string;
  type: 'local' | 'ssh' | 'docker' | 'command';
  status: string;
  connect_error?: string;
}

export function getSessionEnvironments(
  sessionId: string,
): Promise<{ environments: SessionEnvironmentItem[] }> {
  return request(`/api/v1/sessions/${sessionId}/environments`);
}

export function compactSession(sessionId: string): Promise<unknown> {
  return request(`/api/v1/sessions/${sessionId}:compact`, { method: 'POST', body: '{}' });
}
