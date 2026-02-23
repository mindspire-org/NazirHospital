import { z } from 'zod'

export const doctorCreateSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().optional(),
  qualification: z.string().optional(),
  phone: z.string().optional(),
  fee: z.number().nonnegative().optional(),
  shares: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
})

export const doctorUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  specialty: z.string().optional(),
  qualification: z.string().optional(),
  phone: z.string().optional(),
  fee: z.number().nonnegative().optional(),
  shares: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
})

export const doctorQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
