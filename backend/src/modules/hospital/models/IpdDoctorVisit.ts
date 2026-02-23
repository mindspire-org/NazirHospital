import { Schema, model, models } from 'mongoose'

const IpdDoctorVisitSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Doctor' },
  when: { type: Date, default: Date.now, index: true },
  category: { type: String, enum: ['visit','progress'], default: 'visit', index: true },
  subjective: { type: String },
  objective: { type: String },
  assessment: { type: String },
  plan: { type: String },
  diagnosisCodes: [{ type: String }],
  nextReviewAt: { type: Date },
  done: { type: Boolean, default: false },
}, { timestamps: true })

IpdDoctorVisitSchema.index({ encounterId: 1, when: -1 })

export type HospitalIpdDoctorVisitDoc = {
  _id: string
  patientId: string
  encounterId: string
  doctorId?: string
  when: Date
  category?: 'visit'|'progress'
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
  diagnosisCodes?: string[]
  nextReviewAt?: Date
}

export const HospitalIpdDoctorVisit = models.Hospital_IpdDoctorVisit || model('Hospital_IpdDoctorVisit', IpdDoctorVisitSchema)
