import { Schema, model, models } from 'mongoose'

const BiometricSyncStateSchema = new Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  lastTimestamp: { type: Date },
  lastSuccessAt: { type: Date },
  lastErrorAt: { type: Date },
  lastError: { type: String },
}, { timestamps: true })

export type BiometricSyncStateDoc = {
  _id: string
  deviceId: string
  lastTimestamp?: Date
  lastSuccessAt?: Date
  lastErrorAt?: Date
  lastError?: string
}

export const BiometricSyncState = models.Biometric_SyncState || model('Biometric_SyncState', BiometricSyncStateSchema)
