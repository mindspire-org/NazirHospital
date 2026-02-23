import { Schema, model, models } from 'mongoose'

const EquipmentBreakdownSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Equipment', required: true },
  reportedAt: { type: String, required: true }, // YYYY-MM-DD
  restoredAt: { type: String }, // YYYY-MM-DD
  description: { type: String },
  rootCause: { type: String },
  correctiveAction: { type: String },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Vendor' },
  severity: { type: String, enum: ['low','medium','high'], default: 'medium' },
  status: { type: String, enum: ['Open','Closed'], default: 'Open' },
  cost: { type: Number },
}, { timestamps: true })

export type HospitalEquipmentBreakdownDoc = {
  _id: string
  equipmentId: string
  reportedAt: string
  restoredAt?: string
  description?: string
  rootCause?: string
  correctiveAction?: string
  vendorId?: string
  severity?: 'low'|'medium'|'high'
  status?: 'Open'|'Closed'
  cost?: number
}

export const HospitalEquipmentBreakdown = models.Hospital_EquipmentBreakdown || model('Hospital_EquipmentBreakdown', EquipmentBreakdownSchema)
