import { Schema, model, models } from 'mongoose'

const IpdLabLinkSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  encounterId: { type: Schema.Types.ObjectId, ref: 'Hospital_Encounter', required: true, index: true },
  externalLabOrderId: { type: String },
  testIds: [{ type: String }],
  status: { type: String },
}, { timestamps: true })

IpdLabLinkSchema.index({ encounterId: 1, createdAt: -1 })

export type HospitalIpdLabLinkDoc = {
  _id: string
  patientId: string
  encounterId: string
  externalLabOrderId?: string
  testIds?: string[]
  status?: string
}

export const HospitalIpdLabLink = models.Hospital_IpdLabLink || model('Hospital_IpdLabLink', IpdLabLinkSchema)
