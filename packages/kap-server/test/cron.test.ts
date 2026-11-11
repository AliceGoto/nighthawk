import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  getLiveSessionById,
  IAgentCronService,
  IAgentLifecycleService,
} from '@nighthawk/agent-core-v2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listCronTasksResponseSchema } from '../src/protocol/rest-cron';
import { type RunningServer, startServer } from '../src/start';
import { authHeaders } from './helpers/auth';
import { TEST_HOST_IDENTITY } from './helpers/hostIdentity';

interface Envelope<T> {
  code: number;
  msg: string;
  data: T;
  request_id: string;
}

describe('server-v2 /api/v1 sessions cron', () => {
  let server: RunningServer | undefined;
  let home: string | undefined;
  let base: string;

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), 'nighthawk-server-v2-cron-'));
    server = await startServer({
      hostIdentity: TEST_HOST_IDENTITY,
      host: '127.0.0.1',
      port: 0,
      homeDir: home,
      logLevel: 'silent',
    });
    base = `http://127.0.0.1:${server.port}`;
  });

  afterAll(async () => {
    if (server !== undefined) {
      await server.close();
      server = undefined;
    }
    if (home !== undefined) {
      await rm(home, { recursive: true, force: true, maxRetries: 3, retryDelay: 25 } as never);
      home = undefined;
    }
  });

  async function getJson<T>(path: string): Promise<{ status: number; body: Envelope<T> }> {
    const res = await fetch(`${base}${path}`, {
      headers: authHeaders(server as RunningServer),
    } as never);
    return { status: res.status, body: (await res.json()) as Envelope<T> };
  }

  async function postJson<T>(
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: Envelope<T> }> {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: authHeaders(server as RunningServer, { 'content-type': 'application/json' }),
      body: JSON.stringify(body ?? {}),
    } as never);
    return { status: res.status, body: (await res.json()) as Envelope<T> };
  }

  async function createSession(): Promise<string> {
    const { body } = await postJson<{ id: string }>('/api/v1/sessions', {
      metadata: { cwd: home as string },
    });
    expect(body.code).toBe(0);
    return body.data.id;
  }

  async function mainAgent(sessionId: string) {
    const session = getLiveSessionById(server!.core.accessor, sessionId);
    if (session === undefined) throw new Error(`session ${sessionId} not found`);
    const agents = session.accessor.get(IAgentLifecycleService);
    if (agents.handleOf('main') === undefined) await agents.create({ agentId: 'main' });
    return agents.handleOf('main')!;
  }

  describe('GET /api/v1/sessions/{sid}/cron', () => {
    it('lists the main agent cron tasks projected to the wire shape', async () => {
      const id = await createSession();
      const agent = await mainAgent(id);
      const cron = agent.accessor.get(IAgentCronService);
      const task = cron.addTask({ cron: '0 9 * * *', prompt: 'Say good morning' });

      const { body } = await getJson<{ items: unknown[] }>(`/api/v1/sessions/${id}/cron`);
      expect(body.code).toBe(0);
      const parsed = listCronTasksResponseSchema.parse(body.data);
      expect(parsed.items).toEqual([
        {
          id: task.id,
          cron: '0 9 * * *',
          prompt: 'Say good morning',
          created_at: task.createdAt,
          recurring: true,
          next_fire_at: cron.getNextFireForTask(task.id),
          stale: false,
        },
      ]);
    });

    it('returns 40401 for an unknown session', async () => {
      const { body } = await getJson<null>('/api/v1/sessions/nope/cron');
      expect(body.code).toBe(40401);
      expect(body.msg).toMatch(/does not exist/);
    });
  });
});
