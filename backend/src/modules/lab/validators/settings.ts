import { z } from 'zod'

export const settingsUpdateSchema = z.object({
  labName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  reportFooter: z.string().optional(),
  logoDataUrl: z.string().optional(),
  department: z.string().optional(),
  reportTemplate: z.enum(['classic','tealGradient','modern']).optional(),
  slipTemplate: z.enum(['thermal','a4Bill']).optional(),
  consultantName: z.string().optional(),
  consultantDegrees: z.string().optional(),
  consultantTitle: z.string().optional(),
  consultants: z.array(z.object({
    name: z.string().optional(),
    degrees: z.string().optional(),
    title: z.string().optional(),
  })).max(3).optional(),
})

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>
