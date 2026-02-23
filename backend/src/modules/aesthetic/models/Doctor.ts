import { Schema, model, models } from 'mongoose'

const DoctorSchema = new Schema({
  name: { type: String, required: true, index: true },
  specialty: { type: String },
  qualification: { type: String },
  phone: { type: String },
  fee: { type: Number, default: 0 },
  shares: { type: Number, default: 100 },
  active: { type: Boolean, default: true },
  createdAtIso: { type: String, default: () => new Date().toISOString() },
}, { timestamps: true, collection: 'aesthetic_doctors' })

export type AestheticDoctorDoc = {
  _id: string
  name: string
  specialty?: string
  qualification?: string
  phone?: string
  fee?: number
  shares?: number
  active?: boolean
  createdAtIso?: string
}

export const AestheticDoctor = models.Aesthetic_Doctor || model('Aesthetic_Doctor', DoctorSchema)
