import { z } from 'zod'

export const cashCountCreateSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  receiver: z.string().optional().default(''),
  handoverBy: z.string().optional().default(''),
  note: z.string().optional().default(''),
})

export const cashCountQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export type CashCountCreate = z.infer<typeof cashCountCreateSchema>
