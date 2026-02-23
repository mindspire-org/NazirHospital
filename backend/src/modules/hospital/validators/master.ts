import { z } from 'zod'

export const upsertDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  opdBaseFee: z.number().min(0),
  opdFollowupFee: z.number().min(0).optional(),
  followupWindowDays: z.number().int().min(0).optional(),
  doctorPrices: z.array(z.object({
    doctorId: z.string().min(1),
    price: z.number().min(0),
  })).optional(),
})

export const upsertDoctorSchema = z.object({
  name: z.string().min(1),
  departmentIds: z.array(z.string()).default([]),
  primaryDepartmentId: z.string().optional(),
  opdBaseFee: z.number().min(0).optional(),
  opdFollowupFee: z.number().min(0).optional(),
  followupWindowDays: z.number().int().min(0).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  phone: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  cnic: z.string().optional(),
  pmdcNo: z.string().optional(),
  shares: z.number().min(0).optional(),
  active: z.boolean().optional(),
})
