import { z } from 'zod'

export const purchaseLineSchema = z.object({
  medicineId: z.string().min(1),
  name: z.string().min(1),
  unitsPerPack: z.coerce.number().int().positive().default(1),
  packs: z.coerce.number().int().nonnegative().default(0),
  totalItems: z.coerce.number().int().nonnegative().default(0),
  buyPerPack: z.coerce.number().nonnegative().default(0),
  buyPerUnit: z.coerce.number().nonnegative().default(0),
  salePerPack: z.coerce.number().nonnegative().default(0),
  salePerUnit: z.coerce.number().nonnegative().default(0),
  expiry: z.string().optional(),
})

export const purchaseCreateSchema = z.object({
  date: z.string().min(1),
  invoice: z.string().min(1),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  lines: z.array(purchaseLineSchema).min(1),
})

export const purchaseQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
