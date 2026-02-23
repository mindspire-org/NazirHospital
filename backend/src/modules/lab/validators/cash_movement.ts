import { z } from 'zod'

export const cashMovementCreateSchema = z.object({
  date: z.string().min(1),
  type: z.enum(['IN','OUT']),
  category: z.string().optional().default('-'),
  amount: z.coerce.number().positive(),
  receiver: z.string().optional().default(''),
  handoverBy: z.string().optional().default(''),
  note: z.string().optional().default(''),
})

export const cashMovementQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(['IN','OUT']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export type CashMovementCreate = z.infer<typeof cashMovementCreateSchema>
