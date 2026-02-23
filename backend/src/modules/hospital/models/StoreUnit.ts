import { Schema, model, models } from 'mongoose'

const StoreUnitSchema = new Schema({
  name: { type: String, required: true, unique: true },
  abbr: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type HospitalStoreUnitDoc = {
  _id: string
  name: string
  abbr?: string
  active?: boolean
}

export const HospitalStoreUnit = models.Hospital_StoreUnit || model('Hospital_StoreUnit', StoreUnitSchema)
