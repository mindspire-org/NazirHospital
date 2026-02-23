import { z } from 'zod'

export const createDoctorScheduleSchema = z.object({
  doctorId: z.string().min(1),
  departmentId: z.string().optional(),
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.coerce.number().min(5).max(240).default(15),
  fee: z.coerce.number().optional(),
  followupFee: z.coerce.number().optional(),
  notes: z.string().optional(),
})

export const updateDoctorScheduleSchema = z.object({
  departmentId: z.string().optional(),
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slotMinutes: z.coerce.number().min(5).max(240).optional(),
  fee: z.coerce.number().optional(),
  followupFee: z.coerce.number().optional(),
  notes: z.string().optional(),
})

export const applyWeeklyPatternSchema = z.object({
  doctorId: z.string().min(1),
  departmentId: z.string().optional(),
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weeks: z.coerce.number().min(1).max(52).default(12),
  days: z.array(z.object({
    day: z.coerce.number().min(0).max(6),
    enabled: z.coerce.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    slotMinutes: z.coerce.number().min(5).max(240).optional(),
    fee: z.coerce.number().optional(),
    followupFee: z.coerce.number().optional(),
    notes: z.string().optional(),
  })).min(1),
})
