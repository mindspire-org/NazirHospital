import { z } from 'zod'

export const listStoreMasterSchema = z.object({
  q: z.string().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export const createStoreCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
})
export const updateStoreCategorySchema = createStoreCategorySchema.partial()

export const createStoreUnitSchema = z.object({
  name: z.string().min(1),
  abbr: z.string().optional(),
  active: z.boolean().optional(),
})
export const updateStoreUnitSchema = createStoreUnitSchema.partial()

export const createStoreLocationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
})
export const updateStoreLocationSchema = createStoreLocationSchema.partial()

export const createStoreItemSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  reorderLevel: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
  active: z.boolean().optional(),
})
export const updateStoreItemSchema = createStoreItemSchema.partial()

export const listStoreItemsSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export const storeTxnLineSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number(),
  unitCost: z.number().min(0).optional(),
  lotNo: z.string().min(1),
  expiryDate: z.string().min(1),
})

export const receiveStoreSchema = z.object({
  date: z.string().min(1),
  locationId: z.string().min(1),
  vendorId: z.string().optional(),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(storeTxnLineSchema.extend({ qty: z.number().gt(0), unitCost: z.number().min(0) })).min(1),
})

export const issueStoreSchema = z.object({
  date: z.string().min(1),
  locationId: z.string().min(1),
  departmentId: z.string().min(1),
  encounterId: z.string().optional(),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(storeTxnLineSchema.pick({ itemId: true, qty: true }).extend({ qty: z.number().gt(0) })).min(1),
})

export const transferStoreSchema = z.object({
  date: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(storeTxnLineSchema.pick({ itemId: true, qty: true }).extend({ qty: z.number().gt(0) })).min(1),
})

export const adjustStoreSchema = z.object({
  date: z.string().min(1),
  locationId: z.string().min(1),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(storeTxnLineSchema.extend({ qty: z.number() })).min(1),
})

export const listStoreLotsSchema = z.object({
  itemId: z.string().optional(),
  locationId: z.string().optional(),
  expFrom: z.string().optional(),
  expTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional(),
})

export const listStoreTxnsSchema = z.object({
  type: z.enum(['RECEIVE','ISSUE','TRANSFER','ADJUSTMENT']).optional(),
  itemId: z.string().optional(),
  locationId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional(),
})

export const storeLedgerSchema = z.object({
  itemId: z.string().optional(),
  locationId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional(),
})

export const storeWorthSchema = z.object({
  locationId: z.string().optional(),
  asOf: z.string().optional(),
})

export const storeLowStockSchema = z.object({
  q: z.string().optional(),
  onlyLow: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional(),
})

export const storeExpiringSchema = z.object({
  locationId: z.string().optional(),
  to: z.string().min(1),
  from: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional(),
})
