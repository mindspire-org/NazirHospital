import { Schema, model, models } from 'mongoose'

const ExpenseSchema = new Schema({
  dateIso: { type: String, required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  category: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  note: { type: String },
  method: { type: String },
  ref: { type: String },
  createdBy: { type: String },
}, { timestamps: true })

export type HospitalExpenseDoc = {
  _id: string
  dateIso: string
  departmentId?: string
  category: string
  amount: number
  note?: string
  method?: string
  ref?: string
  createdBy?: string
}

export const HospitalExpense = models.Hospital_Expense || model('Hospital_Expense', ExpenseSchema)
