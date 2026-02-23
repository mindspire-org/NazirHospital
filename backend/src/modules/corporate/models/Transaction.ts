import { Schema, model, models } from 'mongoose'

const CorporateTransactionSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company', required: true, index: true },
  patientMrn: { type: String, index: true },
  patientName: { type: String },
  serviceType: { type: String, enum: ['OPD','LAB','DIAG','IPD'], required: true, index: true },
  refType: { type: String, enum: ['opd_token','lab_order','diag_order','ipd_billing_item'], required: true },
  refId: { type: String, required: true, index: true },
  itemRef: { type: String },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', index: true },
  dateIso: { type: String, index: true },
  departmentId: { type: String },
  doctorId: { type: String },
  description: { type: String },
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 }, // standard/list price
  corpUnitPrice: { type: Number, default: 0 },
  coPay: { type: Number, default: 0 },
  netToCorporate: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  corpRuleId: { type: String },
  status: { type: String, enum: ['accrued','claimed','paid','reversed','rejected'], default: 'accrued', index: true },
  claimId: { type: String },
  reversalOf: { type: String },
}, { timestamps: true })

export type CorporateTransactionDoc = {
  _id: string
  companyId: string
  patientMrn?: string
  patientName?: string
  serviceType: 'OPD'|'LAB'|'DIAG'|'IPD'
  refType: 'opd_token'|'lab_order'|'diag_order'|'ipd_billing_item'
  refId: string
  itemRef?: string
  encounterId?: string
  dateIso?: string
  departmentId?: string
  doctorId?: string
  description?: string
  qty?: number
  unitPrice?: number
  corpUnitPrice?: number
  coPay?: number
  netToCorporate?: number
  paidAmount?: number
  corpRuleId?: string
  status: 'accrued'|'claimed'|'paid'|'reversed'|'rejected'
  claimId?: string
  reversalOf?: string
}

export const CorporateTransaction = models.Corporate_Transaction || model('Corporate_Transaction', CorporateTransactionSchema)
