import { z } from 'zod'

export const createOpdTokenSchema = z.object({
  // identify patient either by id or mrn or name
  patientId: z.string().optional(),
  mrn: z.string().optional(),
  patientName: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  guardianRel: z.string().optional(),
  guardianName: z.string().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
  age: z.string().optional(),
  departmentId: z.string().min(1),
  doctorId: z.string().optional(),
  visitType: z.enum(['new','followup']).default('new'),
  discount: z.number().min(0).optional(),
  paymentRef: z.string().optional(),
  corporateId: z.string().optional(),
  corporatePreAuthNo: z.string().optional(),
  corporateCoPayPercent: z.number().min(0).max(100).optional(),
  corporateCoverageCap: z.number().min(0).optional(),
  // Optional override for resolved OPD fee (used when admitting to IPD from token)
  overrideFee: z.number().min(0).optional(),
  // Cash session tagging (optional)
  paidMethod: z.enum(['Cash','Bank','AR']).optional(),
  sessionId: z.string().optional(),
  // Scheduling (optional): either provide scheduleId and desired slot start HH:mm, or leave empty to auto-assign next free slot
  scheduleId: z.string().optional(),
  apptStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:mm
})

export const listTokensSchema = z.object({
  date: z.string().optional(),
  status: z.enum(['queued','in-progress','completed','returned','cancelled']).optional(),
})
