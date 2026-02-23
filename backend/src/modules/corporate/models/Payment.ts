import { Schema, model, models } from 'mongoose'

const AllocationSchema = new Schema({
  transactionId: { type: Schema.Types.ObjectId, ref: 'Corporate_Transaction', required: true },
  amount: { type: Number, required: true },
}, { _id: false })

const PaymentSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company', required: true, index: true },
  dateIso: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  refNo: { type: String },
  notes: { type: String },
  allocations: { type: [AllocationSchema], default: [] },
  unallocated: { type: Number, default: 0 },
}, { timestamps: true })

export type CorporatePaymentDoc = {
  _id: string
  companyId: string
  dateIso: string
  amount: number
  refNo?: string
  notes?: string
  allocations: Array<{ transactionId: string; amount: number }>
  unallocated: number
}

export const CorporatePayment = models.Corporate_Payment || model('Corporate_Payment', PaymentSchema)
