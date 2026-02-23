import { z } from 'zod'

export const createOPDEncounterSchema = z.object({
  patientId: z.string().min(1),
  departmentId: z.string().min(1),
  doctorId: z.string().optional(),
  visitType: z.enum(['new','followup']).default('new'),
  paymentRef: z.string().optional(),
})
