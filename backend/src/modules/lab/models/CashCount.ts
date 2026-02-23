import { Schema, model, models } from 'mongoose'

const CashCountSchema = new Schema({
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  receiver: { type: String, default: '' },
  handoverBy: { type: String, default: '' },
  note: { type: String, default: '' },
}, { timestamps: true })

export type CashCountDoc = {
  _id: string
  date: string
  amount: number
  receiver?: string
  handoverBy?: string
  note?: string
}

export const CashCount = models.lab_CashCount || model('lab_CashCount', CashCountSchema)
