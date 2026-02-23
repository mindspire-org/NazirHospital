import { Schema, model, models } from 'mongoose'

const StoreLocationSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type HospitalStoreLocationDoc = {
  _id: string
  name: string
  description?: string
  active?: boolean
}

export const HospitalStoreLocation = models.Hospital_StoreLocation || model('Hospital_StoreLocation', StoreLocationSchema)
