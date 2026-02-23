import { Schema, model, models } from 'mongoose'

const VendorSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
}, { timestamps: true })

export type VendorDoc = {
  _id: string
  name: string
  phone?: string
  address?: string
}

export const Vendor = models.Hospital_Vendor || model('Hospital_Vendor', VendorSchema)
