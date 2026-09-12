/**
 * `nighthawk web` sub-command.
 *
 * Starts a local HTTP server that serves the NightHawk Web UI from `dist-web/`
 * and exposes an OpenAI-compatible API proxy (`/v1/chat/completions`) that
 * forwards requests to the local NightHawk engine.
 *
 * Usage:
 *   nighthawk web --port 3000
 *   nighthawk web --port 3000 --no-open
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

import {
  createNighthawkHarness,
  resolveNighthawkHome,
  type Session,
} from '@nighthawk/nighthawk-sdk';
import type { Command } from 'commander';

import { createNighthawkHostIdentity, getVersion } from '#/cli/version';
import { openUrl } from '#/utils/open-url';

function resolveDistWebDir(): string {
  const candidates = [
    // Development: from dist/main.mjs -> ../dist-web
    resolve(import.meta.dirname, '../dist-web'),
    // Native binary: from extracted dir -> ../../dist-web
    resolve(import.meta.dirname, '../../dist-web'),
    // NightHawk home: ~/.nighthawk/dist-web/
    resolve(resolveNighthawkHome(), 'dist-web'),
    // Current working directory
    resolve(process.cwd(), 'dist-web'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir) && existsSync(resolve(dir, 'index.html'))) {
      return dir;
    }
  }
  // Fallback to the first candidate for a clear error message
  return candidates[0]!;
}

const DIST_WEB_DIR = resolveDistWebDir();

interface WritableLike {
  write(chunk: string): boolean;
}

export interface WebDeps {
  readonly getHomeDir: () => string;
  readonly getVersion: () => string;
  readonly openUrl: (url: string) => Promise<void>;
  readonly waitForShutdown: () => Promise<void>;
  readonly stdout: WritableLike;
  readonly stderr: WritableLike;
  readonly exit: (code: number) => never;
}

export interface WebOptions {
  readonly port: number;
  readonly host: string;
  readonly open: boolean;
  /**
   * Require a bearer token on the /v1/* proxy endpoints. On by default;
   * `--no-auth` disables it, only permitted on a loopback host.
   */
  readonly auth?: boolean;
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase());
}

function headersMatch(expected: string, supplied: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(request: IncomingMessage, token: string | undefined): boolean {
  if (token === undefined) return true;
  const header = request.headers['authorization'];
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  return headersMatch(token, header.slice('Bearer '.length).trim());
}

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.riv': 'application/octet-stream',
};

async function serveStaticFile(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  let urlPath = req.url ?? '/';
  // Strip query string
  const qIndex = urlPath.indexOf('?');
  if (qIndex !== -1) urlPath = urlPath.slice(0, qIndex);
  try {
    urlPath = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return true;
  }

  // Default to index.html
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = join(DIST_WEB_DIR, urlPath);

  // Prevent directory traversal: after join normalization the resolved path
  // must stay inside DIST_WEB_DIR (an exact match or a strict child), so a
  // sibling directory sharing the prefix cannot slip past the check.
  if (filePath !== DIST_WEB_DIR && !filePath.startsWith(DIST_WEB_DIR + sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return true;
  }

  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a session for the web chat completions proxy.
 */
async function createWebSession(): Promise<Session> {
  const identity = createNighthawkHostIdentity(getVersion());
  const harness = createNighthawkHarness({ identity, uiMode: 'web' });
  const session = await harness.createSession({ workDir: process.cwd(), permission: 'auto' });
  return session;
}

function findLastIndex<T>(arr: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i]!)) return i;
  }
  return -1;
}

function formatUsage(usage: { inputOther: number; output: number; inputCacheRead: number; inputCacheCreation: number }): {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
} {
  const promptTokens = usage.inputOther + usage.inputCacheRead + usage.inputCacheCreation;
  return {
    prompt_tokens: promptTokens,
    completion_tokens: usage.output,
    total_tokens: promptTokens + usage.output,
  };
}

/**
 * Group consecutive messages by role, merging same-role runs into a single entry.
 */
function groupMessagesByRole(
  messages: readonly { role: string; content: string }[],
): readonly { role: string; content: string }[] {
  if (messages.length === 0) return [];
  const groups: { role: string; content: string }[] = [];
  let current = { role: messages[0]!.role, content: messages[0]!.content };
  for (let i = 1; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role === current.role) {
      current = { role: current.role, content: `${current.content}\n${m.content}` };
    } else {
      groups.push(current);
      current = { role: m.role, content: m.content };
    }
  }
  groups.push(current);
  return groups;
}

