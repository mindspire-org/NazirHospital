import { z } from 'zod'

export const fbrSettingsUpdateSchema = z.object({
  hospitalId: z.string().optional(),
  branchCode: z.string().optional(),
  isEnabled: z.boolean().optional(),
  environment: z.enum(['sandbox','production']).optional(),
  ntn: z.string().optional(),
  strn: z.string().optional(),
  posId: z.string().optional(),
  sandboxPosId: z.string().optional(),
  sandboxCode: z.string().optional(),
  productionPosId: z.string().optional(),
  productionCode: z.string().optional(),
  apiToken: z.string().optional(),
  businessName: z.string().optional(),
  invoicePrefix: z.string().optional(),
  applyModules: z.array(z.enum(['OPD','PHARMACY','LAB','IPD','DIAGNOSTIC','AESTHETIC','SESSION_BILL'])).optional(),
})
