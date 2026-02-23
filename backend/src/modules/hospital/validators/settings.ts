import { z } from 'zod'

export const settingsUpdateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logoDataUrl: z.string().optional(),
  code: z.string().optional(),
  slipFooter: z.string().optional(),
})
