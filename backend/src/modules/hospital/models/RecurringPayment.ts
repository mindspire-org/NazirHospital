import { Schema, model, models } from 'mongoose'

const RecurringPaymentSchema = new Schema({
  name: { type: String, required: true },
  memo: { type: String },
  amount: { type: Number, required: true, min: 0 },
  accountDebit: { type: String, required: true },
  accountCredit: { type: String, required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Vendor' },
  frequency: { type: String, enum: ['daily','weekly','monthly'], default: 'monthly' },
  startDate: { type: String, required: true },
  endDate: { type: String },
  nextRun: { type: String, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type RecurringPaymentDoc = {
  _id: string
  name: string
  memo?: string
  amount: number
  accountDebit: string
  accountCredit: string
  vendorId?: string
  frequency: 'daily'|'weekly'|'monthly'
  startDate: string
  endDate?: string
  nextRun: string
  active: boolean
}

export const RecurringPayment = models.Hospital_RecurringPayment || model('Hospital_RecurringPayment', RecurringPaymentSchema)
