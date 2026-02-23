import { z } from 'zod'

export const createFloorSchema = z.object({
  name: z.string().min(1),
  number: z.string().optional(),
})

export const updateFloorSchema = z.object({
  name: z.string().min(1).optional(),
  number: z.string().optional(),
})

export const createRoomSchema = z.object({
  name: z.string().min(1),
  floorId: z.string().min(1),
})

export const updateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  floorId: z.string().min(1).optional(),
})

export const createWardSchema = z.object({
  name: z.string().min(1),
  floorId: z.string().min(1),
})

export const updateWardSchema = z.object({
  name: z.string().min(1).optional(),
  floorId: z.string().min(1).optional(),
})

export const createBedsSchema = z.object({
  floorId: z.string().min(1),
  locationType: z.enum(['room','ward']),
  locationId: z.string().min(1),
  labels: z.array(z.string().min(1)).min(1),
  charges: z.number().min(0).optional(),
  category: z.string().optional(),
})

export const updateBedSchema = z.object({
  label: z.string().min(1).optional(),
  charges: z.number().min(0).optional(),
  category: z.string().optional(),
})

export const updateBedStatusSchema = z.object({
  status: z.enum(['available','occupied']),
  encounterId: z.string().optional(),
})
