import { Schema, model, models } from 'mongoose'

const EquipmentPPMSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Equipment', required: true },
  performedAt: { type: String, required: true }, // YYYY-MM-DD
  nextDue: { type: String }, // YYYY-MM-DD
  doneBy: { type: String },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Vendor' },
  notes: { type: String },
  partsUsed: [{ partName: String, qty: Number, cost: Number }],
  cost: { type: Number },
}, { timestamps: true })

export type HospitalEquipmentPPMDoc = {
  _id: string
  equipmentId: string
  performedAt: string
  nextDue?: string
  doneBy?: string
  vendorId?: string
  notes?: string
  partsUsed?: Array<{ partName?: string; qty?: number; cost?: number }>
  cost?: number
}

export const HospitalEquipmentPPM = models.Hospital_EquipmentPPM || model('Hospital_EquipmentPPM', EquipmentPPMSchema)
