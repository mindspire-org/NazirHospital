import { z } from 'zod'

export const testCreateSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().nonnegative().optional().default(0),
  parameter: z.string().optional(),
  unit: z.string().optional(),
  normalRangeMale: z.string().optional(),
  normalRangeFemale: z.string().optional(),
  normalRangePediatric: z.string().optional(),
  parameters: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().optional(),
    normalRangeMale: z.string().optional(),
    normalRangeFemale: z.string().optional(),
    normalRangePediatric: z.string().optional(),
  })).optional().default([]),
  consumables: z.array(z.object({ item: z.string().min(1), qty: z.coerce.number().int().positive() })).optional().default([]),
})

export const testUpdateSchema = testCreateSchema.partial()

export const testQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
})
