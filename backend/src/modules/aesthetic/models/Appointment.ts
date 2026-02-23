import { Schema, model, models } from 'mongoose'

const AppointmentSchema = new Schema({
  dateIso: { type: String, required: true, index: true }, // YYYY-MM-DD
  doctorId: { type: Schema.Types.ObjectId, ref: 'Aesthetic_Doctor', required: true, index: true },
  scheduleId: { type: Schema.Types.ObjectId, ref: 'Aesthetic_DoctorSchedule', index: true },
  slotNo: { type: Number },
  slotStart: { type: String }, // HH:mm
  slotEnd: { type: String },   // HH:mm

  // Patient linkage (optional). Reuse LabPatient across modules.
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', index: true },
  mrn: { type: String },
  patientName: { type: String },
  phoneNormalized: { type: String },
  gender: { type: String },
  age: { type: String },
  notes: { type: String },

  status: { type: String, enum: ['booked','confirmed','checked-in','cancelled','no-show'], default: 'booked', index: true },
  tokenId: { type: Schema.Types.ObjectId, ref: 'Aesthetic_Token' },
}, { timestamps: true, collection: 'aesthetic_appointments' })

AppointmentSchema.index(
  { scheduleId: 1, slotNo: 1 },
  { unique: true, partialFilterExpression: { scheduleId: { $exists: true }, slotNo: { $exists: true }, status: { $in: ['booked','confirmed','checked-in'] } } }
)

export type AestheticAppointmentDoc = {
  _id: string
  dateIso: string
  doctorId: string
  scheduleId?: string
  slotNo?: number
  slotStart?: string
  slotEnd?: string
  patientId?: string
  mrn?: string
  patientName?: string
  phoneNormalized?: string
  gender?: string
  age?: string
  notes?: string
  status: 'booked'|'confirmed'|'checked-in'|'cancelled'|'no-show'
  tokenId?: string
}

export const AestheticAppointment = models.Aesthetic_Appointment || model('Aesthetic_Appointment', AppointmentSchema)
