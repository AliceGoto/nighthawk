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
  agent_config?: { model?: string; thinking?: string };
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
  patch: { model?: string; thinking?: string },
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

export function getSnapshot(sessionId: string): Promise<{ session: Session }> {
  return request(`/api/v1/sessions/${sessionId}/snapshot`);
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