/**
 * Handle an OpenAI-compatible chat completions request.
 */
async function handleChatCompletions(
  req: IncomingMessage,
  res: ServerResponse,
  session: Session,
): Promise<void> {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  try {
    for await (const chunk of req) {
      body += chunk;
    }
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to read request body' }));
    return;
  }

  let parsed: { messages?: Array<{ role: string; content: string }>; stream?: boolean };
  try {
    parsed = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  const messages = parsed.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'messages is required and must be a non-empty array' }));
    return;
  }

  const lastUserIndex = findLastIndex(messages, (m) => m.role === 'user');
  if (lastUserIndex === -1) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No user message found' }));
    return;
  }

  // Rebuild conversation history: group messages by role and alternate
  // between session.prompt() for user messages and importContext for
  // system/assistant messages, so the AI receives the full conversation context.
  const groups = groupMessagesByRole(messages.slice(0, lastUserIndex));
  for (const group of groups) {
    if (group.role === 'user') {
      // Submit user message and wait for the assistant to respond, building context
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          resolve();
        }, 120_000);

        const unsubscribe = session.onEvent((event) => {
          if (event.type === 'turn.ended') {
            clearTimeout(timeout);
            unsubscribe();
            resolve();
          }
        });

        session.prompt(group.content).catch((error: Error) => {
          clearTimeout(timeout);
          unsubscribe();
          reject(error);
        });
      });
    } else {
      await session.importContext(group.content, `web-chat-${group.role}`);
    }
  }

  const userMessage = messages[lastUserIndex]!.content;
  const isStream = parsed.stream === true;

  if (isStream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
  }

  try {
    const text = await new Promise<string>((resolve, reject) => {
      const parts: string[] = [];
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(parts.join(''));
      }, 120_000);

      const unsubscribe = session.onEvent((event) => {
        if (event.type === 'assistant.delta') {
          const payload = event as { delta: string; type: string };
          parts.push(payload.delta);
          if (isStream) {
            const chunk = JSON.stringify({
              id: 'chatcmpl-default',
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: 'nighthawk',
              choices: [
                {
                  index: 0,
                  delta: { content: payload.delta },
                  finish_reason: null,
                },
              ],
            });
            res.write(`data: ${chunk}\n\n`);
          }
        }
        if (event.type === 'turn.ended') {
          clearTimeout(timeout);
          unsubscribe();
          resolve(parts.join(''));
        }
      });

      session.prompt(userMessage).catch((error: Error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      });
    });

    // Fetch real usage data
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    try {
      const sessionUsage = await session.getUsage();
      if (sessionUsage.currentTurn !== undefined) {
        usage = formatUsage(sessionUsage.currentTurn);
      } else if (sessionUsage.total !== undefined) {
        usage = formatUsage(sessionUsage.total);
      }
    } catch {
      // Usage unavailable, keep zeroed
    }

    if (isStream) {
      // Send final chunk with usage and finish_reason, then [DONE]
      const finalChunk = JSON.stringify({
        id: 'chatcmpl-default',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'nighthawk',
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
        usage,
      });
      res.write(`data: ${finalChunk}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const response = {
        id: 'chatcmpl-default',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'nighthawk',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: text },
            finish_reason: 'stop',
          },
        ],
        usage,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isStream) {
      const errChunk = JSON.stringify({
        id: 'chatcmpl-default',
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'nighthawk',
        choices: [{ index: 0, delta: {}, finish_reason: 'error' }],
      });
      res.write(`data: ${errChunk}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
  }
}

/**
 * Handle /v1/models endpoint.
 */
function handleModels(res: ServerResponse): void {
  const models = [
    {
      id: 'nighthawk',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'nighthawk',
    },
  ];
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ object: 'list', data: models }));
}

