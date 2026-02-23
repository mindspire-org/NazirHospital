import { z } from 'zod'

export const createIPDAdmissionSchema = z.object({
  patientId: z.string().min(1),
  departmentId: z.string().min(1),
  doctorId: z.string().optional(),
  wardId: z.string().optional(),
  bedId: z.string().optional(),
  deposit: z.number().optional(),
  // Corporate
  corporateId: z.string().optional(),
  corporatePreAuthNo: z.string().optional(),
  corporateCoPayPercent: z.number().optional(),
  corporateCoverageCap: z.number().optional(),
})

export const dischargeIPDSchema = z.object({
  dischargeSummary: z.string().optional(),
  endAt: z.string().optional(),
})

export const transferBedSchema = z.object({
  newBedId: z.string().min(1),
})
