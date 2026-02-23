import { z } from 'zod'

export const auditCreateSchema = z.object({
  actor: z.string().default('system'),
  action: z.string().min(1),
  label: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  at: z.string().min(1),
  detail: z.string().optional(),
})

export const auditQuerySchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
