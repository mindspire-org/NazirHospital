import { Schema, model, models } from 'mongoose'

const AttendanceSchema = new Schema({
  staffId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // yyyy-mm-dd
  shiftId: { type: String },
  status: { type: String, enum: ['present','absent','leave'], required: true },
  clockIn: { type: String },
  clockOut: { type: String },
  notes: { type: String },
}, { timestamps: true })

AttendanceSchema.index({ staffId: 1, date: 1, shiftId: 1 }, { unique: true, sparse: true })

export type AttendanceDoc = {
  _id: string
  staffId: string
  date: string
  shiftId?: string
  status: 'present'|'absent'|'leave'
  clockIn?: string
  clockOut?: string
  notes?: string
}

export const Attendance = models.Pharmacy_Attendance || model('Pharmacy_Attendance', AttendanceSchema)
