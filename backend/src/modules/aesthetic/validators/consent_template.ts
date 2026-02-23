import { z } from 'zod'

export const consentTemplateCreateSchema = z.object({
  name: z.string().min(1),
  body: z.string().min(1),
  version: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  fields: z.array(z.any()).optional(),
})

export const consentTemplateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  version: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  fields: z.array(z.any()).optional(),
})

export const consentTemplateQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(500).optional().default(20),
})
