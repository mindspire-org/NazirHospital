import { Schema, model, models } from 'mongoose'

const ErServiceSchema = new Schema({
  name: { type: String, required: true, index: true },
  category: { type: String },
  price: { type: Number, default: 0 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true })

ErServiceSchema.index({ name: 1 }, { unique: true })

export type HospitalErServiceDoc = {
  _id: string
  name: string
  category?: string
  price: number
  active: boolean
}

export const HospitalErService = models.Hospital_ErService || model('Hospital_ErService', ErServiceSchema)
