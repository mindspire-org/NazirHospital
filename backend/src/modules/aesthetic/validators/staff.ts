import { z } from 'zod'

export const upsertStaffSchema = z.object({
  name: z.string().min(1),
  position: z.string().optional(),
  phone: z.string().optional(),
  joinDate: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['Active','Inactive']).optional().default('Active'),
  salary: z.coerce.number().nonnegative().optional().default(0),
  shiftId: z.string().optional(),
})
