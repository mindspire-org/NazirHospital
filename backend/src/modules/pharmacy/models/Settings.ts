import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  pharmacyName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  billingFooter: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
}, { timestamps: true })

export type SettingsDoc = {
  _id: string
  pharmacyName: string
  phone: string
  address: string
  email: string
  billingFooter: string
  logoDataUrl?: string
}

export const Settings = models.Pharmacy_Settings || model('Pharmacy_Settings', SettingsSchema)
