import { z } from 'zod'

export const createAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  scheduleId: z.string().min(1),
  apptStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slotNo: z.coerce.number().int().min(1).optional(),
  patientId: z.string().optional(),
  mrn: z.string().optional(),
  patientName: z.string().optional(),
  phone: z.string().regex(/^\d{0,11}$/).optional(),
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
  phone: z.string().regex(/^\d{0,11}$/).optional(),
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
