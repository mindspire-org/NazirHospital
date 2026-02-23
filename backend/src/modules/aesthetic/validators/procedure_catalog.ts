import { z } from 'zod'

export const procedureCatalogCreateSchema = z.object({
  name: z.string().min(1),
  basePrice: z.number().nonnegative().optional(),
  defaultDoctorId: z.string().optional(),
  defaultConsentTemplateId: z.string().optional(),
  package: z.object({ sessionsCount: z.number().int().positive().optional(), intervalDays: z.number().int().nonnegative().optional() }).optional(),
  active: z.boolean().optional(),
})

export const procedureCatalogUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  basePrice: z.number().nonnegative().optional(),
  defaultDoctorId: z.string().optional(),
  defaultConsentTemplateId: z.string().optional(),
  package: z.object({ sessionsCount: z.number().int().positive().optional(), intervalDays: z.number().int().nonnegative().optional() }).optional(),
  active: z.boolean().optional(),
})

export const procedureCatalogQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional().default(50),
})
