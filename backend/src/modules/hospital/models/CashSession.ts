import { Schema, model, models } from 'mongoose'

const CashSessionSchema = new Schema({
  dateIso: { type: String, index: true },
  status: { type: String, enum: ['open','closed'], default: 'open', index: true },
  userId: { type: String, index: true },
  userName: { type: String },
  counterId: { type: String },
  shiftId: { type: String },
  shiftName: { type: String },
  openingFloat: { type: Number, default: 0 },
  countedCash: { type: Number },
  cashIn: { type: Number, default: 0 },
  cashOut: { type: Number, default: 0 },
  netCash: { type: Number, default: 0 },
  expectedClosing: { type: Number, default: 0 },
  overShort: { type: Number, default: 0 },
  startAt: { type: Date, default: () => new Date() },
  endAt: { type: Date },
  note: { type: String },
}, { timestamps: true })

export type HospitalCashSessionDoc = {
  _id: string
  dateIso: string
  status: 'open'|'closed'
  userId?: string
  userName?: string
  counterId?: string
  shiftId?: string
  shiftName?: string
  openingFloat: number
  countedCash?: number
  cashIn: number
  cashOut: number
  netCash: number
  expectedClosing: number
  overShort: number
  startAt: string
  endAt?: string
  note?: string
}

export const HospitalCashSession = models.Hospital_CashSession || model('Hospital_CashSession', CashSessionSchema)
