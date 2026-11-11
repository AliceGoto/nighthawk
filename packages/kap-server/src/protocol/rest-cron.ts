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
