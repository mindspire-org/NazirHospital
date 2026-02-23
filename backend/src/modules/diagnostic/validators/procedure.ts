import { z } from 'zod'

const pictureSchema = z.object({
  dataUrl: z.string().min(1),
  name: z.string().optional(),
})

const expenseSchema = z.object({
  description: z.string().optional().default(''),
  amount: z.coerce.number().nonnegative().optional().default(0),
  category: z.string().optional().default(''),
})

const pharmacyConsumptionSchema = z.object({
  itemKey: z.string().optional(),
  itemName: z.string().min(1),
  quantity: z.coerce.number().nonnegative().optional().default(0),
  batch: z.string().optional(),
})

export const diagnosticProcedureCreateSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().nonnegative().optional().default(0),
  department: z.string().optional().default(''),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  templateHtml: z.string().optional().default(''),
  picturesEnabled: z.coerce.boolean().optional().default(false),
  pictures: z.array(pictureSchema).optional().default([]),
  expense: expenseSchema.nullable().optional().default(null),
  pharmacyConsumption: z.array(pharmacyConsumptionSchema).optional().default([]),
})

export const diagnosticProcedureUpdateSchema = diagnosticProcedureCreateSchema.partial()

export const diagnosticProcedureQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
})
