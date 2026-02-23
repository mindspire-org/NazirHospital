import { z } from 'zod'

export const expenseCreateSchema = z.object({
  date: z.string().min(1),
  type: z.enum(['Rent','Utilities','Supplies','Salaries','Maintenance','Other']),
  note: z.string().optional().default(''),
  amount: z.number().nonnegative(),
})

export const expenseQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  search: z.string().optional(),
  type: z.enum(['Rent','Utilities','Supplies','Salaries','Maintenance','Other']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export type ExpenseCreate = z.infer<typeof expenseCreateSchema>
