import { z } from 'zod'

export const createErServiceSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  active: z.coerce.boolean().optional(),
})

export const updateErServiceSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  active: z.coerce.boolean().optional(),
})
