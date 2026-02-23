import { Schema, model, models } from 'mongoose'

const BiometricMappingSchema = new Schema({
  deviceId: { type: String, required: true, index: true },
  enrollId: { type: String, required: true, index: true },
  staffId: { type: String, required: true, index: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

BiometricMappingSchema.index({ deviceId: 1, enrollId: 1 }, { unique: true })

export type BiometricMappingDoc = {
  _id: string
  deviceId: string
  enrollId: string
  staffId: string
  active: boolean
}

export const BiometricMapping = models.Biometric_Mapping || model('Biometric_Mapping', BiometricMappingSchema)
