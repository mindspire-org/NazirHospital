import { Schema, model, models } from 'mongoose'

const ErPaymentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  amount: { type: Number, required: true },
  method: { type: String },
  refNo: { type: String },
  receivedBy: { type: String },
  createdByUserId: { type: Schema.Types.ObjectId, ref: 'Hospital_User', index: true },
  createdByUsername: { type: String, index: true },
  receivedAt: { type: Date, default: Date.now, index: true },
  notes: { type: String },
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },
}, { timestamps: true })

ErPaymentSchema.index({ encounterId: 1, receivedAt: -1 })

export type HospitalErPaymentDoc = {
  _id: string
  patientId: string
  encounterId: string
  amount: number
  method?: string
  refNo?: string
  receivedBy?: string
  createdByUserId?: string
  createdByUsername?: string
  receivedAt: Date
  notes?: string
  fbrInvoiceNo?: string
  fbrQrCode?: string
  fbrStatus?: string
  fbrMode?: string
  fbrError?: string
}

export const HospitalErPayment = models.Hospital_ErPayment || model('Hospital_ErPayment', ErPaymentSchema)
