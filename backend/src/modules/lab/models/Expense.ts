import { Schema, model, models } from 'mongoose'

const ExpenseSchema = new Schema({
  date: { type: String, required: true },
  datetime: { type: String, index: true },
  type: { type: String, enum: ['Rent','Utilities','Supplies','Salaries','Maintenance','Other'], required: true },
  note: { type: String, default: '' },
  amount: { type: Number, required: true },
  createdBy: { type: String },
}, { timestamps: true })

export type LabExpenseDoc = {
  _id: string
  date: string
  datetime?: string
  type: 'Rent'|'Utilities'|'Supplies'|'Salaries'|'Maintenance'|'Other'
  note?: string
  amount: number
  createdBy?: string
}

export const LabExpense = models.Lab_Expense || model('Lab_Expense', ExpenseSchema)
