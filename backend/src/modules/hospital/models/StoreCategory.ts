import { Schema, model, models } from 'mongoose'

const StoreCategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type HospitalStoreCategoryDoc = {
  _id: string
  name: string
  description?: string
  active?: boolean
}

export const HospitalStoreCategory = models.Hospital_StoreCategory || model('Hospital_StoreCategory', StoreCategorySchema)
