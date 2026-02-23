import { Schema, model, models } from 'mongoose'

const ClaimSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company', required: true, index: true },
  claimNo: { type: String, index: true },
  fromDate: { type: String }, // ISO yyyy-mm-dd
  toDate: { type: String },   // ISO yyyy-mm-dd
  status: { type: String, enum: ['open','locked','exported','partially-paid','paid','rejected'], default: 'open', index: true },
  totalAmount: { type: Number, default: 0 },
  totalTransactions: { type: Number, default: 0 },
  notes: { type: String },
}, { timestamps: true })

export type CorporateClaimDoc = {
  _id: string
  companyId: string
  claimNo?: string
  fromDate?: string
  toDate?: string
  status: 'open'|'locked'|'exported'|'partially-paid'|'paid'|'rejected'
  totalAmount: number
  totalTransactions: number
  notes?: string
}

export const CorporateClaim = models.Corporate_Claim || model('Corporate_Claim', ClaimSchema)
