import { Schema, model, models } from 'mongoose'

const TokenSchema = new Schema({
  dateIso: { type: String, index: true },
  tokenNo: { type: String, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', index: true },
  mrn: { type: String },
  patientName: { type: String },
  createdByUserId: { type: Schema.Types.ObjectId, ref: 'Hospital_User', index: true },
  createdByUsername: { type: String, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter' },
  corporateId: { type: Schema.Types.ObjectId, ref: 'Corporate_Company' },
  paidMethod: { type: String, enum: ['Cash','Bank','AR'], default: 'Cash', index: true },
  fee: { type: Number },
  discount: { type: Number, default: 0 },
  status: { type: String, enum: ['queued','in-progress','completed','returned','cancelled'], default: 'queued', index: true },
  // Scheduling fields (optional)
  scheduleId: { type: Schema.Types.ObjectId, ref: 'Hospital_DoctorSchedule', index: true },
  slotNo: { type: Number },
  slotStart: { type: String }, // HH:mm
  slotEnd: { type: String },   // HH:mm
  // FBR fields (optional)
  fbrInvoiceNo: { type: String },
  fbrQrCode: { type: String },
  fbrStatus: { type: String },
  fbrMode: { type: String },
  fbrError: { type: String },
}, { timestamps: true })

export type HospitalTokenDoc = {
  _id: string
  dateIso: string
  tokenNo: string
  patientId?: string
  mrn?: string
  patientName?: string
  createdByUserId?: string
  createdByUsername?: string
  departmentId: string
  doctorId?: string
  encounterId?: string
  corporateId?: string
  paidMethod?: 'Cash'|'Bank'|'AR'
  fee?: number
  discount?: number
  status: 'queued'|'in-progress'|'completed'|'returned'|'cancelled'
  scheduleId?: string
  slotNo?: number
  slotStart?: string
  slotEnd?: string
}

export const HospitalToken = models.Hospital_Token || model('Hospital_Token', TokenSchema)
