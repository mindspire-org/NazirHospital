import { z } from 'zod'

export const createErPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  method: z.string().optional(),
  refNo: z.string().optional(),
  receivedBy: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
})

export const updateErPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01).optional(),
  method: z.string().optional(),
  refNo: z.string().optional(),
  receivedBy: z.string().optional(),
  receivedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
})
