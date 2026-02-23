import { Schema, model, models } from 'mongoose'

const EquipmentCondemnationSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Equipment', required: true },
  proposedAt: { type: String }, // YYYY-MM-DD
  reason: { type: String },
  approvedBy: { type: String },
  approvedAt: { type: String }, // YYYY-MM-DD
  status: { type: String, enum: ['Proposed','Approved','Disposed'], default: 'Proposed' },
  disposalMethod: { type: String },
  disposalDate: { type: String }, // YYYY-MM-DD
  notes: { type: String },
}, { timestamps: true })

export type HospitalEquipmentCondemnationDoc = {
  _id: string
  equipmentId: string
  proposedAt?: string
  reason?: string
  approvedBy?: string
  approvedAt?: string
  status?: 'Proposed'|'Approved'|'Disposed'
  disposalMethod?: string
  disposalDate?: string
  notes?: string
}

export const HospitalEquipmentCondemnation = models.Hospital_EquipmentCondemnation || model('Hospital_EquipmentCondemnation', EquipmentCondemnationSchema)
