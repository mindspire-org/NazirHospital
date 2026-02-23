import { Schema, model, models } from 'mongoose'

const IpdVitalSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  recordedAt: { type: Date, default: Date.now, index: true },
  bp: { type: String },
  hr: { type: Number },
  rr: { type: Number },
  temp: { type: Number },
  spo2: { type: Number },
  height: { type: Number },
  weight: { type: Number },
  painScale: { type: Number },
  recordedBy: { type: String },
  note: { type: String },
  // Daily Monitoring Chart fields
  shift: { type: String, enum: ['morning','evening','night'], lowercase: true },
  bsr: { type: Number },
  intakeIV: { type: String },
  urine: { type: String },
  nurseSign: { type: String },
}, { timestamps: true })

IpdVitalSchema.index({ encounterId: 1, recordedAt: -1 })

export type HospitalIpdVitalDoc = {
  _id: string
  patientId: string
  encounterId: string
  recordedAt: Date
  bp?: string
  hr?: number
  rr?: number
  temp?: number
  spo2?: number
  height?: number
  weight?: number
  painScale?: number
  recordedBy?: string
  note?: string
  shift?: 'morning'|'evening'|'night'
  bsr?: number
  intakeIV?: string
  urine?: string
  nurseSign?: string
}

export const HospitalIpdVital = models.Hospital_IpdVital || model('Hospital_IpdVital', IpdVitalSchema)
