import {
  ErrorCodes,
  IAgentCronService,
  isError2,
  resumeSessionById,
  type CronTask,
  type Scope,
} from '@nighthawk/agent-core-v2';
import { z } from 'zod';

import { errEnvelope, okEnvelope } from '../envelope';
import { defineRoute } from '../middleware/defineRoute';
import { ErrorCode } from '../protocol/error-codes';
import {
  createCronTaskRequestSchema,
  createCronTaskResponseSchema,
  deleteCronTaskResponseSchema,
  listCronTasksResponseSchema,
  type CronTaskWire,
} from '../protocol/rest-cron';
import { ensureMainAgent } from '../transport/mainAgent';

const sessionIdParamSchema = z.object({
  session_id: z.string().min(1),
});

const cronTaskParamSchema = z.object({
  session_id: z.string().min(1),
  task_id: z.string().min(1),
});

interface CronRouteHost {
  get(
    path: string,
    options: { preHandler: unknown[]; schema?: Record<string, unknown> },
    handler: (
      req: { id: string; params: unknown },
      reply: { send(payload: unknown): unknown },
    ) => Promise<void> | void,
  ): unknown;
  post(
    path: string,
    options: { preHandler: unknown[]; schema?: Record<string, unknown> },
    handler: (
      req: { id: string; body: unknown; params: unknown },
      reply: { send(payload: unknown): unknown },
    ) => Promise<void> | void,
  ): unknown;
  delete(
    path: string,
    options: { preHandler: unknown[]; schema?: Record<string, unknown> },
    handler: (
      req: { id: string; params: unknown },
      reply: { send(payload: unknown): unknown },
    ) => Promise<void> | void,
  ): unknown;
}

function toCronTaskWire(cron: IAgentCronService, task: CronTask): CronTaskWire {
  return {
    id: task.id,
    cron: task.cron,
    prompt: task.prompt,
    created_at: task.createdAt,
    recurring: task.recurring ?? true,
    next_fire_at: cron.getNextFireForTask(task.id),
    stale: cron.isStale(task),
  };
}

async function resolveCronService(
  core: Scope,
  sessionId: string,
  req: { id: string },
  reply: { send(payload: unknown): unknown },
): Promise<IAgentCronService | undefined> {
  const session = await resumeSessionById(core.accessor, sessionId);
  if (session === undefined) {
    reply.send(
      errEnvelope(
        ErrorCode.SESSION_NOT_FOUND,
        `session ${sessionId} does not exist`,
        req.id,
      ),
    );
    return undefined;
  }
  const agent = await ensureMainAgent(session);
  return agent.accessor.get(IAgentCronService);
}

export function registerCronRoutes(app: CronRouteHost, core: Scope): void {
  const listCronTasksRoute = defineRoute(
    {
      method: 'GET',
      path: '/sessions/{session_id}/cron',
      params: sessionIdParamSchema,
      success: { data: listCronTasksResponseSchema },
      errors: {
        [ErrorCode.SESSION_NOT_FOUND]: {},
      },
      description: 'List the cron tasks scheduled for a session',
      tags: ['cron'],
      operationId: 'listCronTasks',
    },
    async (req, reply) => {
      const { session_id } = req.params;
      const cron = await resolveCronService(core, session_id, req, reply);
      if (cron === undefined) return;
      const items = cron.list().map((task) => toCronTaskWire(cron, task));
      reply.send(okEnvelope({ items }, req.id));
    },
  );
  app.get(
    listCronTasksRoute.path,
    listCronTasksRoute.options,
    listCronTasksRoute.handler as Parameters<CronRouteHost['get']>[2],
  );

  const createCronTaskRoute = defineRoute(
    {
      method: 'POST',
      path: '/sessions/{session_id}/cron',
      params: sessionIdParamSchema,
      body: createCronTaskRequestSchema,
      success: { data: createCronTaskResponseSchema },
      errors: {
        [ErrorCode.VALIDATION_FAILED]: {},
        [ErrorCode.SESSION_NOT_FOUND]: {},
      },
      description: 'Schedule a cron task for a session',
      tags: ['cron'],
      operationId: 'createCronTask',
    },
    async (req, reply) => {
      const { session_id } = req.params;
      const cron = await resolveCronService(core, session_id, req, reply);
      if (cron === undefined) return;
      let task: CronTask;
      try {
        task = cron.addTask({
          cron: req.body.cron,
          prompt: req.body.prompt,
          recurring: req.body.recurring,
        });
      } catch (error) {
        if (
          isError2(error) &&
          (error.code === ErrorCodes.CRON_EXPRESSION_INVALID ||
            error.code === ErrorCodes.VALIDATION_FAILED)
        ) {
          reply.send(errEnvelope(ErrorCode.VALIDATION_FAILED, error.message, req.id));
          return;
        }
        throw error;
      }
      reply.send(okEnvelope({ task: toCronTaskWire(cron, task) }, req.id));
    },
  );
  app.post(
    createCronTaskRoute.path,
    createCronTaskRoute.options,
    createCronTaskRoute.handler as Parameters<CronRouteHost['post']>[2],
  );

  const deleteCronTaskRoute = defineRoute(
    {
      method: 'DELETE',
      path: '/sessions/{session_id}/cron/{task_id}',
      params: cronTaskParamSchema,
      success: { data: deleteCronTaskResponseSchema },
      errors: {
        [ErrorCode.SESSION_NOT_FOUND]: {},
      },
      description: 'Delete a cron task scheduled for a session',
      tags: ['cron'],
      operationId: 'deleteCronTask',
    },
    async (req, reply) => {
      const { session_id, task_id } = req.params;
      const cron = await resolveCronService(core, session_id, req, reply);
      if (cron === undefined) return;
      const removed = [...cron.removeTasks([task_id])];
      reply.send(okEnvelope({ removed }, req.id));
    },
  );
  app.delete(
    deleteCronTaskRoute.path,
    deleteCronTaskRoute.options,
    deleteCronTaskRoute.handler as Parameters<CronRouteHost['delete']>[2],
  );
}
