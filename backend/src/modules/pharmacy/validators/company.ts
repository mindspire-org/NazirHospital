import { z } from 'zod'

export const companyCreateSchema = z.object({
  name: z.string().min(1),
  distributorId: z.string().optional(),
  distributorName: z.string().optional(),
  status: z.enum(['Active','Inactive']).default('Active'),
})

export const companyUpdateSchema = companyCreateSchema.partial()

export const companyQuerySchema = z.object({
  q: z.string().optional(),
  distributorId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
