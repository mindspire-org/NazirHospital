import { Schema, model, models } from 'mongoose'

const CashMovementSchema = new Schema({
  date: { type: String, required: true },
  type: { type: String, enum: ['IN','OUT'], required: true },
  category: { type: String, default: '-' },
  amount: { type: Number, required: true },
  receiver: { type: String, default: '' },
  handoverBy: { type: String, default: '' },
  note: { type: String, default: '' },
}, { timestamps: true })

export type CashMovementDoc = {
  _id: string
  date: string
  type: 'IN'|'OUT'
  category?: string
  amount: number
  receiver?: string
  handoverBy?: string
  note?: string
}

export const CashMovement = models.lab_CashMovement || model('lab_CashMovement', CashMovementSchema)
