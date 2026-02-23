import { Schema, model, models } from 'mongoose'

const StaffEarningSchema = new Schema({
  staffId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  category: { type: String, enum: ['Bonus','Award','LumpSum','RevenueShare'], required: true },
  amount: { type: Number, required: true }, // Final computed amount
  rate: { type: Number }, // Percentage for RevenueShare
  base: { type: Number }, // Base amount for RevenueShare
  notes: { type: String },
}, { timestamps: true })

export type LabStaffEarningDoc = {
  _id: string
  staffId: string
  date: string
  category: 'Bonus'|'Award'|'LumpSum'|'RevenueShare'
  amount: number
  rate?: number
  base?: number
  notes?: string
}

export const LabStaffEarning = models.Lab_StaffEarning || model('Lab_StaffEarning', StaffEarningSchema)
