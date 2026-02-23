import { Schema, model, models } from 'mongoose'

const AppointmentSchema = new Schema({
  dateIso: { type: String, required: true, index: true }, // YYYY-MM-DD
  time: { type: String }, // HH:mm
  // tests selected at appointment time
  tests: [{ type: Schema.Types.ObjectId, ref: 'Lab_Test' }],
  // Patient linkage (optional). If existing patient found, link by patientId; otherwise store name/phone only (no MRN issuance here).
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', index: true },
  mrn: { type: String },
  patientName: { type: String },
  phoneNormalized: { type: String },
  gender: { type: String },
  age: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['booked','confirmed','cancelled','converted'], default: 'booked', index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Lab_Order' },
}, { timestamps: true })

AppointmentSchema.index({ dateIso: 1, time: 1 })

export type LabAppointmentDoc = {
  _id: string
  dateIso: string
  time?: string
  tests?: string[]
  patientId?: string
  mrn?: string
  patientName?: string
  phoneNormalized?: string
  gender?: string
  age?: string
  notes?: string
  status: 'booked'|'confirmed'|'cancelled'|'converted'
  orderId?: string
}

export const LabAppointment = models.Lab_Appointment || model('Lab_Appointment', AppointmentSchema)
