import { parseCronExpression } from '@nighthawk/agent-core-v2/features/cron/internal/cron-expr';
import { z } from 'zod';

export const cronTaskSchema = z.object({
  id: z.string(),
  cron: z.string(),
  prompt: z.string(),
  created_at: z.number(),
  recurring: z.boolean(),
  next_fire_at: z.number().nullable(),
  stale: z.boolean(),
});
export type CronTaskWire = z.infer<typeof cronTaskSchema>;

export const listCronTasksResponseSchema = z.object({
  items: z.array(cronTaskSchema),
});
export type ListCronTasksResponse = z.infer<typeof listCronTasksResponseSchema>;

export const createCronTaskRequestSchema = z.object({
  cron: z.string().min(1).refine((value) => {
    try {
      parseCronExpression(value);
      return true;
    } catch {
      return false;
    }
  }, 'invalid cron expression'),
  prompt: z.string().min(1),
  recurring: z.boolean().optional().default(true),
});
export type CreateCronTaskRequest = z.infer<typeof createCronTaskRequestSchema>;

export const createCronTaskResponseSchema = z.object({
  task: cronTaskSchema,
});
export type CreateCronTaskResponse = z.infer<typeof createCronTaskResponseSchema>;

export const deleteCronTaskResponseSchema = z.object({
  removed: z.array(z.string()),
});
export type DeleteCronTaskResponse = z.infer<typeof deleteCronTaskResponseSchema>;
