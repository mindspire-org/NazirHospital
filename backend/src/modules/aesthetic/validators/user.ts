import { z } from 'zod'

export const userCreateSchema = z.object({
  username: z.string().min(3),
  role: z.string().min(2).default('admin'),
  password: z.string().min(4),
  permissions: z.array(z.string()).optional(),
})

export const userUpdateSchema = z.object({
  username: z.string().min(3).optional(),
  role: z.string().min(2).optional(),
  password: z.string().min(4).optional(),
  permissions: z.array(z.string()).optional(),
})
