import { z } from 'zod'

export const createErChargeSchema = z.object({
  type: z.enum(['service','procedure','other']).default('service'),
  description: z.string().min(1),
  qty: z.coerce.number().default(1),
  unitPrice: z.coerce.number().default(0),
  amount: z.coerce.number().optional(),
  date: z.coerce.date().optional(),
  refId: z.string().optional(),
  billedBy: z.string().optional(),
})

export const updateErChargeSchema = z.object({
  type: z.enum(['service','procedure','other']).optional(),
  description: z.string().optional(),
  qty: z.coerce.number().optional(),
  unitPrice: z.coerce.number().optional(),
  amount: z.coerce.number().optional(),
  date: z.coerce.date().optional(),
  refId: z.string().optional(),
  billedBy: z.string().optional(),
})
