import { z } from 'zod'

export const userCreateSchema = z.object({
  username: z.string().min(3),
  role: z.enum(['admin','pharmacist','salesman']).default('salesman'),
  password: z.string().min(4),
})

export const userUpdateSchema = z.object({
  username: z.string().min(3).optional(),
  role: z.enum(['admin','pharmacist','salesman']).optional(),
  password: z.string().min(4).optional(),
})
