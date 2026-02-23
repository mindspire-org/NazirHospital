import { z } from 'zod'

export const holdSaleLineSchema = z.object({
  medicineId: z.string().min(1),
  name: z.string().min(1),
  unitPrice: z.coerce.number().nonnegative(),
  qty: z.coerce.number().int().positive(),
  discountRs: z.coerce.number().nonnegative().default(0).optional(),
})

export const holdSaleCreateSchema = z.object({
  billDiscountPct: z.coerce.number().nonnegative().default(0).optional(),
  lines: z.array(holdSaleLineSchema).min(1),
})
