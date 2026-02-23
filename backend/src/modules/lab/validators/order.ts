import { z } from 'zod'

const consumableSchema = z.object({ item: z.string().min(1), qty: z.coerce.number().int().positive() })

const patientSnapshotSchema = z.object({
  mrn: z.string().optional(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  guardianRelation: z.string().optional(),
  guardianName: z.string().optional(),
  cnic: z.string().optional(),
})

export const orderCreateSchema = z.object({
  patientId: z.string().min(1),
  patient: patientSnapshotSchema,
  tests: z.array(z.string().min(1)).min(1),
  consumables: z.array(consumableSchema).optional().default([]),
  subtotal: z.coerce.number().nonnegative().optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
  net: z.coerce.number().nonnegative().optional().default(0),
  referringConsultant: z.string().optional(),
  tokenNo: z.string().optional(),
  // Corporate billing
  corporateId: z.string().optional(),
  corporatePreAuthNo: z.string().optional(),
  corporateCoPayPercent: z.coerce.number().min(0).max(100).optional(),
  corporateCoverageCap: z.coerce.number().min(0).optional(),
})

export const orderQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['received','completed']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const orderTrackUpdateSchema = z.object({
  sampleTime: z.string().optional(),
  reportingTime: z.string().optional(),
  status: z.enum(['received','completed','returned']).optional(),
  referringConsultant: z.string().optional(),
})
