import { z } from 'zod'

export const diagnosticTestCreateSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().nonnegative().optional().default(0),
})

export const diagnosticTestUpdateSchema = diagnosticTestCreateSchema.partial()

export const diagnosticTestQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
})
