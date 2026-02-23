import { z } from 'zod'

const resultRowSchema = z.object({
  test: z.string().min(1),
  normal: z.string().optional(),
  unit: z.string().optional(),
  prevValue: z.string().optional(),
  flag: z.enum(['normal','abnormal','critical']).optional(),
  value: z.string().optional(),
  comment: z.string().optional(),
})

export const resultCreateSchema = z.object({
  orderId: z.string().min(1),
  rows: z.array(resultRowSchema).default([]),
  interpretation: z.string().optional(),
})

export const resultUpdateSchema = z.object({
  rows: z.array(resultRowSchema).optional(),
  interpretation: z.string().optional(),
  reportStatus: z.enum(['pending','approved']).optional(),
  approvedAt: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
})

export const resultQuerySchema = z.object({
  orderId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
