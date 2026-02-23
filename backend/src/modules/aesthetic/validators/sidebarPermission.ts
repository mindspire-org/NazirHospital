import { z } from 'zod'

export const sidebarPermissionCreateSchema = z.object({
  role: z.string().min(2),
  permissions: z.array(z.object({
    path: z.string(),
    label: z.string(),
    visible: z.boolean().default(true),
    order: z.number().default(0),
  })).optional().default([]),
})

export const sidebarPermissionUpdateSchema = z.object({
  permissions: z.array(z.object({
    path: z.string(),
    label: z.string(),
    visible: z.boolean(),
    order: z.number(),
  }))
})

export const sidebarPermissionQuerySchema = z.object({
  role: z.string().min(2).optional(),
})
