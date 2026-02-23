import { z } from 'zod'

export const bbReceiverCreateSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['URGENT','PENDING','DISPENSED','APPROVED']).optional(),
  units: z.number().min(1),
  type: z.string().optional(),
  when: z.string().optional(),
  urgency: z.enum(['Normal','Urgent','Critical','']).optional(),
  reason: z.string().optional(),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  mrNumber: z.string().optional(),
  pid: z.string().optional(),
  ward: z.string().optional(),
  gender: z.enum(['Male','Female','Other','']).optional(),
  age: z.number().optional(),
})

export const bbReceiverUpdateSchema = bbReceiverCreateSchema.partial()

export const bbReceiverQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['URGENT','PENDING','DISPENSED','APPROVED']).optional(),
  type: z.string().optional(),
  page: z.preprocess(v=> Number(v), z.number().int().min(1).optional()),
  limit: z.preprocess(v=> Number(v), z.number().int().min(1).max(100).optional()),
})
