import { z } from 'zod'

export const auditLogQuerySchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  subjectType: z.string().optional(),
  subjectId: z.string().optional(),
  actorUsername: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const auditLogCreateSchema = z.object({
  action: z.string().min(1),
  subjectType: z.string().optional(),
  subjectId: z.string().optional(),
  message: z.string().optional(),
  data: z.any().optional(),
  actorId: z.string().optional(),
  actorUsername: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
})
