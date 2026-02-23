import { z } from 'zod'

export const shiftCreateSchema = z.object({
  name: z.string().min(1),
  start: z.string().min(1), // HH:mm
  end: z.string().min(1),   // HH:mm
  absentCharges: z.coerce.number().nonnegative().optional().default(0),
  lateDeduction: z.coerce.number().nonnegative().optional().default(0),
  earlyOutDeduction: z.coerce.number().nonnegative().optional().default(0),
})

export const shiftUpdateSchema = shiftCreateSchema.partial()

export type ShiftCreate = z.infer<typeof shiftCreateSchema>
export type ShiftUpdate = z.infer<typeof shiftUpdateSchema>
