import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getSessionPlanResponseSchema } from '../src/protocol/rest-session';
import { type RunningServer, startServer } from '../src/start';
import { TEST_HOST_IDENTITY } from './helpers/hostIdentity';
import { authHeaders } from './helpers/auth';

interface Envelope<T> {
  code: number;
  msg: string;
  data: T;
  request_id: string;
}

describe('server-v2 /api/v1 sessions plan', () => {
  let server: RunningServer | undefined;
  let home: string | undefined;
  let base: string;

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), 'nighthawk-server-v2-plan-'));
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

  async function setPlanMode(id: string, planMode: boolean): Promise<void> {
    const { body } = await postJson(`/api/v1/sessions/${id}/profile`, {
      agent_config: { plan_mode: planMode },
    });
    expect(body.code).toBe(0);
  }

  async function getPlan(id: string) {
    const { status, body } = await getJson<unknown>(`/api/v1/sessions/${id}/plan`);
    expect(status).toBe(200);
    expect(body.code).toBe(0);
    return getSessionPlanResponseSchema.parse(body.data);
  }

  it('returns inactive and a null plan for a fresh session', async () => {
    const id = await createSession();
    await expect(getPlan(id)).resolves.toEqual({ active: false, plan: null });
  });

  it('reports the active plan after plan_mode is enabled', async () => {
    const id = await createSession();
    await setPlanMode(id, true);

    const plan = await getPlan(id);
    expect(plan.active).toBe(true);
    expect(plan.plan).not.toBeNull();
    expect(plan.plan!.id.length).toBeGreaterThan(0);
    expect(typeof plan.plan!.content).toBe('string');
    expect(plan.plan!.path).toContain('/plans/');
  });

  it('returns to inactive after plan_mode is disabled', async () => {
    const id = await createSession();
    await setPlanMode(id, true);
    await setPlanMode(id, false);

    await expect(getPlan(id)).resolves.toEqual({ active: false, plan: null });
  });

  it('returns 40401 for an unknown session', async () => {
    const { body } = await getJson<null>('/api/v1/sessions/nope/plan');
    expect(body.code).toBe(40401);
    expect(body.msg).toMatch(/does not exist/);
  });
});
