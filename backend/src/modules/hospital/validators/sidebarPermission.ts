import { z } from 'zod'

export const sidebarPermissionCreateSchema = z.object({
  role: z.string().min(1),
  permissions: z.array(z.object({
    path: z.string().min(1),
    label: z.string().min(1),
    visible: z.boolean().optional(),
    order: z.coerce.number().int().positive(),
  })).optional(),
})

export const sidebarPermissionUpdateSchema = z.object({
  permissions: z.array(z.object({
    path: z.string().min(1),
    label: z.string().min(1),
    visible: z.boolean(),
    order: z.coerce.number().int().positive(),
  }))
})

export const sidebarPermissionQuerySchema = z.object({
  role: z.string().optional(),
})
