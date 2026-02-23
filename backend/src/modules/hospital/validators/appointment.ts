import { z } from 'zod'

export const createAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  departmentId: z.string().optional(),
  // If schedule-based booking
  scheduleId: z.string().min(1),
  // Either provide apptStart HH:mm or slotNo (1-based)
  apptStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slotNo: z.coerce.number().int().min(1).optional(),
  // Patient linkage (optional)
  patientId: z.string().optional(),
  mrn: z.string().optional(),
  patientName: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  notes: z.string().optional(),
})

export const updateAppointmentSchema = z.object({
  doctorId: z.string().optional(),
  scheduleId: z.string().optional(),
  apptStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slotNo: z.coerce.number().int().min(1).optional(),
  patientName: z.string().optional(),
  phone: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  notes: z.string().optional(),
})

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['booked','confirmed','checked-in','cancelled','no-show']),
})

export const listAppointmentsSchema = z.object({
  date: z.string().optional(),
  doctorId: z.string().optional(),
  scheduleId: z.string().optional(),
  status: z.enum(['booked','confirmed','checked-in','cancelled','no-show']).optional(),
})
