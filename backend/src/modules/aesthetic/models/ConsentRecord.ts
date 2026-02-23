import { Schema, model, models } from 'mongoose'

const ConsentRecordSchema = new Schema({
  templateId: { type: String, required: true },
  templateName: { type: String },
  templateVersion: { type: Number },
  patientMrn: { type: String },
  labPatientId: { type: String },
  patientName: { type: String },
  answers: { type: Schema.Types.Mixed, default: {} },
  signatureDataUrl: { type: String },
  attachments: { type: [String], default: [] },
  signedAt: { type: String, required: true }, // ISO
  actor: { type: String },
  createdAtIso: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true, collection: 'aesthetic_consents' })

export type ConsentRecordDoc = {
  _id: string
  templateId: string
  templateName?: string
  templateVersion?: number
  patientMrn?: string
  labPatientId?: string
  patientName?: string
  answers?: any
  signatureDataUrl?: string
  attachments?: string[]
  signedAt: string
  actor?: string
  createdAtIso?: string
}

export const ConsentRecord = models.Aesthetic_ConsentRecord || model('Aesthetic_ConsentRecord', ConsentRecordSchema)
