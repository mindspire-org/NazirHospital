import { Schema, model, models } from 'mongoose'

const EquipmentSchema = new Schema({
  code: { type: String },
  name: { type: String, required: true },
  category: { type: String },
  make: { type: String },
  model: { type: String },
  serialNo: { type: String },
  purchaseDate: { type: String }, // YYYY-MM-DD
  cost: { type: Number },
  vendorId: { type: Schema.Types.ObjectId, ref: 'Hospital_Vendor' },
  locationDepartmentId: { type: Schema.Types.ObjectId, ref: 'Hospital_Department' },
  custodian: { type: String },
  installDate: { type: String }, // YYYY-MM-DD
  warrantyStart: { type: String },
  warrantyEnd: { type: String },
  amcStart: { type: String },
  amcEnd: { type: String },
  requiresCalibration: { type: Boolean, default: false },
  calibFrequencyMonths: { type: Number },
  ppmFrequencyMonths: { type: Number },
  criticality: { type: String, enum: ['critical','high','medium','low'], default: 'medium' },
  status: { type: String, enum: ['Working','UnderMaintenance','NotWorking','Condemned','Spare'], default: 'Working' },
  nextPpmDue: { type: String }, // YYYY-MM-DD
  nextCalibDue: { type: String }, // YYYY-MM-DD
  lastPpmDoneAt: { type: String }, // YYYY-MM-DD
  lastCalibDoneAt: { type: String }, // YYYY-MM-DD
}, { timestamps: true })

export type HospitalEquipmentDoc = {
  _id: string
  code?: string
  name: string
  category?: string
  make?: string
  model?: string
  serialNo?: string
  purchaseDate?: string
  cost?: number
  vendorId?: string
  locationDepartmentId?: string
  custodian?: string
  installDate?: string
  warrantyStart?: string
  warrantyEnd?: string
  amcStart?: string
  amcEnd?: string
  requiresCalibration?: boolean
  calibFrequencyMonths?: number
  ppmFrequencyMonths?: number
  criticality?: 'critical'|'high'|'medium'|'low'
  status: 'Working'|'UnderMaintenance'|'NotWorking'|'Condemned'|'Spare'
  nextPpmDue?: string
  nextCalibDue?: string
  lastPpmDoneAt?: string
  lastCalibDoneAt?: string
}

export const HospitalEquipment = models.Hospital_Equipment || model('Hospital_Equipment', EquipmentSchema)
