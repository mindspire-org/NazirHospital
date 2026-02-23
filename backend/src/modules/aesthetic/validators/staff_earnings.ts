import { z } from 'zod'

export const earningCategoryEnum = z.enum(['Bonus','Award','LumpSum','RevenueShare'])

export const staffEarningBaseSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  category: earningCategoryEnum,
  amount: z.coerce.number().nonnegative().optional(),
  rate: z.coerce.number().nonnegative().max(100).optional(),
  base: z.coerce.number().nonnegative().optional(),
  notes: z.string().optional(),
})

export const staffEarningCreateSchema = staffEarningBaseSchema
export const staffEarningUpdateSchema = staffEarningBaseSchema.partial()

export const staffEarningQuerySchema = z.object({
  staffId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
})

export type StaffEarningCreate = z.infer<typeof staffEarningCreateSchema>
export type StaffEarningUpdate = z.infer<typeof staffEarningUpdateSchema>
