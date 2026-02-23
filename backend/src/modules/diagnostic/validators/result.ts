import { z } from 'zod'

export const resultQuerySchema = z.object({
  orderId: z.string().optional(),
  testId: z.string().optional(),
  status: z.enum(['draft','final']).optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

const patientSnapshotSchema = z.object({
  mrn: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  cnic: z.string().optional(),
}).optional()

export const resultCreateSchema = z.object({
  orderId: z.string().min(1),
  testId: z.string().min(1),
  testName: z.string().min(1),
  tokenNo: z.string().optional(),
  patient: patientSnapshotSchema,
  formData: z.any().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(['draft','final']).optional(),
  reportedBy: z.string().optional(),
  reportedAt: z.string().optional(),
  templateVersion: z.string().optional(),
  notes: z.string().optional(),
})

export const resultUpdateSchema = z.object({
  formData: z.any().optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(['draft','final']).optional(),
  reportedBy: z.string().optional(),
  reportedAt: z.string().optional(),
  notes: z.string().optional(),
  patient: patientSnapshotSchema,
})
