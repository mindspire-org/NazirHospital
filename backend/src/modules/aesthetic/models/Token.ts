import { Schema, model, models } from 'mongoose'

const TokenSchema = new Schema({
  number: { type: Number, required: true },
  date: { type: String, required: true },

  patientName: { type: String },
  phone: { type: String },
  mrNumber: { type: String },
  age: { type: String },
  gender: { type: String },
  address: { type: String },
  guardianRelation: { type: String },
  guardianName: { type: String },
  cnic: { type: String },

  doctorId: { type: String },
  apptDate: { type: String },

  // Optional linkage when a token originates from an appointment schedule slot
  scheduleId: { type: String },
  slotNo: { type: Number },

  fee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  payable: { type: Number, default: 0 },

  // Optional linkage to a procedure session and breakdown for slips
  procedureSessionId: { type: String },
  procedurePrice: { type: Number },
  procedureDiscount: { type: Number },
  procedurePaidToday: { type: Number },
  procedurePaidToDate: { type: Number },
  procedureBalanceAfter: { type: Number },

  status: { type: String, default: 'queued' }, // queued|in-progress|completed|returned|cancelled

  // FBR fiscalization fields (optional)
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },

  createdAtIso: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true, collection: 'aesthetic_tokens' })

export type AestheticTokenDoc = {
  _id: string
  number: number
  date: string
  patientName?: string
  phone?: string
  mrNumber?: string
  age?: string
  gender?: string
  address?: string
  guardianRelation?: string
  guardianName?: string
  cnic?: string
  doctorId?: string
  apptDate?: string
  scheduleId?: string
  slotNo?: number
  fee?: number
  discount?: number
  payable?: number
  procedureSessionId?: string
  procedurePrice?: number
  procedureDiscount?: number
  procedurePaidToday?: number
  procedurePaidToDate?: number
  procedureBalanceAfter?: number
  status?: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
  createdAtIso?: string

  fbrInvoiceNo?: string
  fbrQrCode?: string
  fbrStatus?: string
  fbrMode?: string
  fbrError?: string
}

export const AestheticToken = models.Aesthetic_Token || model('Aesthetic_Token', TokenSchema)
