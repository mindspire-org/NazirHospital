import { Schema, model, models } from 'mongoose'

const ReferralSchema = new Schema({
  type: { type: String, enum: ['lab', 'pharmacy', 'diagnostic'], required: true, index: true },
  status: { type: String, enum: ['pending','completed','cancelled'], default: 'pending', index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor', required: true, index: true },
  prescriptionId: { type: Schema.Types.ObjectId, ref: 'Hospital_Prescription' },
  tests: [{ type: String }],
  notes: { type: String },
}, { timestamps: true })

ReferralSchema.index({ type: 1, status: 1, createdAt: -1 })
ReferralSchema.index({ doctorId: 1, createdAt: -1 })

export type HospitalReferralDoc = {
  _id: string
  type: 'lab'|'pharmacy'|'diagnostic'
  status: 'pending'|'completed'|'cancelled'
  patientId: string
  encounterId: string
  doctorId: string
  prescriptionId?: string
  tests?: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export const HospitalReferral = models.Hospital_Referral || model('Hospital_Referral', ReferralSchema)
