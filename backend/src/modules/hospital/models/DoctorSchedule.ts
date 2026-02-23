import { Schema, model, models } from 'mongoose'

const DoctorScheduleSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor', required: true, index: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department', index: true },
  dateIso: { type: String, required: true, index: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:mm (24h)
  endTime: { type: String, required: true },   // HH:mm (24h)
  slotMinutes: { type: Number, default: 15 },
  fee: { type: Number },
  followupFee: { type: Number },
  notes: { type: String },
}, { timestamps: true })

DoctorScheduleSchema.index({ doctorId: 1, dateIso: 1, startTime: 1, endTime: 1 }, { unique: true })

export type HospitalDoctorScheduleDoc = {
  _id: string
  doctorId: string
  departmentId?: string
  dateIso: string
  startTime: string
  endTime: string
  slotMinutes: number
  fee?: number
  followupFee?: number
  notes?: string
}

export const HospitalDoctorSchedule = models.Hospital_DoctorSchedule || model('Hospital_DoctorSchedule', DoctorScheduleSchema)
