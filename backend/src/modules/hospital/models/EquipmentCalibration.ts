import { Schema, model, models } from 'mongoose'

const EquipmentCalibrationSchema = new Schema({
  equipmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Equipment', required: true },
  performedAt: { type: String, required: true }, // YYYY-MM-DD
  nextDue: { type: String }, // YYYY-MM-DD
  labName: { type: String },
  certificateNo: { type: String },
  result: { type: String }, // Pass/Fail or notes
  validFrom: { type: String },
  validTo: { type: String },
  notes: { type: String },
  cost: { type: Number },
}, { timestamps: true })

export type HospitalEquipmentCalibrationDoc = {
  _id: string
  equipmentId: string
  performedAt: string
  nextDue?: string
  labName?: string
  certificateNo?: string
  result?: string
  validFrom?: string
  validTo?: string
  notes?: string
  cost?: number
}

export const HospitalEquipmentCalibration = models.Hospital_EquipmentCalibration || model('Hospital_EquipmentCalibration', EquipmentCalibrationSchema)
