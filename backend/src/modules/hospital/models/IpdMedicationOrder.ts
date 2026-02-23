import { Schema, model, models } from 'mongoose'

const IpdMedicationOrderSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  drugId: { type: String },
  drugName: { type: String },
  dose: { type: String },
  route: { type: String },
  frequency: { type: String },
  duration: { type: String },
  startAt: { type: Date },
  endAt: { type: Date },
  prn: { type: Boolean, default: false },
  status: { type: String, enum: ['active','stopped'], default: 'active', index: true },
  prescribedBy: { type: String },
}, { timestamps: true })

IpdMedicationOrderSchema.index({ encounterId: 1, createdAt: -1 })

export type HospitalIpdMedicationOrderDoc = {
  _id: string
  patientId: string
  encounterId: string
  drugId?: string
  drugName?: string
  dose?: string
  route?: string
  frequency?: string
  duration?: string
  startAt?: Date
  endAt?: Date
  prn?: boolean
  status: 'active'|'stopped'
  prescribedBy?: string
}

export const HospitalIpdMedicationOrder = models.Hospital_IpdMedicationOrder || model('Hospital_IpdMedicationOrder', IpdMedicationOrderSchema)
