import { Schema, model, models } from 'mongoose'

const IpdMedicationAdminSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Hospital_IpdMedicationOrder', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  givenAt: { type: Date, default: Date.now, index: true },
  doseGiven: { type: String },
  byUser: { type: String },
  status: { type: String, enum: ['given','missed','held'], default: 'given' },
  remarks: { type: String },
}, { timestamps: true })

IpdMedicationAdminSchema.index({ orderId: 1, givenAt: -1 })

export type HospitalIpdMedicationAdminDoc = {
  _id: string
  orderId: string
  patientId: string
  encounterId: string
  givenAt: Date
  doseGiven?: string
  byUser?: string
  status: 'given'|'missed'|'held'
  remarks?: string
}

export const HospitalIpdMedicationAdmin = models.Hospital_IpdMedicationAdmin || model('Hospital_IpdMedicationAdmin', IpdMedicationAdminSchema)
