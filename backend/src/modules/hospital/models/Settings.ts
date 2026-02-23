import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
  code: { type: String, default: '' },
  slipFooter: { type: String, default: '' },
}, { timestamps: true })

export type HospitalSettingsDoc = {
  _id: string
  name: string
  phone: string
  address: string
  logoDataUrl?: string
  code?: string
  slipFooter?: string
}

export const HospitalSettings = models.Hospital_Settings || model('Hospital_Settings', SettingsSchema)
