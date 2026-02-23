import { z } from 'zod'

export const bbBagCreateSchema = z.object({
  bagId: z.string().optional(),
  donorName: z.string().optional(),
  bloodType: z.string().min(1),
  volume: z.number().min(0).optional(),
  collectionDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(['Available','Quarantined','Used','Expired']).optional(),
  notes: z.string().optional(),
})

export const bbBagUpdateSchema = bbBagCreateSchema.partial()

export const bbBagQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['Available','Quarantined','Used','Expired']).optional(),
  type: z.string().optional(),
  page: z.preprocess(v=> Number(v), z.number().int().min(1).optional()),
  limit: z.preprocess(v=> Number(v), z.number().int().min(1).max(100).optional()),
})