export async function handleWeb(deps: WebDeps, opts: WebOptions): Promise<void> {
  let sessionPromise: Promise<Session> | undefined;

  const useAuth = opts.auth !== false;
  if (!useAuth && !isLoopbackHost(opts.host)) {
    deps.stderr.write(
      `Refusing to start without auth on non-loopback host "${opts.host}". ` +
        `Bind to a loopback address or drop --no-auth.\n`,
    );
    deps.exit(1);
    throw new Error('refused to start without auth on non-loopback host');
  }
  const authToken = useAuth ? randomBytes(24).toString('hex') : undefined;

  async function getSession(): Promise<Session> {
    if (sessionPromise === undefined) {
      sessionPromise = createWebSession().catch((error) => {
        sessionPromise = undefined;
        throw error;
      });
    }
    return sessionPromise;
  }

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '/';

    if (url.startsWith('/v1/')) {
      if (!authorized(req, authToken)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized. Send "Authorization: Bearer <token>".' }));
        return;
      }
    }

    if (url === '/v1/chat/completions' || url === '/v1/chat/completions/') {
      const sess = await getSession().catch(() => undefined);
      if (sess === undefined) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not available. Configure a provider first.' }));
        return;
      }
      await handleChatCompletions(req, res, sess);
      return;
    }

    if (url === '/v1/models' || url === '/v1/models/') {
      handleModels(res);
      return;
    }

    const served = await serveStaticFile(req, res);
    if (!served) {
      res.writeHead(404);
      res.end('Not found');
    }
  }

  const server = createServer((req, res) => {
    void handleRequest(req, res);
  });

  return new Promise<void>((resolvePromise, reject) => {
    server.on('error', (error) => {
      deps.stderr.write(`Failed to start web server: ${error.message}\n`);
      deps.exit(1);
      reject(error);
    });

    server.listen(opts.port, opts.host, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr !== null ? addr.port : opts.port;
      const url = `http://${opts.host}:${port}`;

      deps.stdout.write(`NightHawk Web is running at ${url}\n`);
      if (useAuth && authToken !== undefined) {
        deps.stdout.write(
          `Auth token: ${authToken}\n` +
            'Send it as "Authorization: Bearer <token>" on /v1/chat/completions and /v1/models.\n',
        );
      }
      deps.stdout.write('Press Ctrl-C to stop.\n');

      if (opts.open) {
        try {
          void deps.openUrl(url);
        } catch {
          deps.stderr.write(`Could not open a browser; visit ${url} manually.\n`);
        }
      }
    });

    void deps.waitForShutdown().then(async () => {
      server.close();
      if (sessionPromise !== undefined) {
        try {
          const current = await sessionPromise;
          await current.close();
        } catch {
          // Ignore close errors
        }
      }
      resolvePromise();
    });
  });
}

export function registerWebCommand(parent: Command, overrides?: Partial<WebDeps>): void {
  parent
    .command('web')
    .description('Launch the NightHawk Web UI in your browser.')
    .option('--port <number>', 'Port to bind. Default: 3000.')
    .option('--host <host>', 'Host to bind. Default: 127.0.0.1.')
    .option('--no-open', 'Do not open the browser automatically.')
    .option('--no-auth', 'Disable the bearer-token requirement on /v1/* (loopback hosts only).')
    .action(async (options: { port?: string; host?: string; open?: boolean; auth?: boolean }) => {
      const port = options.port === undefined ? 3000 : Number.parseInt(options.port, 10);
      await handleWeb(createDefaultWebDeps(overrides), {
        port: Number.isNaN(port) ? 3000 : port,
        host: options.host ?? '127.0.0.1',
        open: options.open !== false,
        auth: options.auth !== false,
      });
    });
}

function createDefaultWebDeps(overrides: Partial<WebDeps> = {}): WebDeps {
  return {
    getHomeDir: overrides.getHomeDir ?? (() => resolveNighthawkHome()),
    getVersion: overrides.getVersion ?? getVersion,
    openUrl:
      overrides.openUrl ??
      (async (url: string) => {
        openUrl(url);
      }),
    waitForShutdown: overrides.waitForShutdown ?? waitForSigint,
    stdout: overrides.stdout ?? process.stdout,
    stderr: overrides.stderr ?? process.stderr,
    exit: overrides.exit ?? ((code: number) => process.exit(code)),
  };
}

function waitForSigint(): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    const onSig = (): void => {
      if (resolved) return;
      resolved = true;
      process.off('SIGINT', onSig);
      process.off('SIGTERM', onSig);
      resolve();
    };
    process.on('SIGINT', onSig);
    process.on('SIGTERM', onSig);
    // Also handle stdin close (Ctrl+D)
    if (process.stdin.isTTY) {
      process.stdin.on('end', onSig);
    }
  });
}