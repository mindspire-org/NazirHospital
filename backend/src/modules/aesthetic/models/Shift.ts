import { Schema, model, models } from 'mongoose'

const ShiftSchema = new Schema({
  name: { type: String, required: true },
  start: { type: String, required: true },
  end: { type: String, required: true },
  absentCharges: { type: Number, default: 0 },
  lateDeduction: { type: Number, default: 0 },
  earlyOutDeduction: { type: Number, default: 0 },
}, { timestamps: true })

export type AestheticShiftDoc = {
  _id: string
  name: string
  start: string
  end: string
  absentCharges?: number
  lateDeduction?: number
  earlyOutDeduction?: number
}

export const AestheticShift = models.Aesthetic_Shift || model('Aesthetic_Shift', ShiftSchema)
