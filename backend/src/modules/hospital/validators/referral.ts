import { z } from 'zod'

export const createReferralSchema = z.object({
  type: z.enum(['lab','pharmacy','diagnostic']),
  encounterId: z.string().min(1),
  doctorId: z.string().min(1),
  prescriptionId: z.string().optional(),
  tests: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
})

export const updateReferralStatusSchema = z.object({
  status: z.enum(['pending','completed','cancelled'])
})
