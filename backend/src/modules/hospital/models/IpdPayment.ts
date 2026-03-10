import { Schema, model, models } from 'mongoose'

const IpdPaymentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  amount: { type: Number, required: true },
  method: { type: String },
  refNo: { type: String },
  receivedBy: { type: String },
  receivedAt: { type: Date, default: Date.now, index: true },
  notes: { type: String },
  createdByUserId: { type: String },
  createdByUsername: { type: String },
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },
}, { timestamps: true })

IpdPaymentSchema.index({ encounterId: 1, receivedAt: -1 })

export type HospitalIpdPaymentDoc = {
  _id: string
  patientId: string
  encounterId: string
  amount: number
  method?: string
  refNo?: string
  receivedBy?: string
  receivedAt: Date
  notes?: string
  createdByUserId?: string
  createdByUsername?: string
  fbrInvoiceNo?: string
  fbrQrCode?: string
  fbrStatus?: string
  fbrMode?: string
  fbrError?: string
}

export const HospitalIpdPayment = models.Hospital_IpdPayment || model('Hospital_IpdPayment', IpdPaymentSchema)
