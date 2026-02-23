import { z } from 'zod'

export const labReturnLineSchema = z.object({
  itemId: z.string().min(1).optional(),
  name: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  amount: z.coerce.number().nonnegative().default(0),
})

export const labReturnCreateSchema = z.object({
  type: z.enum(['Customer','Supplier']),
  datetime: z.string().min(1),
  reference: z.string().min(1),
  party: z.string().min(1),
  note: z.string().optional(),
  testId: z.string().optional(),
  lines: z.array(labReturnLineSchema).optional().default([]),
})

export const labReturnQuerySchema = z.object({
  type: z.enum(['Customer','Supplier']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  party: z.string().optional(),
  reference: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const labReturnUndoSchema = z.object({
  reference: z.string().min(1), // tokenNo or orderId
  testId: z.string().min(1).optional(),
  testName: z.string().min(1).optional(),
  note: z.string().optional(),
}).refine((v)=> !!(v.testId || v.testName), { message: 'testId or testName is required' })
