import { Schema, model, models } from 'mongoose'

const IpdBillingItemSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  type: { type: String, enum: ['bed','procedure','medication','service'], required: true, index: true },
  description: { type: String, required: true },
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now, index: true },
  refId: { type: String },
  billedBy: { type: String },
}, { timestamps: true })

IpdBillingItemSchema.index({ encounterId: 1, date: -1 })

export type HospitalIpdBillingItemDoc = {
  _id: string
  patientId: string
  encounterId: string
  type: 'bed'|'procedure'|'medication'|'service'
  description: string
  qty: number
  unitPrice: number
  amount: number
  date: Date
  refId?: string
  billedBy?: string
}

export const HospitalIpdBillingItem = models.Hospital_IpdBillingItem || model('Hospital_IpdBillingItem', IpdBillingItemSchema)
