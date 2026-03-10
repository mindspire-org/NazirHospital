import { Schema, model, models } from 'mongoose'

const ErClinicalNoteSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  type: { type: String, enum: ['consultant','nursing','progress','er-notes'], required: true, index: true },
  recordedAt: { type: Date, default: Date.now, index: true },
  createdBy: { type: String },
  createdByRole: { type: String },
  doctorName: { type: String },
  sign: { type: String },
  data: { type: Schema.Types.Mixed },
}, { timestamps: true })

ErClinicalNoteSchema.index({ encounterId: 1, type: 1, recordedAt: -1 })

export type HospitalErClinicalNoteDoc = {
  _id: string
  patientId: string
  encounterId: string
  type: 'consultant'|'nursing'|'progress'|'er-notes'
  recordedAt: Date
  createdBy?: string
  createdByRole?: string
  doctorName?: string
  sign?: string
  data?: any
}

export const HospitalErClinicalNote = models.Hospital_ErClinicalNote || model('Hospital_ErClinicalNote', ErClinicalNoteSchema)
