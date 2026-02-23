import { Schema, model, models } from 'mongoose'

const SettingsSchema = new Schema({
  pharmacyName: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  email: { type: String, default: '' },
  billingFooter: { type: String, default: '' },
  logoDataUrl: { type: String, default: '' },
}, { timestamps: true, collection: 'aesthetic_settings' })

export type SettingsDoc = {
  _id: string
  pharmacyName: string
  phone: string
  address: string
  email: string
  billingFooter: string
  logoDataUrl?: string
}

export const Settings = models.Aesthetic_Settings || model('Aesthetic_Settings', SettingsSchema)
