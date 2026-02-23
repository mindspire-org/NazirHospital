import { z } from 'zod'

export const dispenseLineSchema = z.object({
  medicineId: z.string().min(1),
  name: z.string().min(1),
  unitPrice: z.coerce.number().nonnegative(),
  qty: z.coerce.number().int().positive(),
  discountRs: z.coerce.number().nonnegative().default(0).optional(),
})

export const dispenseCreateSchema = z.object({
  customer: z.string().optional(),
  customerId: z.string().optional(),
  payment: z.enum(['Cash','Card','Credit']).default('Cash'),
  discountPct: z.coerce.number().nonnegative().default(0),
  lineDiscountTotal: z.coerce.number().nonnegative().default(0).optional(),
  lines: z.array(dispenseLineSchema).min(1),
  createdBy: z.string().optional(),
})

export const salesQuerySchema = z.object({
  bill: z.string().optional(),
  customer: z.string().optional(),
  customerId: z.string().optional(),
  payment: z.enum(['Any','Cash','Card','Credit']).default('Any').optional(),
  medicine: z.string().optional(),
  user: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
