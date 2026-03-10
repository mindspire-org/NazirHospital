import { z } from 'zod'

export const diagnosticSettingsUpdateSchema = z.object({
  diagnosticName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  reportFooter: z.string().optional(),
  logoDataUrl: z.string().optional(),
  department: z.string().optional(),
  consultantName: z.string().optional(),
  consultantDegrees: z.string().optional(),
  consultantTitle: z.string().optional(),
  consultants: z.array(z.object({
    name: z.string().optional(),
    degrees: z.string().optional(),
    title: z.string().optional(),
  })).max(3).optional(),
  templateMappings: z.array(z.object({
    testId: z.string(),
    testName: z.string().optional(),
    templateKey: z.string(),
  })).optional(),
})

export type DiagnosticSettingsUpdate = z.infer<typeof diagnosticSettingsUpdateSchema>
