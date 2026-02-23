import { z } from 'zod'

export const createIpdReferralSchema = z.object({
  patientId: z.string().min(1),
  referralDate: z.string().optional(),
  referralTime: z.string().optional(),
  reasonOfReferral: z.string().optional(),
  provisionalDiagnosis: z.string().optional(),
  vitals: z.object({
    bp: z.string().optional(),
    pulse: z.number().optional(),
    temperature: z.number().optional(),
    rr: z.number().optional(),
  }).optional(),
  referredTo: z.object({
    departmentId: z.string().optional(),
    doctorId: z.string().optional(),
  }).optional(),
  condition: z.object({
    stability: z.enum(['Stable','Unstable']).optional(),
    consciousness: z.enum(['Conscious','Unconscious']).optional(),
  }).optional(),
  remarks: z.string().optional(),
  signStamp: z.string().optional(),
  referredByDoctorId: z.string().optional(),
})

export const updateIpdReferralSchema = z.object({
  referralDate: z.string().optional(),
  referralTime: z.string().optional(),
  reasonOfReferral: z.string().optional(),
  provisionalDiagnosis: z.string().optional(),
  vitals: z.object({
    bp: z.string().optional(),
    pulse: z.number().optional(),
    temperature: z.number().optional(),
    rr: z.number().optional(),
  }).optional(),
  referredTo: z.object({
    departmentId: z.string().optional(),
    doctorId: z.string().optional(),
  }).optional(),
  condition: z.object({
    stability: z.enum(['Stable','Unstable']).optional(),
    consciousness: z.enum(['Conscious','Unconscious']).optional(),
  }).optional(),
  remarks: z.string().optional(),
  signStamp: z.string().optional(),
})

export const updateIpdReferralStatusSchema = z.object({
  action: z.enum(['accept','reject','reopen']),
  note: z.string().optional(),
})

export const admitFromReferralSchema = z.object({
  departmentId: z.string().min(1),
  doctorId: z.string().optional(),
  wardId: z.string().optional(),
  bedId: z.string().optional(),
  deposit: z.number().optional(),
  tokenFee: z.number().optional(),
})
