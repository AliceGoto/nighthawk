import { IAgentCronService, resumeSessionById, type Scope } from '@nighthawk/agent-core-v2';
import { z } from 'zod';

import { errEnvelope, okEnvelope } from '../envelope';
import { defineRoute } from '../middleware/defineRoute';
import { ErrorCode } from '../protocol/error-codes';
import { listCronTasksResponseSchema } from '../protocol/rest-cron';
import { ensureMainAgent } from '../transport/mainAgent';

const sessionIdParamSchema = z.object({
  session_id: z.string().min(1),
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
      const session = await resumeSessionById(core.accessor, session_id);
      if (session === undefined) {
        reply.send(
          errEnvelope(
            ErrorCode.SESSION_NOT_FOUND,
            `session ${session_id} does not exist`,
            req.id,
          ),
        );
        return;
      }
      const agent = await ensureMainAgent(session);
      const cron = agent.accessor.get(IAgentCronService);
      const items = cron.list().map((task) => ({
        id: task.id,
        cron: task.cron,
        prompt: task.prompt,
        created_at: task.createdAt,
        recurring: task.recurring ?? true,
        next_fire_at: cron.getNextFireForTask(task.id),
        stale: cron.isStale(task),
      }));
      reply.send(okEnvelope({ items }, req.id));
    },
  );
  app.get(
    listCronTasksRoute.path,
    listCronTasksRoute.options,
    listCronTasksRoute.handler as Parameters<CronRouteHost['get']>[2],
  );
}
