import { Schema, model, models } from 'mongoose'

const IpdClinicalNoteSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  type: { type: String, enum: ['preop','operation','postop','consultant','anes-pre','anes-intra','anes-recovery','anes-post-recovery','anes-adverse'], required: true, index: true },
  recordedAt: { type: Date, default: Date.now, index: true },
  createdBy: { type: String },
  createdByRole: { type: String },
  doctorName: { type: String },
  sign: { type: String },
  data: { type: Schema.Types.Mixed },
}, { timestamps: true })

IpdClinicalNoteSchema.index({ encounterId: 1, type: 1, recordedAt: -1 })

export type HospitalIpdClinicalNoteDoc = {
  _id: string
  patientId: string
  encounterId: string
  type: 'preop'|'operation'|'postop'|'consultant'|'anes-pre'|'anes-intra'|'anes-recovery'|'anes-post-recovery'|'anes-adverse'
  recordedAt: Date
  createdBy?: string
  createdByRole?: string
  doctorName?: string
  sign?: string
  data?: any
}

export const HospitalIpdClinicalNote = models.Hospital_IpdClinicalNote || model('Hospital_IpdClinicalNote', IpdClinicalNoteSchema)
