import { z } from 'zod'

export const createExpenseSchema = z.object({
  dateIso: z.string().min(1),
  departmentId: z.string().optional(),
  category: z.string().min(1),
  amount: z.number().min(0),
  note: z.string().optional(),
  method: z.string().optional(),
  ref: z.string().optional(),
})

export const listExpenseSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})
