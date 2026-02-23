import { z } from 'zod'

export const attendanceUpsertSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().min(1), // yyyy-mm-dd
  shiftId: z.string().optional(),
  status: z.enum(['present','absent','leave']).default('present'),
  clockIn: z.string().optional(), // HH:mm
  clockOut: z.string().optional(),
  notes: z.string().optional(),
})

export const attendanceQuerySchema = z.object({
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  shiftId: z.string().optional(),
  staffId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
