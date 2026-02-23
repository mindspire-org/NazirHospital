import { Schema, model, models } from 'mongoose'

const DoctorScheduleSchema = new Schema({
  doctorId: { type: Schema.Types.ObjectId, ref: 'Aesthetic_Doctor', required: true, index: true },
  dateIso: { type: String, required: true, index: true }, // YYYY-MM-DD
  startTime: { type: String, required: true }, // HH:mm
  endTime: { type: String, required: true },   // HH:mm
  slotMinutes: { type: Number, default: 15 },
  fee: { type: Number },
  followupFee: { type: Number },
  notes: { type: String },
}, { timestamps: true, collection: 'aesthetic_doctor_schedules' })

DoctorScheduleSchema.index({ doctorId: 1, dateIso: 1, startTime: 1, endTime: 1 }, { unique: true })

export type AestheticDoctorScheduleDoc = {
  _id: string
  doctorId: string
  dateIso: string
  startTime: string
  endTime: string
  slotMinutes: number
  fee?: number
  followupFee?: number
  notes?: string
}

export const AestheticDoctorSchedule = models.Aesthetic_DoctorSchedule || model('Aesthetic_DoctorSchedule', DoctorScheduleSchema)
