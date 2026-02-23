import { Schema, model, models } from 'mongoose'

const AppointmentSchema = new Schema({
  dateIso: { type: String, required: true, index: true }, // YYYY-MM-DD
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor', required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department', index: true },
  scheduleId: { type: Schema.Types.ObjectId, ref: 'Hospital_DoctorSchedule', index: true },
  slotNo: { type: Number },
  slotStart: { type: String }, // HH:mm
  slotEnd: { type: String },   // HH:mm
  // Patient linkage (optional). If existing patient, link by patientId/mrn. If new, store name/phone only (no MRN issuance).
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', index: true },
  mrn: { type: String },
  patientName: { type: String },
  phoneNormalized: { type: String },
  gender: { type: String },
  age: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['booked','confirmed','checked-in','cancelled','no-show'], default: 'booked', index: true },
  tokenId: { type: Schema.Types.ObjectId, ref: 'Hospital_Token' }, // reserved for future conversion to token
}, { timestamps: true })

// Prevent double booking of a slot within a schedule for active appointments
AppointmentSchema.index(
  { scheduleId: 1, slotNo: 1 },
  { unique: true, partialFilterExpression: { scheduleId: { $exists: true }, slotNo: { $exists: true }, status: { $in: ['booked','confirmed','checked-in'] } } }
)

export type HospitalAppointmentDoc = {
  _id: string
  dateIso: string
  doctorId: string
  departmentId?: string
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

export const HospitalAppointment = models.Hospital_Appointment || model('Hospital_Appointment', AppointmentSchema)
