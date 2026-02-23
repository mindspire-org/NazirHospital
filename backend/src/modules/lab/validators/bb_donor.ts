import { z } from 'zod'

export const bbDonorCreateSchema = z.object({
  name: z.string().min(1),
  gender: z.enum(['Male','Female','Other','']).optional(),
  type: z.string().optional(),
  age: z.number().optional(),
  cnic: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  lastDonationDate: z.string().optional(),
  donated3Months: z.enum(['Yes','No','']).optional(),
  tattoo6Months: z.enum(['Yes','No','']).optional(),
  antibiotics: z.enum(['Yes','No','']).optional(),
  traveled6Months: z.enum(['Yes','No','']).optional(),
  consent: z.boolean().optional(),
})

export const bbDonorUpdateSchema = bbDonorCreateSchema.partial()

export const bbDonorQuerySchema = z.object({
  q: z.string().optional(),
  page: z.preprocess(v=> Number(v), z.number().int().min(1).optional()),
  limit: z.preprocess(v=> Number(v), z.number().int().min(1).max(100).optional()),
})
