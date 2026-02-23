import { z } from 'zod'

export const consentCreateSchema = z.object({
  templateId: z.string().min(1),
  templateName: z.string().optional(),
  templateVersion: z.number().int().positive().optional(),
  patientMrn: z.string().optional(),
  labPatientId: z.string().optional(),
  patientName: z.string().optional(),
  answers: z.record(z.any()).optional(),
  signatureDataUrl: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  signedAt: z.string().min(1),
  actor: z.string().optional(),
}).refine(data => Boolean(data.patientMrn || data.labPatientId || data.patientName), { message: 'At least one patient identifier is required (patientMrn or labPatientId or patientName)' })

export const consentQuerySchema = z.object({
  search: z.string().optional(),
  templateId: z.string().optional(),
  patientMrn: z.string().optional(),
  labPatientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional().default(20),
})
