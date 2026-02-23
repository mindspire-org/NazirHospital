import { z } from 'zod'

export const customerCreateSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  cnic: z.string().optional(),
  mrNumber: z.string().optional(),
})

export const customerUpdateSchema = customerCreateSchema.partial()

export type CustomerCreate = z.infer<typeof customerCreateSchema>
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>
