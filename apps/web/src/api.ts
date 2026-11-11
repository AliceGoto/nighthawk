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
  agent_config?: { model?: string };
}

export interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
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

export function setSessionModel(sessionId: string, model: string): Promise<Session> {
  return request(`/api/v1/sessions/${sessionId}/profile`, {
    method: 'POST',
    body: JSON.stringify({ agent_config: { model } }),
  });
}

export interface ModelEntry {
  provider: string;
  model: string;
  display_name?: string;
  max_context_size?: number;
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

export function sendPrompt(sessionId: string, text: string): Promise<unknown> {
  return request(`/api/v1/sessions/${sessionId}/prompts`, {
    method: 'POST',
    body: JSON.stringify({ content: [{ type: 'text', text }] }),
  });
}

export function abortSession(sessionId: string): Promise<unknown> {
  return request(`/api/v1/sessions/${sessionId}:abort`, { method: 'POST' });
}
