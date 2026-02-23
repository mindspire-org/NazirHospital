import { z } from 'zod'

export const returnLineSchema = z.object({
  medicineId: z.string().min(1).optional(),
  name: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  amount: z.coerce.number().nonnegative().default(0),
})

export const returnCreateSchema = z.object({
  type: z.enum(['Customer','Supplier']),
  datetime: z.string().min(1),
  reference: z.string().min(1),
  party: z.string().min(1),
  lines: z.array(returnLineSchema).min(1),
})

export const returnQuerySchema = z.object({
  type: z.enum(['Customer','Supplier']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  party: z.string().optional(),
  reference: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
