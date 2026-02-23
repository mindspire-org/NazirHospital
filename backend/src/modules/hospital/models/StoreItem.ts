import { Schema, model, models } from 'mongoose'

const StoreItemSchema = new Schema({
  code: { type: String },
  name: { type: String, required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreCategory' },
  unitId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreUnit' },
  reorderLevel: { type: Number, min: 0 },
  minStock: { type: Number, min: 0 },
  maxStock: { type: Number, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

StoreItemSchema.index({ name: 1 }, { unique: true })
StoreItemSchema.index({ code: 1 }, { unique: true, sparse: true })

export type HospitalStoreItemDoc = {
  _id: string
  code?: string
  name: string
  categoryId?: string
  unitId?: string
  reorderLevel?: number
  minStock?: number
  maxStock?: number
  active?: boolean
}

export const HospitalStoreItem = models.Hospital_StoreItem || model('Hospital_StoreItem', StoreItemSchema)
