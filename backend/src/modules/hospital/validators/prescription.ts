import { z } from 'zod'

const itemSchema = z.object({
  name: z.string().min(1),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  notes: z.string().optional(),
})

const manualAttachmentSchema = z.object({
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  dataUrl: z.string().optional(),
}).partial()

const baseSchema = z.object({
  encounterId: z.string().min(1),
  prescriptionMode: z.enum(['electronic','manual']).optional(),
  manualAttachment: manualAttachmentSchema.optional(),
  labTests: z.array(z.string().min(1)).optional(),
  labNotes: z.string().optional(),
  diagnosticTests: z.array(z.string().min(1)).optional(),
  diagnosticNotes: z.string().optional(),
  primaryComplaint: z.string().optional(),
  primaryComplaintHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  treatmentHistory: z.string().optional(),
  allergyHistory: z.string().optional(),
  history: z.string().optional(),
  examFindings: z.string().optional(),
  diagnosis: z.string().optional(),
  advice: z.string().optional(),
  vitals: z.object({
    pulse: z.coerce.number().optional(),
    temperatureC: z.coerce.number().optional(),
    bloodPressureSys: z.coerce.number().optional(),
    bloodPressureDia: z.coerce.number().optional(),
    respiratoryRate: z.coerce.number().optional(),
    bloodSugar: z.coerce.number().optional(),
    weightKg: z.coerce.number().optional(),
    heightCm: z.coerce.number().optional(),
    bmi: z.coerce.number().optional(),
    bsa: z.coerce.number().optional(),
    spo2: z.coerce.number().optional(),
  }).partial().optional(),
  createdBy: z.string().optional(),
})

export const createPrescriptionSchema = z.union([
  baseSchema.extend({
    prescriptionMode: z.literal('manual'),
    manualAttachment: manualAttachmentSchema.extend({ dataUrl: z.string().min(10) }),
    items: z.array(itemSchema).optional(),
  }),
  baseSchema.extend({ prescriptionMode: z.literal('electronic').optional(), items: z.array(itemSchema).min(1) }),
])

export const updatePrescriptionSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    dose: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    notes: z.string().optional(),
  })).min(1).optional(),
  prescriptionMode: z.enum(['electronic','manual']).optional(),
  manualAttachment: manualAttachmentSchema.optional(),
  labTests: z.array(z.string().min(1)).optional(),
  labNotes: z.string().optional(),
  diagnosticTests: z.array(z.string().min(1)).optional(),
  diagnosticNotes: z.string().optional(),
  primaryComplaint: z.string().optional(),
  primaryComplaintHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  treatmentHistory: z.string().optional(),
  allergyHistory: z.string().optional(),
  history: z.string().optional(),
  examFindings: z.string().optional(),
  diagnosis: z.string().optional(),
  advice: z.string().optional(),
  vitals: z.object({
    pulse: z.coerce.number().optional(),
    temperatureC: z.coerce.number().optional(),
    bloodPressureSys: z.coerce.number().optional(),
    bloodPressureDia: z.coerce.number().optional(),
    respiratoryRate: z.coerce.number().optional(),
    bloodSugar: z.coerce.number().optional(),
    weightKg: z.coerce.number().optional(),
    heightCm: z.coerce.number().optional(),
    bmi: z.coerce.number().optional(),
    bsa: z.coerce.number().optional(),
    spo2: z.coerce.number().optional(),
  }).partial().optional(),
})
