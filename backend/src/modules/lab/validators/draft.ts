import { z } from 'zod'

export const draftLineSchema = z.object({
  itemId: z.string().optional(),
  name: z.string().min(1),
  genericName: z.string().optional(),
  unitsPerPack: z.coerce.number().int().positive().default(1),
  packs: z.coerce.number().int().nonnegative().default(0),
  totalItems: z.coerce.number().int().nonnegative().default(0),
  buyPerPack: z.coerce.number().nonnegative().default(0),
  buyPerUnit: z.coerce.number().nonnegative().default(0),
  salePerPack: z.coerce.number().nonnegative().default(0),
  salePerUnit: z.coerce.number().nonnegative().default(0),
  expiry: z.string().optional(),
  category: z.string().optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  lineTaxType: z.enum(['percent','fixed']).optional(),
  lineTaxValue: z.coerce.number().nonnegative().optional(),
})

export const labDraftCreateSchema = z.object({
  date: z.string().min(1),
  invoice: z.string().min(1),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  invoiceTaxes: z.array(z.object({
    name: z.string().min(1),
    value: z.coerce.number(),
    type: z.enum(['percent','fixed']),
    applyOn: z.enum(['gross','net'])
  })).optional().default([]),
  lines: z.array(draftLineSchema).min(1),
  discount: z.coerce.number().nonnegative().optional().default(0),
})

export const labDraftQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
